import { useEffect, useState } from 'react'

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** A focus ring around one Kroll control: the one the current step is about. Never takes clicks. */
export function Highlight({ selector }: { selector: string | undefined }) {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }
    // Kroll re-lays out as dialogs open and the window resizes, so follow the control.
    let timer = 0
    const track = (): void => {
      const el = document.querySelector(selector)
      const r = el?.getBoundingClientRect()
      const next = r && r.width > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
      setRect((prev) =>
        prev && next && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height ? prev : next,
      )
      timer = window.setTimeout(track, 150)
    }
    track()
    return () => window.clearTimeout(timer)
  }, [selector])

  if (!rect) return null
  return (
    <div
      className="pz-ring"
      data-testid="highlight"
      style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
    />
  )
}
