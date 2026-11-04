// End-to-end smoke test: drives the built app (hidden) through every branch of
// the flow to the printed vial. Run with `npm run test:e2e`.
import assert from 'node:assert/strict'
import { _electron } from 'playwright-core'

const app = await _electron.launch({ args: ['out/main/index.js'], env: { ...process.env, KROLL_SILENT: '1' } })
const page = await app.firstWindow()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const text = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ')
const printed = () => page.waitForSelector('[data-testid=print-status][data-phase=done]', { timeout: 45000 })

try {
  // Hindi, Kroll code *1C: patient language → Fill Rx → exact → B5 → print → peel.
  await page.click('[data-testid=language-field]')
  await page.click('[data-testid=language-list] button:has-text("Hindi")')
  await page.click('button:has-text("OK")')
  await page.press('[data-testid=sig-input]', 'Enter')
  await page.waitForSelector('[data-testid=dialog-exact]')
  await page.click('[data-testid=btn-print-translation]')
  assert.equal(await text('[data-testid=translated-sig]'), 'दिन में एक बार 1 कैप्सूल मुँह से लें')
  await printed()
  assert.equal(await text('[data-testid=label-english-sig]'), 'TAKE 1 CAPSULE ONCE A DAY')
  await page.click('[data-testid=btn-peel]')
  console.log('✓ exact match prints both panels')

  // Free text: closest → top 5 → phrasing guide → can't translate → English only.
  await page.selectOption('[data-testid=scenario]', 'closest')
  await page.press('[data-testid=sig-input]', 'Enter')
  assert.match(await text('[data-testid=dialog-closest]'), /Closest match · 88%/)
  await page.click('[data-testid=btn-not-this-one]')
  assert.equal(await page.locator('[data-testid=dialog-candidates] [role=radio]').count(), 5)
  await page.click('[data-testid=btn-none-of-these]')
  await page.waitForSelector('[data-testid=dialog-guide]')
  await page.click('[data-testid=btn-none-fit]')
  await page.waitForSelector('[data-testid=dialog-cannot]')
  await page.click('[data-testid=btn-print-english]')
  await printed()
  assert.equal(await page.locator('[data-panel="2"]').count(), 0)
  console.log('✓ free-text refusal path prints English only')

  // Every other scenario reaches a printed vial.
  for (const id of ['tagalog', 'arabic', 'chinese', 'punjabi', 'exact-text']) {
    await page.selectOption('[data-testid=scenario]', id)
    await page.press('[data-testid=sig-input]', 'Enter')
    await page.locator('[role=dialog] .k-dbtn.is-primary').click()
    await printed()
    console.log(`✓ ${id}`)
  }
  assert.deepEqual(errors, [])
} finally {
  await app.close()
}
