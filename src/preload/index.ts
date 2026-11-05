import { contextBridge, ipcRenderer } from 'electron'
import type { DemoCommand, KrollBridge } from '../shared/api'

const bridge: KrollBridge = {
  platform: process.platform,
  onDemoCommand: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, command: DemoCommand): void => listener(command)
    ipcRenderer.on('demo:command', handler)
    return () => ipcRenderer.removeListener('demo:command', handler)
  },
  renderLabel: (request, scale) => ipcRenderer.invoke('label:render', request, scale),
  saveLabelPdf: (job, panels, suggestedName) => ipcRenderer.invoke('label:savePdf', job, panels, suggestedName),
  saveCheatSheetPdf: () => ipcRenderer.invoke('cheatsheet:savePdf'),
  openCheatSheet: () => ipcRenderer.send('cheatsheet:open'),
  checkForUpdates: () => ipcRenderer.send('updates:check'),
  loadScenario: (language, sig) => ipcRenderer.send('cheatsheet:load', language, sig),
  onLoadScenario: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, language: string, sig: string): void => listener(language, sig)
    ipcRenderer.on('demo:load', handler)
    return () => ipcRenderer.removeListener('demo:load', handler)
  },
}

contextBridge.exposeInMainWorld('kroll', bridge)
