/** A label panel to rasterise or print: the page renders it from the URL hash. */
export interface LabelRequest {
  /** JSON of the renderer's PrintJob. */
  job: string
  panel: '1' | '2'
}

/** Presenter commands sent from the native Demo menu. */
export type DemoCommand = 'guide' | 'settings' | 'restart' | 'zoomIn' | 'zoomOut' | 'zoomReset' | 'magnifier'

/** What the preload script exposes to the renderer as `window.kroll`. */
export interface KrollBridge {
  platform: string
  /** Subscribes to the native Demo menu. Returns the unsubscribe function. */
  onDemoCommand(listener: (command: DemoCommand) => void): () => void
  /** Renders a label panel offscreen at `scale`× and returns it as a PNG data URL with its CSS size. */
  renderLabel(request: LabelRequest, scale: number): Promise<{ dataUrl: string; width: number; height: number }>
  /** Saves the job's label panels as a PDF (one page per panel, 4 in wide). Resolves to the path, or null if cancelled. */
  saveLabelPdf(job: string, panels: ('1' | '2')[], suggestedName: string): Promise<string | null>
  /** Opens the cheat sheet in its own window, or brings it forward. */
  openCheatSheet(): void
  /** From the cheat-sheet window: loads this sig for a patient of this language into Kroll and runs it. */
  loadScenario(language: string, sig: string): void
  /** In the Kroll window: a cheat-sheet cell was clicked. Returns the unsubscribe function. */
  onLoadScenario(listener: (language: string, sig: string) => void): () => void
  /** Same as Help › Check for Updates…: the main process shows the result. */
  checkForUpdates(): void
  /** Saves one audit entry as JSON (PRD 2 disputes). Resolves to the path, or null if cancelled. */
  exportAuditEntry(json: string, suggestedName: string): Promise<string | null>
  /** Saves the cheat sheet as a landscape Letter PDF. Resolves to the path, or null if cancelled. */
  saveCheatSheetPdf(): Promise<string | null>
}
