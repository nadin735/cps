import { useEffect, useMemo, useState } from 'react'
import type { Task } from '../types'
import { computeCPM } from '../utils/cpm'
import { Dict } from '../i18n'

interface Props {
  tasks: Task[]
  baseProjectDuration: number
  onApply: (taskId: string, newDuration: number) => void
  t: Dict
}

export default function WhatIfPanel({ tasks, baseProjectDuration, onApply, t }: Props) {
  const [taskId, setTaskId] = useState<string>(tasks[0]?.id ?? '')
  const task = tasks.find((x) => x.id === taskId)
  const [simDuration, setSimDuration] = useState<number>(task?.duration ?? 1)

  // BUGFIX: taskId/simDuration were only ever initialized once, at mount.
  // If the app starts with zero tasks (typical first run) and tasks arrive
  // later via "Load sample data" or a PDF import, the initial useState value
  // never updates on its own, so the dropdown looked selected but the
  // underlying state stayed empty and the slider default was wrong. This
  // effect re-syncs whenever the currently selected task no longer exists
  // in the list (including "doesn't exist yet").
  useEffect(() => {
    if (tasks.length === 0) return
    const stillExists = tasks.some((x) => x.id === taskId)
    if (!stillExists) {
      setTaskId(tasks[0].id)
      setSimDuration(tasks[0].duration)
    }
  }, [tasks, taskId])

  // Re-sync the slider when the selected task changes.
  const handleSelect = (id: string) => {
    setTaskId(id)
    const found = tasks.find((x) => x.id === id)
    setSimDuration(found?.duration ?? 1)
  }

  const simulated = useMemo(() => {
    if (!task) return null
    const modified = tasks.map((x) => (x.id === task.id ? { ...x, duration: simDuration } : x))
    return computeCPM(modified)
  }, [tasks, task, simDuration])

  if (tasks.length === 0) return null

  const delta = simulated ? simulated.projectDuration - baseProjectDuration : 0
  const willBeCritical = simulated?.results[taskId]?.critical

  return (
    <div className="bg-surface2 border border-edge rounded-lg p-4">
      <h3 className="font-display font-semibold text-gold-400 mb-1">{t.whatIf}</h3>
      <p className="text-xs text-ink3 mb-4">{t.whatIfHint}</p>

      <label className="block mb-3">
        <span className="text-xs font-mono text-ink2 uppercase tracking-wide">{t.selectTask}</span>
        <select
          value={taskId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full mt-1 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
        >
          {tasks.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block mb-4">
        <span className="text-xs font-mono text-ink2 uppercase tracking-wide">
          {t.simulatedDuration}: {simDuration} {t.days}
        </span>
        <input
          type="range"
          min={1}
          max={Math.max(20, (task?.duration ?? 1) * 3)}
          value={simDuration}
          onChange={(e) => setSimDuration(Number(e.target.value))}
          className="w-full mt-2 accent-gold-500"
        />
      </label>

      <div className="rounded-md border border-edge bg-field p-3 mb-4">
        <p className="text-xs font-mono text-ink2 uppercase tracking-wide mb-1">{t.impact}</p>
        {delta === 0 && <p className="text-sm text-silver-300">{t.noImpact}</p>}
        {delta > 0 && (
          <p className="text-sm text-gold-300 font-mono">
            {t.delaysBy} {delta} {t.days}
          </p>
        )}
        {delta < 0 && (
          <p className="text-sm text-silver-300 font-mono">
            {t.speedsUpBy} {Math.abs(delta)} {t.days}
          </p>
        )}
        <p className="text-xs text-ink3 mt-1">{willBeCritical ? t.becomesCritical : t.staysNonCritical}</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => task && onApply(task.id, simDuration)}
          disabled={!task || simDuration === task.duration}
          className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t.apply}
        </button>
        <button
          onClick={() => task && setSimDuration(task.duration)}
          className="px-4 py-2 text-sm font-mono text-ink2 hover:text-ink"
        >
          {t.reset}
        </button>
      </div>
    </div>
  )
}
