import peel13 from '@/assets/c3/peel-13.svg'
import peel16 from '@/assets/c3/peel-16.svg'
import peel20 from '@/assets/c3/peel-20.svg'
import peel30 from '@/assets/c3/peel-30.svg'
import peel40 from '@/assets/c3/peel-40.svg'
import peel6 from '@/assets/c3/peel-6.svg'
import type { DoseForm } from '@/data/phrasebook'

export type VialId = '6' | '13' | '16' | '20' | '30' | '40'

/** Label stock prints at 144 px to the inch, the Figma C3 labels' scale. */
export const PX_PER_INCH = 144

/**
 * One vial size and its label, measured from Figma C3 ("Labels without warnings, with warning
 * stickers"). Every size prints the same fields; only the stock and the type scale change.
 */
export interface Vial {
  id: VialId
  name: string
  /** Approximate capacity, as C3 captions it. */
  ml: string
  /** Label stock, as C3 captions it. */
  inches: string
  width: number
  height: number
  /** Only labels 3.5″ wide and up have room for the "turn to the back" line on the front. */
  pointer: boolean
  /** Peel tab triangle and its two-line label. */
  peel: { src: string; size: number; font: number }
  front: {
    padY: number
    padX: number
    /** Gap between the front's blocks (pointer, critical, divider, details, pharmacy). */
    gap: number
    /** Gap inside the critical block (patient, drug, directions). */
    criticalGap: number
    pointerFont: number
    name: number
    drug: number
    generic: number
    directions: number
    highlight: { y: number; x: number }
    details: number
    detailsGap: number
  }
  back: {
    headerHeight: number
    headerPadX: number
    headerFont: number
    tagFont: number
    padY: number
    padX: number
    gap: number
    name: number
    drug: number
    side: number
    directions: number
    /** The smallest label drops the English "Expiry" after 有效期 for room. */
    expiryEnglish: boolean
  }
}

export const VIALS: Vial[] = [
  {
    id: '6', name: '6 dram', ml: '~22 mL', inches: '2″ × 1.25″', width: 288, height: 180, pointer: false,
    peel: { src: peel6, size: 60, font: 12 },
    front: { padY: 6, padX: 7, gap: 3, criticalGap: 2, pointerFont: 12, name: 18, drug: 16, generic: 12, directions: 18, highlight: { y: 1, x: 3 }, details: 12, detailsGap: 1 },
    back: { headerHeight: 20, headerPadX: 8, headerFont: 12, tagFont: 12, padY: 7, padX: 8, gap: 4, name: 18, drug: 16, side: 12, directions: 18, expiryEnglish: false },
  },
  {
    id: '13', name: '13 dram', ml: '~48 mL', inches: '2.5″ × 1.5″', width: 360, height: 216, pointer: false,
    peel: { src: peel13, size: 64, font: 12 },
    front: { padY: 9, padX: 9, gap: 8, criticalGap: 3, pointerFont: 12, name: 22, drug: 18, generic: 13, directions: 22, highlight: { y: 1, x: 4 }, details: 12, detailsGap: 1 },
    back: { headerHeight: 28, headerPadX: 10, headerFont: 14, tagFont: 12, padY: 10, padX: 10, gap: 4, name: 22, drug: 18, side: 12, directions: 22, expiryEnglish: true },
  },
  {
    id: '16', name: '16 dram', ml: '~59 mL', inches: '3″ × 1.75″', width: 432, height: 252, pointer: false,
    peel: { src: peel16, size: 68, font: 13 },
    front: { padY: 10, padX: 10, gap: 3, criticalGap: 3, pointerFont: 13, name: 24, drug: 20, generic: 14, directions: 24, highlight: { y: 1, x: 4 }, details: 12, detailsGap: 1 },
    back: { headerHeight: 30, headerPadX: 12, headerFont: 15, tagFont: 12, padY: 12, padX: 12, gap: 8, name: 24, drug: 20, side: 12, directions: 24, expiryEnglish: true },
  },
  {
    id: '20', name: '20 dram', ml: '~74 mL', inches: '3.5″ × 2″', width: 504, height: 288, pointer: true,
    peel: { src: peel20, size: 72, font: 13 },
    front: { padY: 11, padX: 12, gap: 11, criticalGap: 4, pointerFont: 13, name: 26, drug: 22, generic: 15, directions: 26, highlight: { y: 2, x: 5 }, details: 13, detailsGap: 2 },
    back: { headerHeight: 34, headerPadX: 14, headerFont: 16, tagFont: 12, padY: 14, padX: 14, gap: 8, name: 26, drug: 22, side: 13, directions: 26, expiryEnglish: true },
  },
  {
    id: '30', name: '30 dram', ml: '~110 mL', inches: '4″ × 2.25″', width: 576, height: 324, pointer: true,
    peel: { src: peel30, size: 80, font: 14 },
    front: { padY: 14, padX: 14, gap: 12, criticalGap: 4, pointerFont: 14, name: 30, drug: 26, generic: 17, directions: 30, highlight: { y: 2, x: 5 }, details: 14, detailsGap: 2 },
    back: { headerHeight: 40, headerPadX: 16, headerFont: 18, tagFont: 13, padY: 16, padX: 16, gap: 8, name: 30, drug: 26, side: 14, directions: 30, expiryEnglish: true },
  },
  {
    id: '40', name: '40–60 dram', ml: '~148–220 mL', inches: '4″ × 3″', width: 576, height: 432, pointer: true,
    peel: { src: peel40, size: 84, font: 14 },
    front: { padY: 16, padX: 16, gap: 12, criticalGap: 6, pointerFont: 14, name: 32, drug: 26, generic: 18, directions: 28, highlight: { y: 2, x: 5 }, details: 14, detailsGap: 4 },
    back: { headerHeight: 46, headerPadX: 18, headerFont: 20, tagFont: 14, padY: 18, padX: 18, gap: 9, name: 32, drug: 26, side: 14, directions: 28, expiryEnglish: true },
  },
]

export const vialById = (id: VialId | undefined): Vial => VIALS.find((v) => v.id === id) ?? VIALS[2]

/**
 * The vial Kroll suggests for a quantity, following the low-fidelity size notes: capsules take
 * more room than tablets. The pharmacist can always pick another size.
 */
export function suggestVial(quantity: string, form: DoseForm): VialId {
  const n = Number.parseInt(quantity, 10)
  if (!Number.isFinite(n) || n <= 0) return '16'
  const steps: [number, VialId][] =
    form === 'tablet'
      ? [[12, '6'], [30, '13'], [60, '20'], [90, '30']]
      : [[8, '6'], [30, '16'], [45, '20'], [60, '30']]
  return steps.find(([max]) => n <= max)?.[1] ?? '40'
}

/** Kroll's upper-case English, in the sentence case the C3 labels print. */
export function sentenceCase(text: string): string {
  const lower = text.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
