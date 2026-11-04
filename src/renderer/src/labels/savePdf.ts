import { languageByCode } from '@/data/languages'
import type { PrintJob } from '@/flow/state'

/** Asks the main process to save the job's panels as a 4-inch PDF. Resolves to the saved path, or null. */
export async function saveLabelPdf(job: PrintJob): Promise<string | null> {
  const panels: ('1' | '2')[] = job.translation ? ['1', '2'] : ['1']
  const language = job.translation ? ` — ${languageByCode(job.translation.language).name}` : ''
  return (await window.kroll?.saveLabelPdf(JSON.stringify(job), panels, `Rx1000051 label${language}`)) ?? null
}
