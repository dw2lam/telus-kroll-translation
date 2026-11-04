import { app, BrowserWindow, dialog, net, shell } from 'electron'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

// Updates come from this repo's GitHub Releases. While the repo is private,
// installed copies can only reach them with a read-only token injected at build
// time from MAIN_VITE_UPDATE_TOKEN (.env.local or the UPDATE_TOKEN CI secret).
// Without one, the feed is read as a public repo: it starts working the moment
// the repo is made public, and until then background checks fail silently.
const OWNER = 'dw2lam'
const REPO = 'telus-kroll-translation'
const TOKEN = import.meta.env.MAIN_VITE_UPDATE_TOKEN ?? ''
const EVERY_FOUR_HOURS = 4 * 60 * 60 * 1000

let manualCheck = false
let busy = false

function owner(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

async function message(options: Electron.MessageBoxOptions): Promise<number> {
  const win = owner()
  const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
  return response
}

/**
 * macOS: an unsigned app cannot replace itself (Squirrel.Mac requires a code
 * signature), so download the new dmg from the release and open it instead.
 */
async function downloadDmg(info: UpdateInfo): Promise<void> {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
  const release = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/v${info.version}`, { headers })
  if (!release.ok) throw new Error(`GitHub returned ${release.status} for v${info.version}`)
  const { assets } = (await release.json()) as { assets: { name: string; url: string }[] }
  const asset = assets.find((a) => a.name.endsWith(`-mac-${arch}.dmg`))
  if (!asset) throw new Error(`v${info.version} has no ${arch} dmg`)
  const file = await net.fetch(asset.url, { headers: { ...headers, Accept: 'application/octet-stream' } })
  if (!file.ok || !file.body) throw new Error(`Download failed (${file.status})`)
  const target = join(app.getPath('downloads'), asset.name)
  await pipeline(Readable.fromWeb(file.body as never), createWriteStream(target))
  await shell.openPath(target)
  await message({
    type: 'info',
    message: `Kroll Label ${info.version} downloaded`,
    detail: 'The installer is open. Quit Kroll Label, then drag the new version into Applications to replace this one.',
  })
}

async function onAvailable(info: UpdateInfo): Promise<void> {
  if (process.platform !== 'darwin') return // Windows downloads in the background, then asks to restart.
  const response = await message({
    type: 'info',
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
    message: `Kroll Label ${info.version} is available`,
    detail: `You have ${app.getVersion()}. Download the new version now?`,
  })
  if (response !== 0) return
  try {
    await downloadDmg(info)
  } catch (error) {
    await message({ type: 'error', message: 'Could not download the update', detail: explain(error) })
  }
}

export function setUpAutoUpdates(): void {
  if (!app.isPackaged) return
  autoUpdater.setFeedURL(TOKEN ? { provider: 'github', owner: OWNER, repo: REPO, private: true, token: TOKEN } : { provider: 'github', owner: OWNER, repo: REPO })
  autoUpdater.autoDownload = process.platform !== 'darwin'
  autoUpdater.autoInstallOnAppQuit = process.platform !== 'darwin'

  autoUpdater.on('update-available', (info) => {
    manualCheck = false
    void onAvailable(info)
  })
  autoUpdater.on('update-not-available', () => {
    if (manualCheck) void message({ type: 'info', message: 'Kroll Label is up to date', detail: `Version ${app.getVersion()}` })
    manualCheck = false
  })
  autoUpdater.on('update-downloaded', async (info) => {
    const response = await message({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: `Kroll Label ${info.version} is ready`,
      detail: 'Restart to finish updating. Otherwise it installs the next time you quit.',
    })
    if (response === 0) autoUpdater.quitAndInstall()
  })
  autoUpdater.on('error', (error) => {
    if (manualCheck) void message({ type: 'error', message: 'Could not check for updates', detail: explain(error) })
    manualCheck = false
  })

  const check = (): void => {
    if (busy) return
    busy = true
    autoUpdater
      .checkForUpdates()
      .catch(() => undefined)
      .finally(() => {
        busy = false
      })
  }
  setTimeout(check, 5000)
  setInterval(check, EVERY_FOUR_HOURS)
}

/** A 404 from GitHub here almost always means the releases are private and this build has no token. */
function explain(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/\b404\b|HttpError: 404|Not Found/i.test(text) && !TOKEN) {
    return 'The releases repo is private and this build has no update token, so it can’t see new versions. Download them from GitHub instead (Help › Releases on GitHub).'
  }
  return text.split('\n')[0]
}

/** Help › Check for Updates… */
export function checkForUpdatesNow(): void {
  if (!app.isPackaged) {
    void message({ type: 'info', message: 'Updates are only checked in the installed app.' })
    return
  }
  manualCheck = true
  void autoUpdater.checkForUpdates().catch((error) => {
    if (!manualCheck) return // the 'error' event already reported it
    manualCheck = false
    void message({ type: 'error', message: 'Could not check for updates', detail: explain(error) })
  })
}
