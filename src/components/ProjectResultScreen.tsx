import { useMemo, useState } from 'react'
import type { Project, Task } from '../types'
import { computeCPM } from '../utils/cpm'
import { buildAnalysis, SEVERITY_COLOR } from '../utils/recommend'
import { buildCorridor, buildOptimizedCurve } from '../utils/corridor'
import { exportTasksAsCsv } from '../utils/csvExport'
import { Dict, Lang } from '../i18n'
import NetworkDiagram from './NetworkDiagram'
import TaskTable from './TaskTable'
import TaskForm from './TaskForm'
import WhatIfPanel from './WhatIfPanel'
import ScheduleCorridorChart from './ScheduleCorridorChart'
import ConfidenceForecast from './ConfidenceForecast'
import TargetDateSimulator from './TargetDateSimulator'
import AddProjectModal from './AddProjectModal'
import { StatusBadge } from './PortfolioDashboard'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  project: Project
  allProjects: Project[]
  rtl: boolean
  lang: Lang
  onSave: (tasks: Task[]) => void
  onBack: () => void
  t: Dict
}

const SEVERITY_LABEL_KEY = { healthy: 'severityHealthy', watch: 'severityWatch', critical: 'severityCritical' } as const

export default function ProjectResultScreen({ project, allProjects, rtl, lang, onSave, onBack, t }: Props) {
  const [tasks, setTasks] = useState<Task[]>(project.tasks)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [showAddPdf, setShowAddPdf] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null)
  const [analysisRun, setAnalysisRun] = useState(false)

  const cpm = useMemo(() => computeCPM(tasks), [tasks])
  const analysis = useMemo(() => (analysisRun ? buildAnalysis(tasks, cpm, t, lang) : null), [analysisRun, tasks, cpm, t, lang])

  const criticalTasks = tasks.filter((tk) => cpm.results[tk.id]?.critical)
  const totalFloat = tasks.reduce((sum, tk) => sum + Math.max(0, cpm.results[tk.id]?.float ?? 0), 0)
  const bottleneck = [...criticalTasks].sort((a, b) => b.duration - a.duration)[0]

  const corridor = useMemo(() => buildCorridor(tasks, cpm), [tasks, cpm])
  const optimizedCurve = useMemo(() => {
    if (!analysis || !bottleneck) return undefined
    const shrink = Math.max(1, Math.round(bottleneck.duration * 0.2))
    const optimizedTasks = tasks.map((tk) => (tk.id === bottleneck.id ? { ...tk, duration: Math.max(1, tk.duration - shrink) } : tk))
    const optimizedCpm = computeCPM(optimizedTasks)
    if (optimizedCpm.hasCycle) return undefined
    return buildOptimizedCurve(optimizedTasks, optimizedCpm, cpm.projectDuration)
  }, [analysis, bottleneck, tasks, cpm.projectDuration])

  const markDirty = () => setDirty(true)

  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.some((x) => x.id === task.id)
      return exists ? prev.map((x) => (x.id === task.id ? task : x)) : [...prev, task]
    })
    setFormOpen(false)
    setEditing(null)
    markDirty()
  }

  const handleDelete = (id: string) => {
    setPendingDeleteTaskId(id)
  }

  const confirmDeleteTask = () => {
    if (!pendingDeleteTaskId) return
    const id = pendingDeleteTaskId
    setTasks((prev) => prev.filter((x) => x.id !== id).map((x) => ({ ...x, dependencies: x.dependencies.filter((d) => d !== id) })))
    setPendingDeleteTaskId(null)
    markDirty()
  }

  const handleApplyWhatIf = (taskId: string, newDuration: number) => {
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, duration: newDuration } : x)))
    markDirty()
  }

  const handleApplyCrashPlan = (steps: { taskId: string; newDuration: number }[]) => {
    const byId = new Map(steps.map((s) => [s.taskId, s.newDuration]))
    setTasks((prev) => prev.map((x) => (byId.has(x.id) ? { ...x, duration: byId.get(x.id)! } : x)))
    markDirty()
  }

  const barMax = Math.max(cpm.projectDuration, 1)

  return (
    <div>
      <button onClick={onBack} className="text-xs font-mono text-ink2 hover:text-gold-400 mb-4 no-print">
        ← {t.backToPortfolio}
      </button>

      <div className="print-only mb-4">
        <p className="text-xs font-mono text-ink3">{t.printGeneratedOn} {new Date().toLocaleDateString()}</p>
      </div>

      <p className="text-xs font-mono text-ink3 uppercase tracking-wide mb-1">
        {t.durationLabel}: {cpm.hasCycle ? '—' : `${cpm.projectDuration} ${t.days}`}
      </p>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">{project.name}</h2>
        <StatusBadge tasks={tasks} cpm={cpm} t={t} />
      </div>
      <div className="h-px bg-gold-500 mb-6" />

      {cpm.hasCycle ? (
        <div className="mb-6">
          <NetworkDiagram tasks={tasks} cpm={cpm} selectedId={selectedId} onSelect={setSelectedId} t={t} rtl={rtl} />
        </div>
      ) : (
        <>
          {/* stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="border border-edge bg-surface2 rounded-lg p-4">
              <p className="text-[10px] font-mono text-ink3 uppercase tracking-wide">{t.statDuration}</p>
              <p className="font-mono text-2xl font-bold text-ink mt-1">{cpm.projectDuration} <span className="text-sm font-normal text-ink3">{t.days}</span></p>
            </div>
            <div className="border border-edge bg-surface2 rounded-lg p-4">
              <p className="text-[10px] font-mono text-ink3 uppercase tracking-wide">{t.statCritical}</p>
              <p className="font-mono text-2xl font-bold text-ink mt-1">{criticalTasks.length}<span className="text-sm font-normal text-ink3">/{tasks.length}</span></p>
            </div>
            <div className="border border-edge bg-surface2 rounded-lg p-4">
              <p className="text-[10px] font-mono text-ink3 uppercase tracking-wide">{t.statFloat}</p>
              <p className="font-mono text-2xl font-bold text-ink mt-1">{totalFloat} <span className="text-sm font-normal text-ink3">{t.days}</span></p>
            </div>
            <div className="border border-edge bg-surface2 rounded-lg p-4">
              <p className="text-[10px] font-mono text-ink3 uppercase tracking-wide">{t.statBottleneck}</p>
              <p className="font-mono text-lg font-bold text-gold-400 mt-1 truncate">{bottleneck?.name ?? '—'}</p>
              <p className="text-xs text-ink3 font-mono">{bottleneck?.duration ?? 0} {t.days}</p>
            </div>
          </div>

          {/* info banner */}
          <div className="border border-edge bg-surface2 rounded-lg px-4 py-3 mb-6 flex items-start gap-2.5 text-sm text-ink2">
            <span className="text-gold-400">↗</span>
            <span>
              {criticalTasks.length} {t.bannerText1} {tasks.length} {t.bannerText2}
            </span>
          </div>

          {/* recommendations panel */}
          <div className="border border-edge bg-surface2 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-display font-semibold text-ink">{t.recommendationsTitle}</h3>
              <button
                onClick={() => setAnalysisRun(true)}
                className="px-3 py-1.5 text-xs font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500 flex items-center gap-1.5"
              >
                ↗ {analysisRun ? t.tryAgain : t.recommendationsTitle}
              </button>
            </div>

            {!analysis && <p className="text-sm text-ink3">{t.noAnalysisYet}</p>}

            {analysis && (
              <div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono mb-4"
                  style={{ backgroundColor: `${SEVERITY_COLOR[analysis.severity]}22`, color: SEVERITY_COLOR[analysis.severity] }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[analysis.severity] }} />
                  {t[SEVERITY_LABEL_KEY[analysis.severity]]}
                </span>

                <h4 className="font-display font-semibold text-ink mb-2">{analysis.heading}</h4>
                <p className="text-sm text-ink2 leading-relaxed mb-4">{analysis.body}</p>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-28 shrink-0 text-ink2">{t.withoutChanges}</span>
                    <div className="flex-1 h-2 bg-field rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${Math.min(100, (analysis.currentDays / (barMax * 1.15)) * 100)}%`, backgroundColor: '#B23A32' }} />
                    </div>
                    <span className="w-20 text-right text-ink">{analysis.currentDays} {t.days}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-28 shrink-0 text-ink2">{t.withTips}</span>
                    <div className="flex-1 h-2 bg-field rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${Math.min(100, (analysis.optimizedDays / (barMax * 1.15)) * 100)}%`, backgroundColor: '#4F8F6B' }} />
                    </div>
                    <span className="w-20 text-right text-ink">{analysis.optimizedDays} {t.days}</span>
                  </div>
                </div>

                <h4 className="font-display font-semibold text-ink mb-2">{t.tipsTitle}</h4>
                <div className="space-y-3 mb-5">
                  {analysis.tips.map((tip, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-gold-400 font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-ink2 leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>

                <h4 className="font-display font-semibold text-ink mb-2">{t.outlookTitle}</h4>
                <p className="text-sm text-ink2 leading-relaxed">{analysis.outlook}</p>
              </div>
            )}
          </div>

          {/* target date simulator: the "what if we need to hit deadline X" tool */}
          <TargetDateSimulator tasks={tasks} currentDuration={cpm.projectDuration} onApplyPlan={handleApplyCrashPlan} t={t} />

          {/* schedule corridor chart */}
          <div className="border border-edge bg-surface2 rounded-lg p-5 mb-6">
            <h3 className="font-display font-semibold text-ink mb-4">{t.corridorTitle}</h3>
            <ScheduleCorridorChart points={corridor} optimized={analysisRun ? optimizedCurve : undefined} totalTasks={tasks.length} t={t} />
          </div>

          {/* Monte Carlo / PERT confidence forecast */}
          <ConfidenceForecast tasks={tasks} t={t} />

          {/* critical path breakdown */}
          <div className="border border-edge bg-surface2 rounded-lg p-5 mb-6">
            <h3 className="font-display font-semibold text-ink mb-4">{t.breakdownTitle}</h3>
            <div className="space-y-4">
              {[...tasks].sort((a, b) => (cpm.results[a.id]?.es ?? 0) - (cpm.results[b.id]?.es ?? 0)).map((tk) => {
                const r = cpm.results[tk.id]
                if (!r) return null
                const startPct = (r.es / barMax) * 100
                const widthPct = (tk.duration / barMax) * 100
                const lfPct = (r.lf / barMax) * 100
                return (
                  <div key={tk.id} className="flex items-center gap-4 text-sm">
                    <span className="w-40 shrink-0 text-ink truncate">{tk.name}</span>
                    <div className="flex-1 h-2.5 bg-field rounded-full relative">
                      <div
                        className="h-full rounded-full absolute"
                        style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 1.5)}%`, backgroundColor: r.critical ? '#D4AF37' : '#9C9C96' }}
                      />
                      {!r.critical && (
                        <div className="absolute top-[-3px] w-0.5 h-4 bg-ink3" style={{ left: `${lfPct}%` }} />
                      )}
                    </div>
                    <span className="w-24 text-right font-mono text-ink3 text-xs shrink-0">
                      {r.es}–{r.ef} {t.days}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
        <button
          onClick={() => {
            onSave(tasks)
            setDirty(false)
          }}
          className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold"
        >
          {dirty ? t.saveChanges : t.savedToPortfolio}
        </button>
        <button
          onClick={() => setShowAddPdf(true)}
          className="px-4 py-2 text-sm font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500"
        >
          {t.addMorePdf}
        </button>
        <button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="px-4 py-2 text-sm font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500"
        >
          + {t.addTask}
        </button>
        <div className="ml-auto flex gap-3">
          <button
            onClick={() => exportTasksAsCsv(project.name, tasks, cpm)}
            disabled={tasks.length === 0}
            className="px-4 py-2 text-sm font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500 disabled:opacity-30"
          >
            {t.exportCsv}
          </button>
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-xs font-mono text-ink2 hover:text-gold-400 underline mb-6 block no-print"
      >
        ← {t.backToPortfolio}
      </button>

      {/* supplementary detail: network diagram + what-if + table */}
      {!cpm.hasCycle && tasks.length > 0 && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mb-6 no-print">
          <NetworkDiagram tasks={tasks} cpm={cpm} selectedId={selectedId} onSelect={setSelectedId} t={t} rtl={rtl} />
          <WhatIfPanel tasks={tasks} baseProjectDuration={cpm.projectDuration} onApply={handleApplyWhatIf} t={t} />
        </div>
      )}

      <div className="border border-edge bg-surface2 rounded-lg p-4">
        <TaskTable
          tasks={tasks}
          cpm={cpm}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={(id) => {
            const task = tasks.find((x) => x.id === id)
            if (task) {
              setEditing(task)
              setFormOpen(true)
            }
          }}
          onDelete={handleDelete}
          t={t}
        />
      </div>

      {formOpen && (
        <TaskForm
          initial={editing}
          allTasks={tasks}
          onSave={handleSaveTask}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          t={t}
        />
      )}

      {showAddPdf && (
        <AddProjectModal
          projects={allProjects}
          initialTargetId={project.id}
          onClose={() => setShowAddPdf(false)}
          onComplete={(imported) => {
            setTasks((prev) => [...prev, ...imported])
            setShowAddPdf(false)
            markDirty()
          }}
          t={t}
        />
      )}

      {pendingDeleteTaskId && (
        <ConfirmDialog
          message={t.confirmDelete}
          danger
          onConfirm={confirmDeleteTask}
          onCancel={() => setPendingDeleteTaskId(null)}
          t={t}
        />
      )}
    </div>
  )
}
