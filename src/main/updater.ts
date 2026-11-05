import { app, BrowserWindow, dialog, ipcMain, net, shell } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { accessSync, constants, createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'

// Updates come from this repo's public GitHub Releases, which hold only the installers
// (no update feeds, so no signing or Squirrel). The app asks GitHub for the latest release,
// compares its tag with its own version, downloads the installer that matches this copy in
// the background, and swaps itself over on restart or on the next quit. The portable exe
// and a Mac app running from somewhere read-only can't replace themselves, so those offer
// the download instead.
const OWNER = 'dw2lam'
const REPO = 'telus-kroll-translation'
const EVERY_FOUR_HOURS = 4 * 60 * 60 * 1000
const NAME = 'Telus Kroll Translation Demo'

/** Runs after the app exits: $1 pid to wait for, $2 staged app, $3 installed app, $4 "restart" to reopen it. */
const MAC_SWAP = `
while kill -0 "$1" 2>/dev/null; do sleep 0.2; done
old="$2.old"
rm -rf "$old"
if mv "$3" "$old"; then
  if mv "$2" "$3"; then rm -rf "$old"; else mv "$old" "$3"; fi
fi
if [ "$4" = restart ]; then open "$3"; fi
`

interface Asset {
  name: string
  browser_download_url: string
  /** "sha256:<hex>", set by GitHub. */
  digest?: string
}

interface Release {
  tag_name: string
  assets: Asset[]
}

interface Pending {
  version: string
  /** Starts putting the new version in place. Call it as the app quits. */
  apply: (restart: boolean) => void
}

const run = promisify(execFile)

let busy = false
/** The version already offered in the background, so it isn't offered again every 4 hours. */
let offered = ''
/** Downloaded and waiting for a restart or quit. */
let pending: Pending | null = null

function owner(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

async function message(options: Electron.MessageBoxOptions): Promise<number> {
  const win = owner()
  const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
  return response
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
  const res = await net.fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!res.ok) throw new Error(`GitHub returned ${res.status} ${res.statusText}`)
  return (await res.json()) as Release
}

async function download(asset: Asset, folder: string): Promise<string> {
  const file = await net.fetch(asset.browser_download_url)
  if (!file.ok || !file.body) throw new Error(`Download failed (${file.status})`)
  await mkdir(folder, { recursive: true })
  const target = join(folder, asset.name)
  await pipeline(Readable.fromWeb(file.body as never), createWriteStream(target))

  // This file replaces the app, so it has to be exactly what GitHub says it is.
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(target)) hash.update(chunk as Buffer)
  if (asset.digest && asset.digest !== `sha256:${hash.digest('hex')}`) {
    await rm(target, { force: true })
    throw new Error('The download was damaged. Try again.')
  }
  return target
}

const updatesFolder = (): string => join(app.getPath('userData'), 'updates')

/** The .app this copy runs from, unless it's somewhere read-only (a mounted dmg, App Translocation). */
function macBundle(): string | null {
  const bundle = resolve(app.getPath('exe'), '../../..')
  if (!bundle.endsWith('.app')) return null
  try {
    accessSync(dirname(bundle), constants.W_OK)
    return bundle
  } catch {
    return null
  }
}

function canReplaceItself(): boolean {
  if (process.platform === 'darwin') return macBundle() !== null
  return process.platform === 'win32' && !isPortable()
}

/** Starts a process that outlives the app. */
function launch(command: string, args: string[]): void {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.on('error', () => undefined) // Nothing to tell anyone: the app is quitting and checks again next launch.
  child.unref()
}

/** Copies the app out of the dmg, beside the installed one, so the swap at quit is just two renames. */
async function stageFromDmg(dmg: string, target: string): Promise<void> {
  const mount = await mkdtemp(join(app.getPath('temp'), 'kroll-update-'))
  await run('hdiutil', ['attach', dmg, '-nobrowse', '-readonly', '-mountpoint', mount])
  try {
    const name = (await readdir(mount)).find((n) => n.endsWith('.app'))
    if (!name) throw new Error('The download has no app in it.')
    await rm(target, { recursive: true, force: true })
    await run('ditto', [join(mount, name), target])
  } finally {
    await run('hdiutil', ['detach', mount, '-force']).catch(() => undefined)
    await rm(mount, { recursive: true, force: true })
  }
}

/** Gets a downloaded installer ready and returns what finishes the update. */
async function prepare(file: string): Promise<Pending['apply']> {
  const bundle = process.platform === 'darwin' ? macBundle() : null
  if (!bundle) return (restart) => launch(file, ['/S', '--updated', ...(restart ? ['--force-run'] : [])])
  const staged = join(dirname(bundle), `.${basename(bundle)}.update`)
  await stageFromDmg(file, staged)
  await rm(file, { force: true })
  return (restart) => launch('/bin/bash', ['-c', MAC_SWAP, 'swap', String(process.pid), staged, bundle, restart ? 'restart' : ''])
}

async function offerRestart(update: Pending): Promise<void> {
  const response = await message({
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    message: `${NAME} ${update.version} is ready`,
    detail: 'Restart to finish updating. If you choose Later, it updates the next time you quit.',
  })
  if (response !== 0) return
  pending = null
  update.apply(true)
  app.quit()
}

/** For copies that can't replace themselves: ask first, since the download goes in Downloads. */
async function offerDownload(asset: Asset, version: string, manual: boolean): Promise<void> {
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
  const target = await download(asset, app.getPath('downloads'))
  if (process.platform === 'darwin') {
    await shell.openPath(target)
    await message({
      type: 'info',
      message: `${NAME} ${version} downloaded`,
      detail: `The installer is open. Quit ${NAME}, then drag the new version into Applications. From there it updates itself.`,
    })
  } else {
    shell.showItemInFolder(target)
    await message({ type: 'info', message: `${NAME} ${version} downloaded`, detail: 'It’s in your Downloads folder. Run it instead of this copy.' })
  }
}

async function check(manual: boolean): Promise<void> {
  if (pending) {
    if (manual) await offerRestart(pending)
    return
  }
  if (busy) {
    if (manual) await message({ type: 'info', message: 'An update is already downloading', detail: 'You’ll be asked to restart when it’s ready.' })
    return
  }
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
    if (!canReplaceItself()) {
      await offerDownload(asset, version, manual)
      return
    }
    if (manual) void message({ type: 'info', message: `Downloading ${NAME} ${version}`, detail: 'You can keep working. You’ll be asked to restart when it’s ready.' })
    const apply = await prepare(await download(asset, updatesFolder()))
    pending = { version, apply }
    await offerRestart(pending)
  } catch (error) {
    if (manual) await message({ type: 'error', message: 'Could not update', detail: (error instanceof Error ? error.message : String(error)).split('\n')[0] })
  } finally {
    busy = false
  }
}

export function setUpAutoUpdates(): void {
  ipcMain.on('updates:check', () => checkForUpdatesNow())
  if (!app.isPackaged) return
  app.on('will-quit', () => {
    pending?.apply(false)
    pending = null
  })
  void rm(updatesFolder(), { recursive: true, force: true }).catch(() => undefined)
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
