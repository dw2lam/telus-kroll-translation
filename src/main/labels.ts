import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LabelRequest } from '../shared/api'

/** Label panels are laid out 576 CSS px wide, like the Figma label frames; on paper that is 4 inches. */
const PANEL_CSS_WIDTH = 576
const PANEL_INCHES = 4

export function loadPage(win: BrowserWindow, hash: string): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) return win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  return win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
}

/** Waits until the page says its fonts are in and the panel is laid out, then returns the panel's CSS size. */
async function waitForLabel(win: BrowserWindow): Promise<{ width: number; height: number }> {
  for (let i = 0; i < 100; i++) {
    const size = await win.webContents.executeJavaScript('window.__labelReady ?? null')
    if (size) return size
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error('label page did not finish rendering')
}

function hashFor(params: Record<string, string>): string {
  return 'render?' + new URLSearchParams(params).toString()
}

async function askForPdfPath(owner: BrowserWindow | null, name: string): Promise<string | null> {
  const options = {
    title: 'Save as PDF',
    defaultPath: join(app.getPath('documents'), name.replace(/[\\/:*?"<>|]/g, '-') + '.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  }
  const { canceled, filePath } = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
  return canceled || !filePath ? null : filePath
}

export function registerLabelIpc(): void {
  ipcMain.handle('cheatsheet:savePdf', async (event) => {
    const filePath = await askForPdfPath(BrowserWindow.fromWebContents(event.sender), 'Telus Kroll Translation Demo cheat sheet')
    if (!filePath) return null
    const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { sandbox: true, contextIsolation: true } })
    try {
      await loadPage(win, 'cheatsheet')
      for (let i = 0; i < 100 && !(await win.webContents.executeJavaScript('window.__pageReady === true')); i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
      const pdf = await win.webContents.printToPDF({
        landscape: true,
        pageSize: 'Letter',
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        printBackground: true,
      })
      await writeFile(filePath, pdf)
      return filePath
    } finally {
      win.destroy()
    }
  })

  ipcMain.handle('label:render', async (_event, request: LabelRequest, scale: number) => {
    const win = new BrowserWindow({
      show: false,
      width: Math.ceil(PANEL_CSS_WIDTH * scale) + 4,
      height: Math.ceil(420 * scale),
      useContentSize: true,
      webPreferences: { offscreen: true, sandbox: true, contextIsolation: true },
    })
    try {
      await loadPage(win, hashFor({ job: request.job, panels: request.panel, zoom: String(scale) }))
      const { width, height } = await waitForLabel(win)
      win.webContents.invalidate()
      await new Promise((r) => setTimeout(r, 60))
      const image = await win.webContents.capturePage({ x: 0, y: 0, width: Math.ceil(width * scale), height: Math.ceil(height * scale) })
      return { dataUrl: image.toDataURL(), width, height }
    } finally {
      win.destroy()
    }
  })

  ipcMain.handle('label:savePdf', async (event, job: string, panels: ('1' | '2')[], suggestedName: string) => {
    const filePath = await askForPdfPath(BrowserWindow.fromWebContents(event.sender), suggestedName)
    if (!filePath) return null
    const zoom = (PANEL_INCHES * 96) / PANEL_CSS_WIDTH
    const win = new BrowserWindow({ show: false, width: 800, height: 1000, webPreferences: { sandbox: true, contextIsolation: true } })
    try {
      await loadPage(win, hashFor({ job, panels: panels.join(','), zoom: String(zoom), pdf: '1' }))
      const { height } = await waitForLabel(win)
      const pdf = await win.webContents.printToPDF({
        // Every panel gets a page as tall as the tallest one.
        pageSize: { width: PANEL_INCHES, height: Math.max(1, (height * zoom) / 96 + 0.02) },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
      })
      await writeFile(filePath, pdf)
      return filePath
    } finally {
      win.destroy()
    }
  })
}
