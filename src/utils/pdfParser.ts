import * as pdfjsLib from 'pdfjs-dist'
// @ts-ignore - Vite-specific asset URL import for the pdf.js worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// pdf.js prints an internal "Setting up fake worker" notice whenever it
// falls back to processing a PDF on the main thread instead of a
// background worker. This is a known, harmless pdf.js behavior, not an
// error and not something this app's own code produces, PDF scanning
// still works correctly either way. It is filtered here purely so it
// doesn't show up as an alarming-looking line in the browser console.
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Setting up fake worker')) return
  originalWarn(...args)
}

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // BUGFIX: this used to join every text item on the page with a single
    // space, with no regard for line breaks. pdf.js does not hand back
    // paragraph or row breaks on its own, a real multi-row project plan
    // would have collapsed into one giant unparsable line. This groups
    // items into lines by comparing the vertical (y) position of each
    // text run's transform matrix, the standard technique for
    // reconstructing line breaks from pdf.js text content.
    let lastY: number | null = null
    let line = ''
    for (const raw of content.items) {
      if (!('str' in raw)) continue
      const item = raw as { str: string; transform: number[] }
      const y = item.transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += line.trim() + '\n'
        line = ''
      }
      line += item.str + ' '
      lastY = y
    }
    text += line.trim() + '\n'
  }
  return text
}

export interface ParsedRow {
  rawLine: string
  name: string
  duration: number
  dependencyNames: string[]
}

// Heuristic, tolerant parser. It is intentionally not a strict format, since
// PDFs exported from different tools (Excel, Word, project software) all
// lay out text slightly differently once pdf.js flattens it to a text
// stream. It tries a few common shapes per line and keeps whatever matches.
// The UI always shows the result for human review before anything is
// applied, the parser's job is to get close, not to be perfectly correct.
export function parseTaskLines(rawText: string): ParsedRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const rows: ParsedRow[] = []

  // Shape A: delimiter separated "Name ; Duration ; Dep1, Dep2"
  const delimiterPattern = /^(.{2,80}?)\s*[;|\t]\s*(\d{1,3})\s*(?:[;|\t]\s*(.*))?$/

  // Shape B: "Name 5 Tage (Dep1, Dep2)" or "Name - 5 days - Dep1, Dep2"
  const inlinePattern =
    /^(.{2,80}?)\s*[-–—]?\s*(\d{1,3})\s*(?:tage|days|أيام)?\s*(?:[-–—(]\s*([^)]*)\)?)?$/i

  for (const line of lines) {
    let match = line.match(delimiterPattern)
    let name = '',
      duration = 0,
      depsRaw = ''

    if (match) {
      name = match[1].trim()
      duration = parseInt(match[2], 10)
      depsRaw = (match[3] ?? '').trim()
    } else {
      match = line.match(inlinePattern)
      if (match) {
        name = match[1].trim()
        duration = parseInt(match[2], 10)
        depsRaw = (match[3] ?? '').trim()
      }
    }

    if (!name || !duration || duration <= 0 || duration > 365) continue
    // Skip lines that are almost certainly headers or noise.
    if (/^(name|task|vorgang|bezeichnung|المهمة|duration|dauer)$/i.test(name)) continue

    const dependencyNames = depsRaw
      .split(/[,،]/)
      .map((d) => d.trim())
      .filter((d) => d && !/^(none|keine|start|لا شيء)$/i.test(d))

    rows.push({ rawLine: line, name, duration, dependencyNames })
  }

  return rows
}
