import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import type { DemoCommand } from '../shared/api'
import { closeCheatSheet, openCheatSheet, registerCheatSheetIpc } from './cheatsheet'
import { registerLabelIpc } from './labels'
import { checkForUpdatesNow, setUpAutoUpdates } from './updater'

const isMac = process.platform === 'darwin'
let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: 'Telus Kroll Translation Demo',
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    autoHideMenuBar: !isMac,
    // macOS draws the presenter sidebar's material; the page leaves that area transparent.
    ...(isMac ? { vibrancy: 'sidebar' as const, visualEffectState: 'followWindow' as const, backgroundColor: '#00000000' } : { backgroundColor: '#f1f1f1' }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: !process.env.KROLL_SILENT,
    },
  })
  // KROLL_SILENT keeps automated test runs off the desktop.
  if (!process.env.KROLL_SILENT) win.once('ready-to-show', () => win.show())
  // Links leave the app for the system browser; the app never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
    closeCheatSheet()
  })
  mainWindow = win
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

/** Sends a presenter command to the Kroll window. */
function demo(command: DemoCommand): () => void {
  return () => mainWindow?.webContents.send('demo:command', command)
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Demo',
      submenu: [
        // The renderer handles these keys itself, so the menu only shows them.
        { label: 'Start Walkthrough', click: demo('guide') },
        { label: 'Show or Hide Presenter', accelerator: 'CmdOrCtrl+,', registerAccelerator: false, click: demo('settings') },
        { label: 'Cheat Sheet', accelerator: 'F1', registerAccelerator: false, click: () => openCheatSheet() },
        { type: 'separator' },
        { label: 'Restart Demo', click: demo('restart') },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Check for Updates…', click: () => checkForUpdatesNow() },
        { label: 'Releases on GitHub', click: () => void shell.openExternal('https://github.com/dw2lam/telus-kroll-translation/releases') },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = mainWindow
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.davidlam.krolllabel')
    buildMenu()
    registerLabelIpc()
    registerCheatSheetIpc(() => mainWindow)
    setUpAutoUpdates()
    createWindow()
    app.on('activate', () => {
      if (!mainWindow) createWindow()
    })
  })
  app.on('window-all-closed', () => {
    if (!isMac) app.quit()
  })
}
