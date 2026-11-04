import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { loadPage } from './labels'

let sheet: BrowserWindow | null = null

/** The cheat sheet in its own window, so it can sit beside Kroll or on a second screen. */
export function openCheatSheet(): void {
  if (sheet && !sheet.isDestroyed()) {
    if (sheet.isMinimized()) sheet.restore()
    if (!process.env.KROLL_SILENT) sheet.focus()
    return
  }
  sheet = new BrowserWindow({
    title: 'Cheat Sheet',
    width: 1180,
    height: 780,
    minWidth: 760,
    minHeight: 480,
    show: false,
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: !process.env.KROLL_SILENT,
    },
  })
  const win = sheet
  if (!process.env.KROLL_SILENT) win.once('ready-to-show', () => win.show())
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })
  win.on('closed', () => {
    if (sheet === win) sheet = null
  })
  void loadPage(win, 'cheatsheet-window')
}

export function closeCheatSheet(): void {
  if (sheet && !sheet.isDestroyed()) sheet.close()
}

/** `mainWindow` finds the Kroll window that a clicked cheat-sheet cell loads into. */
export function registerCheatSheetIpc(mainWindow: () => BrowserWindow | null): void {
  ipcMain.on('cheatsheet:open', () => openCheatSheet())
  ipcMain.on('cheatsheet:load', (_event, language: string, sig: string) => {
    const win = mainWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send('demo:load', language, sig)
    if (!process.env.KROLL_SILENT) win.focus()
  })
}
