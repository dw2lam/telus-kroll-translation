import { describe, expect, it } from 'vitest'
import { stateAt, stepsFor, TOURS } from '@/demo/tours'

describe('walkthroughs', () => {
  for (const view of ['3d', 'inline'] as const) {
    for (const tour of TOURS) {
      it(`${tour.id} (${view}): every step is reachable and starts not yet done`, () => {
        const steps = stepsFor(tour, { view })
        steps.forEach((step, i) => {
          const state = stateAt(tour, i, { view })
          if (step.done && typeof step.perform === 'function') expect(step.done(state), step.title).toBe(false)
          if (typeof step.perform === 'function') expect(step.perform(state, { view }).length, step.title).toBeGreaterThan(0)
        })
        const end = stateAt(tour, steps.length, { view })
        expect(view === '3d' ? end.screen : end.preview).toBe(view === '3d' ? 'print' : 'printed')
      })
    }
  }
})
