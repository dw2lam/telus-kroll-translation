import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/** One sheet that comes out of the printer, drawn by the label layout code. */
export interface SceneLabel {
  id: string
  widthIn: number
  heightIn: number
  /** The printed panel as a PNG data URL. */
  image: string
  /** 0 sits on the vial; 1 is laminated over it (panel 1 over panel 2). */
  layer: number
}

export type PrintPhase = 'idle' | 'printing' | 'applying' | 'done'

interface Props {
  labels: SceneLabel[]
  /** Change it to replay the run from the start. */
  runKey: number
  /** Called whenever the visible phase changes. */
  onPhase?: (phase: PrintPhase, labelIndex: number) => void
  /** Called once the bottle is fully labelled. */
  onDone?: () => void
  paused?: boolean
  /** 0 = panel 1 flat on the vial, 1 = peeled back to show the panel under it. */
  peel?: number
}

// World units are inches, so the label sheet and the vial share one scale.
const BOTTLE_RADIUS = 1.02
const BOTTLE_HEIGHT = 3.7
const BOTTLE_POS = new THREE.Vector3(2.6, 0, 0.7)
const PRINTER_POS = new THREE.Vector3(-2.3, 0, -0.4)
const PRINTER_YAW = 0.42
const PRINTER = { width: 3.6, depth: 4.2, height: 2.3 }
const SLOT = new THREE.Vector3(0, 1.02, PRINTER.depth / 2 + 0.01)

// Seconds per step, per label.
const FEED = 2.4
const HOLD = 0.35
const LIFT = 1.1
const WRAP = 1.0
const TURN = 1.1
const PER_LABEL = FEED + HOLD + LIFT + WRAP + TURN

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

/** Every panel goes on the front of the vial at the same height; panel 1 laminates over panel 2. */
function placement(label: SceneLabel): { height: number; radius: number } {
  return { height: BOTTLE_HEIGHT * 0.43, radius: BOTTLE_RADIUS + 0.012 + label.layer * 0.012 }
}

function useLabelTexture(label: SceneLabel): THREE.Texture {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(label.image)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [label.image])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

/**
 * Bends a flat strip round a cylinder of `radius` (0 flat, 1 fully wrapped), then
 * peels `peel` of it back from its left-hand edge (the side facing the camera), curling away from the vial.
 */
function bend(geometry: THREE.PlaneGeometry, flat: Float32Array, amount: number, radius: number, peel = 0): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute
  const k = amount / radius
  const { width, widthSegments } = geometry.parameters
  const columns = widthSegments + 1
  const rows = pos.count / columns
  const start = width / 2 - peel * width * 0.72
  const along = (u: number): [number, number] => (k < 1e-5 ? [u, 0] : [Math.sin(u * k) / k, (Math.cos(u * k) - 1) / k])
  // The flap leaves the vial along its tangent at the peel line, lifted outward and curling.
  const [px, pz] = along(start)
  const a = start * k
  const tangent: [number, number] = [Math.cos(a), -Math.sin(a)]
  const normal: [number, number] = [Math.sin(a), Math.cos(a)]
  const lift = peel * 1.35
  const curl = peel * 0.9
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const i = r * columns + c
      // Mirrored so the flap lifts from the left edge; `along` is odd in x and even in z.
      const u = -flat[i * 3]
      const v = flat[i * 3 + 1]
      if (peel <= 0 || u <= start) {
        const [x, z] = along(u)
        pos.setXYZ(i, -x, v, z)
        continue
      }
      const t = u - start
      // Integrate a constant-curvature curl so the flap rolls rather than folds.
      const phi = (s: number): number => lift + curl * s
      const steps = 8
      let x = px
      let z = pz
      for (let n = 0; n < steps; n++) {
        const s = ((n + 0.5) / steps) * t
        const p = phi(s)
        x += (Math.cos(p) * tangent[0] + Math.sin(p) * normal[0]) * (t / steps)
        z += (Math.cos(p) * tangent[1] + Math.sin(p) * normal[1]) * (t / steps)
      }
      pos.setXYZ(i, -x, v, z)
    }
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
}

const printerMatrix = new THREE.Matrix4().compose(PRINTER_POS, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, PRINTER_YAW, 0)), new THREE.Vector3(1, 1, 1))

/** The label lying on the printer's exit tray, `feed` of the way out of the slot. */
function feedMatrix(label: SceneLabel, feed: number): THREE.Matrix4 {
  // Long edge along the feed direction (+z), printed face up.
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
  const droop = Math.max(0, feed - 0.55) * 0.18
  basis.multiply(new THREE.Matrix4().makeRotationY(-droop))
  basis.setPosition(SLOT.x, SLOT.y + 0.004, SLOT.z + feed * label.widthIn - label.widthIn / 2)
  return printerMatrix.clone().multiply(basis)
}

/** Where a label sits once applied: tangent to the vial at `angle`, in vial space. */
function appliedLocal(label: SceneLabel): THREE.Matrix4 {
  const { height, radius } = placement(label)
  return new THREE.Matrix4().makeTranslation(0, height, radius)
}

function bottleMatrix(turn: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(BOTTLE_POS, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)), new THREE.Vector3(1, 1, 1))
}

/** How far the vial has turned at time `t`: facing the printer while labelled, then a gentle sway. */
function bottleTurn(t: number, count: number): number {
  const end = count * PER_LABEL - TURN
  const base = -0.14
  if (t <= end) return base
  const s = t - end
  return base + Math.sin(s * 0.6) * 0.42 * Math.min(1, s / 1.5)
}

function decompose(m: THREE.Matrix4): { p: THREE.Vector3; q: THREE.Quaternion } {
  const p = new THREE.Vector3()
  const q = new THREE.Quaternion()
  m.decompose(p, q, new THREE.Vector3())
  return { p, q }
}

function LabelSheet({ label, index, clock, count, peel }: { label: SceneLabel; index: number; clock: React.RefObject<number>; count: number; peel: React.RefObject<number> }) {
  const texture = useLabelTexture(label)
  const front = useRef<THREE.Mesh>(null)
  const back = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => new THREE.PlaneGeometry(label.widthIn, label.heightIn, 96, 1), [label.widthIn, label.heightIn])
  const flat = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry])
  const lastBend = useRef('')

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const t = (clock.current ?? 0) - index * PER_LABEL
    const meshes = [front.current, back.current]
    if (!meshes[0] || !meshes[1]) return
    const visible = t > 0
    let matrix: THREE.Matrix4
    let amount = 0
    if (t < FEED + HOLD) {
      matrix = feedMatrix(label, ease(clamp01(t / FEED)))
    } else {
      const lift = ease(clamp01((t - FEED - HOLD) / LIFT))
      amount = ease(clamp01((t - FEED - HOLD - LIFT) / WRAP))
      const target = bottleMatrix(bottleTurn(clock.current ?? 0, count)).multiply(appliedLocal(label))
      if (lift >= 1) {
        matrix = target
      } else {
        // Peel off the tray and swing over to the vial on a short arc.
        const a = decompose(feedMatrix(label, 1))
        const b = decompose(target)
        const p = a.p.clone().lerp(b.p, lift)
        p.y += Math.sin(lift * Math.PI) * 1.1
        const q = a.q.clone().slerp(b.q, lift)
        matrix = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1))
      }
    }
    const peeled = label.layer > 0 && amount >= 1 ? (peel.current ?? 0) : 0
    const key = `${amount.toFixed(4)}:${peeled.toFixed(4)}`
    if (key !== lastBend.current) {
      bend(geometry, flat, amount, placement(label).radius, peeled)
      lastBend.current = key
    }
    for (const m of meshes) {
      m!.visible = visible
      m!.matrix.copy(matrix)
      m!.matrixWorldNeedsUpdate = true
    }
  })

  return (
    <>
      <mesh ref={front} geometry={geometry} matrixAutoUpdate={false} castShadow>
        <meshStandardMaterial map={texture} roughness={0.55} side={THREE.FrontSide} />
      </mesh>
      <mesh ref={back} geometry={geometry} matrixAutoUpdate={false}>
        <meshStandardMaterial color="#f3efe6" roughness={0.8} side={THREE.BackSide} />
      </mesh>
    </>
  )
}

function Printer({ clock, count }: { clock: React.RefObject<number>; count: number }) {
  const body = useRef<THREE.Group>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const t = clock.current ?? 0
    const local = t % PER_LABEL
    const printing = t < count * PER_LABEL && local > 0 && local < FEED
    if (body.current) body.current.position.y = printing ? Math.sin(t * 90) * 0.004 : 0
    if (led.current) {
      led.current.emissive.set(printing ? '#3ddc84' : t >= count * PER_LABEL - TURN ? '#3ddc84' : '#f5a623')
      led.current.emissiveIntensity = printing ? 1.6 + Math.sin(t * 18) * 0.8 : 1.2
    }
  })
  const { width, depth, height } = PRINTER
  return (
    <group position={PRINTER_POS} rotation={[0, PRINTER_YAW, 0]}>
      <group ref={body}>
        {/* Base */}
        <RoundedBox args={[width, height * 0.42, depth]} radius={0.18} smoothness={5} position={[0, height * 0.21, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#d8dce1" roughness={0.45} />
        </RoundedBox>
        {/* Clamshell lid */}
        <RoundedBox args={[width * 0.98, height * 0.62, depth * 0.94]} radius={0.32} smoothness={6} position={[0, height * 0.62, -depth * 0.02]} castShadow>
          <meshStandardMaterial color="#2a2f37" roughness={0.32} metalness={0.1} />
        </RoundedBox>
        {/* Smoked window over the roll */}
        <mesh position={[0, height * 0.935, -depth * 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width * 0.6, depth * 0.42]} />
          <meshPhysicalMaterial color="#5b6573" roughness={0.1} transmission={0.4} transparent opacity={0.7} />
        </mesh>
        {/* Label roll seen through the window */}
        <mesh position={[0, height * 0.72, -depth * 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.52, 0.52, width * 0.5, 48]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
        </mesh>
        {/* Exit slot and tear bar */}
        <mesh position={[SLOT.x, SLOT.y - 0.02, depth / 2 - 0.02]}>
          <boxGeometry args={[width * 0.72, 0.09, 0.08]} />
          <meshStandardMaterial color="#0d0f12" roughness={0.9} />
        </mesh>
        <mesh position={[SLOT.x, SLOT.y + 0.06, depth / 2 + 0.01]}>
          <boxGeometry args={[width * 0.74, 0.035, 0.04]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Exit tray */}
        <mesh position={[SLOT.x, SLOT.y - 0.06, depth / 2 + 0.18]} receiveShadow>
          <boxGeometry args={[width * 0.7, 0.04, 0.4]} />
          <meshStandardMaterial color="#c3c8ce" roughness={0.5} />
        </mesh>
        {/* Status LED and feed button */}
        <mesh position={[width * 0.36, height * 0.62, depth / 2 - 0.08]}>
          <sphereGeometry args={[0.06, 24, 16]} />
          <meshStandardMaterial ref={led} color="#1b1f24" emissive="#f5a623" emissiveIntensity={1.2} />
        </mesh>
        <RoundedBox args={[0.42, 0.16, 0.12]} radius={0.05} position={[width * 0.36, height * 0.42, depth / 2 - 0.01]}>
          <meshStandardMaterial color="#3a414b" roughness={0.4} />
        </RoundedBox>
      </group>
    </group>
  )
}

/** Amber vial with a white child-resistant cap, turned by the timeline. */
function Vial({ clock, count }: { clock: React.RefObject<number>; count: number }) {
  const group = useRef<THREE.Group>(null)
  const bodyGeometry = useMemo(() => {
    const r = BOTTLE_RADIUS
    const h = BOTTLE_HEIGHT
    const profile = [
      [0, 0],
      [r - 0.12, 0],
      [r - 0.02, 0.05],
      [r, 0.16],
      [r, h - 0.32],
      [r - 0.05, h - 0.2],
      [r - 0.12, h - 0.16],
      [r - 0.12, h],
      [r - 0.16, h],
      [r - 0.16, 0.08],
      [0, 0.08],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(profile, 96)
  }, [])
  const capGeometry = useMemo(() => {
    const r = BOTTLE_RADIUS + 0.04
    const profile = [
      [0, 0.62],
      [r - 0.1, 0.62],
      [r, 0.56],
      [r, 0.02],
      [r - 0.04, 0],
      [r - 0.08, 0],
      [r - 0.08, 0.5],
      [0, 0.5],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(profile, 96)
  }, [])
  useFrame(() => {
    if (group.current) group.current.rotation.y = bottleTurn(clock.current ?? 0, count)
  })
  return (
    <group ref={group} position={BOTTLE_POS}>
      <mesh geometry={bodyGeometry} castShadow>
        <meshPhysicalMaterial color="#b4621b" roughness={0.12} transmission={0.55} thickness={0.25} ior={1.5} attenuationColor="#7a3a0c" attenuationDistance={0.9} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, BOTTLE_HEIGHT - 0.42, 0]}>
        <mesh geometry={capGeometry} castShadow>
          <meshStandardMaterial color="#f6f6f2" roughness={0.42} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2
          const r = BOTTLE_RADIUS + 0.045
          return (
            <mesh key={i} position={[Math.sin(a) * r, 0.3, Math.cos(a) * r]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.025, 0.46, 0.02]} />
              <meshStandardMaterial color="#e9e9e4" roughness={0.5} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function Timeline({ clock, runKey, count, paused, onPhase, onDone }: { clock: React.RefObject<number>; runKey: number; count: number; paused: boolean; onPhase?: Props['onPhase']; onDone?: () => void }) {
  const last = useRef<string>('')
  const finished = useRef(false)
  useEffect(() => {
    clock.current = 0
    finished.current = false
    last.current = ''
  }, [runKey, clock])
  useFrame((_, delta) => {
    if (!paused) clock.current = (clock.current ?? 0) + Math.min(delta, 0.05)
    const t = clock.current ?? 0
    const total = count * PER_LABEL - TURN
    const index = Math.min(count - 1, Math.floor(t / PER_LABEL))
    const local = t - index * PER_LABEL
    const phase: PrintPhase = t >= total ? 'done' : local < FEED + HOLD ? 'printing' : 'applying'
    const key = `${phase}:${index}`
    if (key !== last.current) {
      last.current = key
      onPhase?.(phase, index)
    }
    if (phase === 'done' && !finished.current) {
      finished.current = true
      onDone?.()
    }
  })
  return null
}

const TARGET = new THREE.Vector3(0.2, 1.3, 0)
/** The view direction: up and in front of the scene. */
const VIEW_DIR = new THREE.Vector3(0, 4.9, 14.2).normalize()

/** Frames the printer and the vial whatever the canvas's shape: backs the camera off until both fit. */
function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera
    const vHalf = THREE.MathUtils.degToRad(persp.fov / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / Math.max(1, size.height)))
    // The printer and vial span about 5.6 either side of the target and 4 above and below it.
    const distance = Math.max(14, 4 / Math.tan(vHalf), 5.6 / Math.tan(hHalf))
    camera.position.copy(TARGET).addScaledVector(VIEW_DIR, distance)
    camera.lookAt(TARGET)
  }, [camera, size.width, size.height])
  return null
}

/** Eases the peel value toward its target so the flap moves rather than jumps. */
function PeelDriver({ target, peel }: { target: number; peel: React.RefObject<number> }) {
  useFrame((_, delta) => {
    const current = peel.current ?? 0
    const step = Math.min(1, delta * 2.2)
    peel.current = Math.abs(target - current) < 0.001 ? target : current + (target - current) * step
  })
  return null
}

export default function PrintScene({ labels, runKey, onPhase, onDone, paused = false, peel: peelTarget = 0 }: Props) {
  const clock = useRef(0)
  const peel = useRef(0)
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 2]} camera={{ position: [0.2, 6.2, 14.2], fov: 34 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={['#e9e9e9']} />
      <CameraRig />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 9, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8, 0.5, 30]} />
      </directionalLight>
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} position={[0, 6, 4]} scale={[12, 4, 1]} />
        <Lightformer intensity={1.2} position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 4, 1]} />
        <Lightformer intensity={1} position={[6, 2, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 4, 1]} color="#ffe2c4" />
      </Environment>
      <PeelDriver target={peelTarget} peel={peel} />
      <Timeline clock={clock} runKey={runKey} count={labels.length} paused={paused} onPhase={onPhase} onDone={onDone} />
      <Printer clock={clock} count={labels.length} />
      <Vial clock={clock} count={labels.length} />
      {labels.map((label, i) => (
        <LabelSheet key={`${runKey}:${label.id}`} label={label} index={i} clock={clock} count={labels.length} peel={peel} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#dedede" roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.35} scale={18} blur={2.4} far={4} />
      <OrbitControls target={[0.2, 1.3, 0]} enablePan={false} minDistance={5} maxDistance={30} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  )
}
