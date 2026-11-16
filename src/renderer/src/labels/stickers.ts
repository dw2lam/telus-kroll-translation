import emptyStomach from '@/assets/c3/sticker-1-empty-stomach.svg'
import lieDown from '@/assets/c3/sticker-2-lie-down.svg'
import upsetStomach from '@/assets/c3/sticker-3-upset-stomach.svg'
import water from '@/assets/c3/sticker-4-water.svg'
import discolour from '@/assets/c3/sticker-5-discolour.svg'

/**
 * Figma C3's auxiliary warning stickers: 2″ × 0.5″, colour-coded, in priority order (the first two
 * change how the drug is taken or prevent harm). The pharmacist picks them as today; they go on the
 * vial, never over the label. Wording is C3's shortened English.
 */
export interface Sticker {
  id: string
  /** Index into RX.warnings: the full warning this sticker carries. */
  warning: number
  title: string
  detail?: string
  colour: string
  icon: string
}

export const STICKERS: Sticker[] = [
  { id: 'empty-stomach', warning: 0, title: 'Take on an empty stomach', detail: '1 hr before or 2–3 hrs after a meal', colour: '#ffb347', icon: emptyStomach },
  { id: 'lie-down', warning: 4, title: 'Do not lie down', detail: 'for at least 10 minutes after taking', colour: '#ffa8c8', icon: lieDown },
  { id: 'upset-stomach', warning: 1, title: 'Upset stomach?', detail: 'Take with crackers, bread or a small meal', colour: '#9be39b', icon: upsetStomach },
  { id: 'water', warning: 3, title: 'Take with plenty of water', colour: '#8fe6e6', icon: water },
  { id: 'discolour', warning: 2, title: 'May discolour urine or feces', colour: '#a9d3ff', icon: discolour },
]
