import { useRef, useState } from 'react'
import type { Project, Task } from '../types'
import { extractPdfText, parseTaskLines, ParsedRow } from '../utils/pdfParser'
import { Dict } from '../i18n'

interface Props {
  projects: Project[]
  initialTargetId?: string
  onClose: () => void
  onComplete: (tasks: Task[], targetProjectId: string | null, pdfName: string | null) => void
  t: Dict
}

interface EditableRow extends ParsedRow {
  id: string
  include: boolean
}

type Step = 'target' | 'method' | 'scanning' | 'review' | 'manual'

export default function AddProjectModal({ projects, initialTargetId, onClose, onComplete, t }: Props) {
  const [step, setStep] = useState<Step>(initialTargetId ? 'method' : projects.length > 0 ? 'target' : 'method')
  const [targetId, setTargetId] = useState<string>(initialTargetId ?? 'new')
  const [readError, setReadError] = useState(false)
  const [rows, setRows] = useState<EditableRow[] | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // manual entry draft
  const [manualTasks, setManualTasks] = useState<Task[]>([])
  const [manualName, setManualName] = useState('')
  const [manualDuration, setManualDuration] = useState(1)
  const [manualDeps, setManualDeps] = useState<string[]>([])

  const handleFile = async (file: File) => {
    setStep('scanning')
    setReadError(false)
    setPdfName(file.name)
    try {
      const text = await extractPdfText(file)
      const parsed = parseTaskLines(text)
      setRows(parsed.map((p, i) => ({ ...p, id: `scan-${i}`, include: true })))
      setStep('review')
    } catch {
      setReadError(true)
      setRows([])
      setStep('review')
    }
  }

  const knownNames = new Set((rows ?? []).filter((r) => r.include).map((r) => r.name.toLowerCase()))
  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev))
  }

  const totalDuration = (rows ?? []).filter((r) => r.include).reduce((sum, r) => sum + r.duration, 0)

  const confirmImport = () => {
    if (!rows) return
    const included = rows.filter((r) => r.include)
    // BUGFIX: row ids were always "scan-0", "scan-1", ... regardless of how
    // many times a PDF gets scanned. Scanning a second PDF into a project
    // that already has tasks from a first scan produced duplicate ids,
    // silently breaking CPM (id-keyed maps overwrite), React keys, the
    // diagram, and the table. Final task ids are now generated fresh here,
    // dependency resolution still happens against the original row ids
    // within this batch, then gets remapped to the new unique ids.
    const idByName = new Map(included.map((r) => [r.name.toLowerCase(), r.id]))
    const finalIdByOriginal = new Map(included.map((r) => [r.id, crypto.randomUUID()]))
    const tasks: Task[] = included.map((r) => ({
      id: finalIdByOriginal.get(r.id)!,
      name: r.name,
      duration: r.duration,
      dependencies: r.dependencyNames
        .map((d) => idByName.get(d.toLowerCase()))
        .filter((x): x is string => Boolean(x))
        .map((originalId) => finalIdByOriginal.get(originalId)!),
    }))
    onComplete(tasks, targetId === 'new' ? null : targetId, pdfName)
  }

  const addManualTask = () => {
    if (!manualName.trim()) return
    setManualTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: manualName.trim(), duration: manualDuration, dependencies: manualDeps },
    ])
    setManualName('')
    setManualDuration(1)
    setManualDeps([])
  }

  const removeManualTask = (id: string) => {
    setManualTasks((prev) => prev.filter((x) => x.id !== id).map((x) => ({ ...x, dependencies: x.dependencies.filter((d) => d !== id) })))
  }

  const toggleManualDep = (id: string) => {
    setManualDeps((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const confirmManual = () => {
    onComplete(manualTasks, targetId === 'new' ? null : targetId, null)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface2 border border-edge rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-ink">{t.addProjectModalTitle}</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        {step === 'target' && (
          <div>
            <label className="block mb-6">
              <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.whichProject}</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full mt-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
              >
                <option value="new">{t.createNewProject}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink">
                {t.cancel}
              </button>
              <button
                onClick={() => setStep('method')}
                className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold"
              >
                {t.continueLabel}
              </button>
            </div>
          </div>
        )}

        {step === 'method' && (
          <div>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-gold-500/50 rounded-lg py-10 flex flex-col items-center gap-3 hover:border-gold-500 transition-colors"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.8">
                <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-gold-400 font-medium text-sm">{t.choosePdf}</span>
              <span className="text-ink3 text-xs">{t.choosePdfHint}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />

            <button onClick={() => setStep('manual')} className="text-xs font-mono text-ink2 hover:text-gold-400 mt-4">
              {t.enterManually}
            </button>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => (initialTargetId ? onClose() : setStep(projects.length > 0 ? 'target' : 'method'))}
                className="px-4 py-2 text-sm font-mono border border-fieldEdge rounded text-ink2 hover:text-ink"
              >
                {t.back}
              </button>
            </div>
          </div>
        )}

        {step === 'scanning' && (
          <div className="py-10 flex items-center justify-center gap-3">
            <span className="inline-block w-5 h-5 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
            <span className="text-ink2 text-sm">{t.analyzingPdf}</span>
          </div>
        )}

        {step === 'review' && rows && rows.length === 0 && (
          <div>
            <p className="text-sm text-ink2 py-4">{readError ? t.pdfReadError : t.pdfNoMatches}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('method')} className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink">
                {t.back}
              </button>
            </div>
          </div>
        )}

        {step === 'review' && rows && rows.length > 0 && (
          <div>
            <p className="text-xs text-ink2 mb-3 flex items-center gap-1.5">
              <span className="text-gold-400">▤</span> {rows.length} {t.itemsDetected}
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2 mb-4">
              {rows.map((r) => {
                const unresolved = r.dependencyNames.filter((d) => !knownNames.has(d.toLowerCase()))
                return (
                  <div key={r.id} className="border border-edge rounded-md p-2.5 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                      className="mt-1.5 accent-gold-500"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        value={r.name}
                        onChange={(e) => updateRow(r.id, { name: e.target.value })}
                        className="w-full bg-field border border-fieldEdge rounded px-2 py-1 text-sm text-ink mb-1"
                      />
                      <div className="flex items-center gap-2 text-xs text-ink3">
                        <span>{t.duration}:</span>
                        <input
                          type="number"
                          min={1}
                          value={r.duration}
                          onChange={(e) => updateRow(r.id, { duration: Math.max(1, Number(e.target.value)) })}
                          className="w-16 bg-field border border-fieldEdge rounded px-1.5 py-0.5 text-ink"
                        />
                        {r.dependencyNames.length > 0 && (
                          <span className="truncate">
                            {t.dependencies}: {r.dependencyNames.join(', ')}
                          </span>
                        )}
                      </div>
                      {unresolved.length > 0 && (
                        <p className="text-[11px] text-gold-400/80 mt-1">
                          {t.pdfUnresolvedDep}: {unresolved.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink2 font-mono">
                {t.estimatedTotal}: {totalDuration} {t.days}
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink">
                  {t.cancel}
                </button>
                <button
                  onClick={confirmImport}
                  className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold"
                >
                  {t.pdfConfirmImport}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder={t.name}
                className="flex-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
              />
              <input
                type="number"
                min={1}
                value={manualDuration}
                onChange={(e) => setManualDuration(Math.max(1, Number(e.target.value)))}
                className="w-20 bg-field border border-fieldEdge rounded px-2 py-2 text-sm text-ink"
              />
            </div>

            {manualTasks.length > 0 ? (
              <div className="mb-3">
                <span className="text-xs font-mono text-ink2 uppercase tracking-wide block mb-2">{t.dependencies}</span>
                <div className="flex flex-wrap gap-2">
                  {manualTasks.map((mt) => (
                    <label
                      key={mt.id}
                      className="flex items-center gap-1.5 text-xs border border-fieldEdge rounded-full px-2.5 py-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={manualDeps.includes(mt.id)}
                        onChange={() => toggleManualDep(mt.id)}
                        className="accent-gold-500"
                      />
                      {mt.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink3 mb-3">{t.manualFirstTaskHint}</p>
            )}

            <button
              onClick={addManualTask}
              className="px-3 py-2 text-sm font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500 mb-4"
            >
              + {t.addTask}
            </button>

            {manualTasks.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {manualTasks.map((mt) => {
                  const depNames = mt.dependencies.map((id) => manualTasks.find((x) => x.id === id)?.name).filter(Boolean)
                  return (
                    <div key={mt.id} className="flex items-center justify-between gap-3 text-sm border border-edge rounded px-3 py-1.5">
                      <div className="min-w-0">
                        <span className="text-ink">{mt.name}</span>
                        {depNames.length > 0 && (
                          <span className="block text-[11px] text-ink3 truncate">
                            {t.dependencies}: {depNames.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-ink3 font-mono text-xs">
                          {mt.duration} {t.days}
                        </span>
                        <button onClick={() => removeManualTask(mt.id)} className="text-ink3 hover:text-ink text-xs font-mono">
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('method')} className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink">
                {t.back}
              </button>
              <button
                onClick={confirmManual}
                disabled={manualTasks.length === 0}
                className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold disabled:opacity-30"
              >
                {t.pdfConfirmImport}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
