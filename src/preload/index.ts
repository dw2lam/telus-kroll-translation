import { contextBridge, ipcRenderer } from 'electron'
import type { KrollBridge } from '../shared/api'

const bridge: KrollBridge = {
  platform: process.platform,
  renderLabel: (request, scale) => ipcRenderer.invoke('label:render', request, scale),
  saveLabelPdf: (job, panels, suggestedName) => ipcRenderer.invoke('label:savePdf', job, panels, suggestedName),
  saveCheatSheetPdf: () => ipcRenderer.invoke('cheatsheet:savePdf'),
}

contextBridge.exposeInMainWorld('kroll', bridge)
