import { useMemo } from 'react'
import type { Task, CPMOutput } from '../types'
import { Dict } from '../i18n'

interface Props {
  tasks: Task[]
  cpm: CPMOutput
  selectedId: string | null
  onSelect: (id: string) => void
  t: Dict
  rtl: boolean
}

const NODE_W = 132
const NODE_H = 64
const COL_GAP = 70
const ROW_GAP = 26

export default function NetworkDiagram({ tasks, cpm, selectedId, onSelect, t, rtl }: Props) {
  const layout = useMemo(() => {
    if (cpm.hasCycle || tasks.length === 0) return null

    // Column = earliest start day bucket (tasks with the same ES line up).
    const levels = new Map<number, string[]>()
    for (const task of tasks) {
      const es = cpm.results[task.id]?.es ?? 0
      if (!levels.has(es)) levels.set(es, [])
      levels.get(es)!.push(task.id)
    }
    const sortedLevels = [...levels.keys()].sort((a, b) => a - b)

    const positions = new Map<string, { x: number; y: number; col: number }>()
    sortedLevels.forEach((es, colIndex) => {
      const ids = levels.get(es)!
      ids.forEach((id, rowIndex) => {
        positions.set(id, {
          x: colIndex * (NODE_W + COL_GAP),
          y: rowIndex * (NODE_H + ROW_GAP),
          col: colIndex,
        })
      })
    })

    const maxCol = sortedLevels.length - 1
    const maxRows = Math.max(...sortedLevels.map((es) => levels.get(es)!.length), 1)
    const width = (maxCol + 1) * NODE_W + maxCol * COL_GAP
    const height = maxRows * NODE_H + (maxRows - 1) * ROW_GAP

    return { positions, width: Math.max(width, NODE_W), height: Math.max(height, NODE_H) }
  }, [tasks, cpm])

  if (cpm.hasCycle) {
    return (
      <div className="border border-gold-500/40 bg-gold-500/10 rounded-lg p-4 text-sm text-gold-300">
        {t.cycleWarning}
      </div>
    )
  }

  if (!layout || tasks.length === 0) {
    return <p className="text-ink3 text-sm py-10 text-center">{t.empty}</p>
  }

  const { positions, width, height } = layout
  const criticalSet = new Set(cpm.criticalPath)

  return (
    <div className="overflow-auto rounded-lg border border-edge bg-surface2 shadow-panel scanlines p-6" dir="ltr">
      <svg width={width + 40} height={height + 40} className="min-w-full">
        <g transform="translate(20,20)">
          {/* edges */}
          {tasks.map((task) =>
            task.dependencies.map((depId) => {
              const from = positions.get(depId)
              const to = positions.get(task.id)
              if (!from || !to) return null
              const x1 = from.x + NODE_W
              const y1 = from.y + NODE_H / 2
              const x2 = to.x
              const y2 = to.y + NODE_H / 2
              const isCritical = criticalSet.has(depId) && criticalSet.has(task.id)
              const midX = (x1 + x2) / 2
              return (
                <path
                  key={`${depId}-${task.id}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={isCritical ? '#D4AF37' : '#75756E'}
                  strokeWidth={isCritical ? 2.5 : 1.5}
                  opacity={isCritical ? 0.9 : 0.45}
                  markerEnd={isCritical ? 'url(#arrowGold)' : 'url(#arrowSilver)'}
                />
              )
            }),
          )}

          <defs>
            <marker id="arrowGold" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#D4AF37" />
            </marker>
            <marker id="arrowSilver" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#75756E" />
            </marker>
          </defs>

          {/* nodes */}
          {tasks.map((task) => {
            const pos = positions.get(task.id)
            if (!pos) return null
            const result = cpm.results[task.id]
            const isCritical = result?.critical
            const isSelected = task.id === selectedId
            return (
              <g
                key={task.id}
                transform={`translate(${pos.x},${pos.y})`}
                onClick={() => onSelect(task.id)}
                className="cursor-pointer"
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={isCritical ? 'rgba(212,175,55,0.12)' : 'rgba(117,117,110,0.10)'}
                  stroke={isCritical ? '#D4AF37' : '#9C9C96'}
                  strokeWidth={isSelected ? 2.5 : 1.3}
                  className={isCritical ? 'pulse-critical' : ''}
                />
                <text x={10} y={20} className="fill-ink font-display" fontSize={12} fontWeight={600}>
                  {task.name.length > 18 ? task.name.slice(0, 17) + '…' : task.name}
                </text>
                <text x={10} y={38} className="fill-ink2 font-mono" fontSize={10}>
                  {t.es} {result?.es} · {t.ef} {result?.ef}
                </text>
                <text
                  x={10}
                  y={53}
                  className="font-mono"
                  fontSize={10}
                  fill={isCritical ? '#E8C766' : '#C6C6C1'}
                >
                  {isCritical ? t.critical : `${t.float} ${result?.float}`}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
