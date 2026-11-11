// End-to-end smoke test: drives the built app (hidden) through every branch of
// the flow to the printed vial. Run with `npm run test:e2e`.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { _electron } from 'playwright-core'

const app = await _electron.launch({ args: ['out/main/index.js'], env: { ...process.env, KROLL_SILENT: '1' } })
const page = await app.firstWindow()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const text = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ')
const printed = () => page.waitForSelector('[data-testid=print-status][data-phase=done]', { timeout: 45000 })
const scenario = async (id) => {
  await page.click('[data-testid=pz-tab-scenarios]')
  await page.click(`[data-testid=scenario-${id}]`)
}

try {
  // A saved 3D-off preference would send prints to the inline preview.
  await page.evaluate(() => {
    localStorage.setItem('kroll-label.show3d', 'on')
    localStorage.setItem('kroll-label.presenter', 'on')
  })
  await page.reload()
  // The sidebar shows the version, and slides shut and open.
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.equal(await text('[data-testid=app-version]'), `Version ${version}`)
  const slotWidth = () => page.evaluate(() => document.querySelector('.pz-slot').getBoundingClientRect().width)
  await page.click('[data-testid=pz-collapse]')
  await page.waitForTimeout(500)
  assert.equal(await slotWidth(), 0)
  await page.click('[data-testid=pz-reveal]')
  await page.waitForTimeout(500)
  assert.equal(await slotWidth(), 300)
  // Ms. Leung: language at intake, sig code, verified translation, peel-back label.
  await page.click('[data-testid=tour-leung]')
  assert.equal(await page.inputValue('[data-testid=edit-lastName]'), 'Leung')
  assert.equal(await page.inputValue('[data-testid=edit-firstName]'), 'Mei')
  assert.match(await page.getAttribute('.k-photo img', 'src'), /patient-leung/)
  await page.fill('[data-testid=edit-firstName]', 'May')
  for (let i = 0; i < 4; i++) await page.click('[data-testid=step-do]')
  await printed()
  assert.equal(await text('[data-testid=label-translated-sig]'), '每日两次，每次1粒，口服')
  assert.match(await text('[data-panel="2"]'), /Leung, May/)
  assert.equal(await text('[data-testid=edit-count]'), '1')
  await page.click('[data-testid=btn-reset-edits]')
  await page.click('[data-testid=tour-exit]')
  await page.click('[data-testid=btn-restart]')
  console.log('✓ Ms. Leung walkthrough, with an edited name')

  // Chinese, sig code QD: patient language → Fill Rx → exact → B5 → print → peel.
  await page.click('[data-testid=language-field]')
  await page.click('[data-testid=language-list] button:has-text("Chinese (Simplified)")')
  await page.click('button:has-text("OK")')
  await page.press('[data-testid=sig-input]', 'Enter')
  await page.waitForSelector('[data-testid=dialog-exact]')
  await page.click('[data-testid=btn-print-translation]')
  assert.equal(await text('[data-testid=translated-sig]'), '每天 1 次，每次 1 粒胶囊')
  await printed()
  assert.equal(await text('[data-testid=label-english-sig]'), 'TAKE 1 CAPSULE ONCE A DAY')
  assert.match(await text('[data-testid=label-dispensing]'), /30.*6.*Dr\. McGraw, Phil/s)
  await page.click('[data-testid=btn-peel]')
  console.log('✓ exact match prints both panels')

  // Free text: closest → top 5 → phrasing guide → can't translate → English only.
  await page.click('[data-testid=btn-restart]')
  await page.click('[data-testid=btn-patient-ok]')
  await page.fill('[data-testid=sig-input]', '1 CAP QD FOR ANEMIA')
  await page.press('[data-testid=sig-input]', 'Enter')
  assert.match(await text('[data-testid=dialog-closest]'), /Closest match · \d+%/)
  await page.click('[data-testid=btn-not-this-one]')
  assert.equal(await page.locator('[data-testid=dialog-candidates] [role=radio]').count(), 3)
  await page.click('[data-testid=btn-none-of-these]')
  await page.waitForSelector('[data-testid=dialog-guide]')
  await page.click('[data-testid=btn-none-fit]')
  await page.waitForSelector('[data-testid=dialog-cannot]')
  await page.click('[data-testid=btn-print-english]')
  await printed()
  assert.equal(await page.locator('[data-panel="2"]').count(), 0)
  console.log('✓ free-text refusal path prints English only')

  // The one scenario reaches a printed vial.
  await scenario('leung')
  await page.press('[data-testid=sig-input]', 'Enter')
  await page.locator('[role=dialog] .k-dbtn.is-primary').click()
  await printed()
  console.log('✓ scenario')

  // Walkthrough: steps advance from the sidebar button or from using Kroll itself, and jump around.
  const atStep = (n) => page.waitForFunction((n) => document.querySelector('[data-testid=walkthrough]')?.getAttribute('data-step') === String(n), n, { timeout: 45000 })
  await page.click('[data-testid=pz-tab-walkthroughs]')
  await page.click('[data-testid=tour-leung]')
  await page.waitForSelector('[data-testid=screen-patient]')
  await page.click('[data-testid=step-do]')
  await page.click('[data-testid=btn-patient-ok]')
  await atStep(2)
  await page.press('[data-testid=sig-input]', 'Enter')
  await atStep(3)
  await page.click('[data-testid=step-do]')
  await page.waitForSelector('[data-testid=print-view]')
  await page.click('[data-testid=step-do]')
  await page.waitForSelector('[data-testid=step-do]:not([disabled])', { timeout: 45000 })
  await page.click('[data-testid=step-do]')
  await page.waitForSelector('[data-testid=tour-finished]')
  console.log('✓ walkthrough, by sidebar and by Kroll')
  await page.click('[data-testid=tour-again]')
  await page.click('[data-testid=step-3]')
  await page.waitForSelector('[data-testid=dialog-exact]')
  await page.click('[data-testid=step-back]')
  await page.waitForSelector('[data-testid=screen-fill]')
  await page.click('[data-testid=tour-exit]')
  console.log('✓ walkthrough jumps to any step and back')
  // Cheat sheet pops out into its own window; clicking a cell runs it in Kroll.
  const sheets = () => app.windows().filter((w) => w.url().includes('#cheatsheet-window'))
  const opened = app.waitForEvent('window')
  await page.click('[data-testid=btn-cheatsheet]')
  const sheet = await opened
  await sheet.waitForSelector('[data-testid=cheatsheet] .cs-cell.is-clickable')
  await sheet.click('.cs-cell.is-clickable >> nth=0')
  await page.waitForSelector('[role=dialog]')
  await page.keyboard.press('F1')
  await page.waitForTimeout(500)
  assert.equal(sheets().length, 1)
  await sheet.click('[data-testid=btn-cheatsheet-close]')
  await page.waitForTimeout(300)
  assert.equal(sheets().length, 0)
  console.log('✓ cheat sheet pops out and loads into Kroll')
  assert.deepEqual(errors, [])
} finally {
  await app.close()
}
