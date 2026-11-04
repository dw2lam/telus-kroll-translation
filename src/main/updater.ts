import { app, BrowserWindow, dialog, net, shell } from 'electron'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// Updates come from this repo's GitHub Releases, which hold only the installers
// (no update feeds). The app asks GitHub for the latest release, compares its tag
// with its own version, and downloads the installer that matches this copy.
// While the repo is private, installed copies can only reach it with a read-only
// token injected at build time from MAIN_VITE_UPDATE_TOKEN (.env.local or the
// UPDATE_TOKEN CI secret); without one, background checks fail silently.
const OWNER = 'dw2lam'
const REPO = 'telus-kroll-translation'
const TOKEN = import.meta.env.MAIN_VITE_UPDATE_TOKEN ?? ''
const EVERY_FOUR_HOURS = 4 * 60 * 60 * 1000
const NAME = 'Telus Kroll Translation Demo'

interface Asset {
  name: string
  url: string
}

interface Release {
  tag_name: string
  assets: Asset[]
}

let busy = false
/** The version already offered in the background, so it isn't offered again every 4 hours. */
let offered = ''

function owner(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

async function message(options: Electron.MessageBoxOptions): Promise<number> {
  const win = owner()
  const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
  return response
}

function headers(accept = 'application/vnd.github+json'): Record<string, string> {
  const h: Record<string, string> = { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' }
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`
  return h
}

const isPortable = (): boolean => Boolean(process.env.PORTABLE_EXECUTABLE_FILE)

/** The release file that replaces this copy. */
function assetSuffix(): string | null {
  if (process.platform === 'darwin') return `-mac-${process.arch === 'arm64' ? 'arm64' : 'x64'}.dmg`
  if (process.platform === 'win32') return isPortable() ? '-win-portable-x64.exe' : '-win-setup-x64.exe'
  return null
}

/** `a` is a later version than `b` (plain x.y.z). */
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

async function latestRelease(): Promise<Release> {
  const res = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, { headers: headers() })
  if (!res.ok) throw new Error(`GitHub returned ${res.status} ${res.statusText}`)
  return (await res.json()) as Release
}

async function download(asset: Asset): Promise<string> {
  const file = await net.fetch(asset.url, { headers: headers('application/octet-stream') })
  if (!file.ok || !file.body) throw new Error(`Download failed (${file.status})`)
  const target = join(app.getPath('downloads'), asset.name)
  await pipeline(Readable.fromWeb(file.body as never), createWriteStream(target))
  return target
}

/** Opens the downloaded file the way this copy gets replaced. */
async function install(target: string, version: string): Promise<void> {
  if (process.platform === 'darwin') {
    // An unsigned Mac app can't replace itself, so open the dmg for a drag-to-Applications.
    await shell.openPath(target)
    await message({
      type: 'info',
      message: `${NAME} ${version} downloaded`,
      detail: `The installer is open. Quit ${NAME}, then drag the new version into Applications to replace this one.`,
    })
  } else if (isPortable()) {
    shell.showItemInFolder(target)
    await message({ type: 'info', message: `${NAME} ${version} downloaded`, detail: 'It’s in your Downloads folder. Run it instead of this copy.' })
  } else {
    // The installer updates the existing install in place; the app quits so its files can be replaced.
    await message({ type: 'info', message: `${NAME} ${version} downloaded`, detail: `The installer opens now and ${NAME} closes so it can update.` })
    await shell.openPath(target)
    app.quit()
  }
}

async function check(manual: boolean): Promise<void> {
  if (busy) return
  busy = true
  try {
    const suffix = assetSuffix()
    const release = await latestRelease()
    const version = release.tag_name.replace(/^v/, '')
    if (!suffix || !isNewer(version, app.getVersion())) {
      if (manual) await message({ type: 'info', message: `${NAME} is up to date`, detail: `Version ${app.getVersion()}` })
      return
    }
    const asset = release.assets.find((a) => a.name.endsWith(suffix))
    if (!asset) {
      if (manual) await message({ type: 'info', message: `${NAME} ${version} is out`, detail: 'It has no download for this computer yet. See Help › Releases on GitHub.' })
      return
    }
    if (!manual && offered === version) return
    offered = version
    const response = await message({
      type: 'info',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
      message: `${NAME} ${version} is available`,
      detail: `You have ${app.getVersion()}. Download the new version now?`,
    })
    if (response !== 0) return
    await install(await download(asset), version)
  } catch (error) {
    if (manual) await message({ type: 'error', message: 'Could not check for updates', detail: explain(error) })
  } finally {
    busy = false
  }
}

/** A 404 from GitHub here almost always means the releases are private and this build has no token. */
function explain(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/\b404\b|Not Found/i.test(text) && !TOKEN) {
    return 'The releases repo is private and this build has no update token, so it can’t see new versions. Download them from GitHub instead (Help › Releases on GitHub).'
  }
  return text.split('\n')[0]
}

export function setUpAutoUpdates(): void {
  if (!app.isPackaged) return
  setTimeout(() => void check(false), 5000)
  setInterval(() => void check(false), EVERY_FOUR_HOURS)
}

/** Help › Check for Updates… */
export function checkForUpdatesNow(): void {
  if (!app.isPackaged) {
    void message({ type: 'info', message: 'Updates are only checked in the installed app.' })
    return
  }
  void check(true)
}
