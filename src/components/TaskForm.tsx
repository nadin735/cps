import { useState } from 'react'
import type { Task } from '../types'
import { Dict } from '../i18n'

interface Props {
  initial: Task | null
  allTasks: Task[]
  onSave: (t: Task) => void
  onCancel: () => void
  t: Dict
}

export default function TaskForm({ initial, allTasks, onSave, onCancel, t }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [duration, setDuration] = useState(initial?.duration ?? 3)
  const [deps, setDeps] = useState<string[]>(initial?.dependencies ?? [])

  const candidateDeps = allTasks.filter((x) => x.id !== initial?.id)

  // BUGFIX: previously any task could be picked as a dependency while
  // editing, including one that already (directly or transitively)
  // depends on the task being edited, which silently creates a cycle. The
  // app already detects cycles after the fact and shows a generic warning,
  // but by then there is no indication of which edit caused it. This
  // computes every task downstream of the one being edited (everything
  // that depends on it, at any distance) and disables those specific
  // options, since selecting one would create a cycle.
  const descendantIds = new Set<string>()
  if (initial) {
    const queue = [initial.id]
    while (queue.length) {
      const current = queue.shift()!
      for (const candidate of allTasks) {
        if (candidate.dependencies.includes(current) && !descendantIds.has(candidate.id)) {
          descendantIds.add(candidate.id)
          queue.push(candidate.id)
        }
      }
    }
  }

  const toggleDep = (id: string) => {
    if (descendantIds.has(id)) return
    setDeps((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface2 border border-edge rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl backdrop-blur-sm">
        <h2 className="font-display text-lg font-semibold mb-4 text-gold-400">
          {initial ? t.editTask : t.addTask}
        </h2>

        <label className="block mb-4">
          <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.name}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.duration}</span>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
            className="w-full mt-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
          />
        </label>

        <div className="mb-6">
          <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.dependencies}</span>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 border border-edge rounded p-2">
            {candidateDeps.length === 0 && (
              <p className="text-xs text-ink3 py-2">{t.noDependencies}</p>
            )}
            {candidateDeps.map((c) => {
              const disabled = descendantIds.has(c.id)
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={disabled ? t.wouldCreateCycle : undefined}
                >
                  <input
                    type="checkbox"
                    checked={deps.includes(c.id)}
                    disabled={disabled}
                    onChange={() => toggleDep(c.id)}
                    className="accent-gold-500"
                  />
                  {c.name}
                  {disabled && <span className="text-[10px] text-ink3 font-mono">({t.wouldCreateCycle})</span>}
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink">
            {t.cancel}
          </button>
          <button
            onClick={() =>
              onSave({
                id: initial?.id ?? crypto.randomUUID(),
                name: name.trim() || 'Untitled',
                duration,
                dependencies: deps,
              })
            }
            className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
