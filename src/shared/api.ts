/** A label panel to rasterise or print: the page renders it from the URL hash. */
export interface LabelRequest {
  /** JSON of the renderer's PrintJob. */
  job: string
  panel: '1' | '2'
}

/** What the preload script exposes to the renderer as `window.kroll`. */
export interface KrollBridge {
  platform: string
  /** Renders a label panel offscreen at `scale`× and returns it as a PNG data URL with its CSS size. */
  renderLabel(request: LabelRequest, scale: number): Promise<{ dataUrl: string; width: number; height: number }>
  /** Saves the job's label panels as a PDF (one page per panel, 4 in wide). Resolves to the path, or null if cancelled. */
  saveLabelPdf(job: string, panels: ('1' | '2')[], suggestedName: string): Promise<string | null>
  /** Saves the cheat sheet as a landscape Letter PDF. Resolves to the path, or null if cancelled. */
  saveCheatSheetPdf(): Promise<string | null>
}
