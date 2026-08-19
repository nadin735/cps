import type { Task, CPMOutput } from '../types'
import { Dict } from '../i18n'

interface Props {
  tasks: Task[]
  cpm: CPMOutput
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  t: Dict
}

export default function TaskTable({ tasks, cpm, selectedId, onSelect, onEdit, onDelete, t }: Props) {
  if (tasks.length === 0) {
    return <p className="text-ink3 text-sm py-8 text-center">{t.empty}</p>
  }

  const sorted = [...tasks].sort((a, b) => (cpm.results[a.id]?.es ?? 0) - (cpm.results[b.id]?.es ?? 0))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink3 font-mono text-xs uppercase tracking-wide border-b border-edge">
            <th className="py-2 pr-3">{t.tableHeaders.task}</th>
            <th className="py-2 pr-3">{t.tableHeaders.duration}</th>
            <th className="py-2 pr-3">{t.tableHeaders.es}</th>
            <th className="py-2 pr-3">{t.tableHeaders.ef}</th>
            <th className="py-2 pr-3">{t.tableHeaders.float}</th>
            <th className="py-2 pr-3">{t.tableHeaders.status}</th>
            <th className="py-2 pr-3 text-right">{t.delete}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => {
            const r = cpm.results[task.id]
            return (
              <tr
                key={task.id}
                onClick={() => onSelect(task.id)}
                className={`border-b border-edge cursor-pointer transition-colors ${
                  task.id === selectedId ? 'bg-surface2' : 'hover:bg-surface2/60'
                }`}
              >
                <td className="py-2.5 pr-3 font-display font-medium">{task.name}</td>
                <td className="py-2.5 pr-3 font-mono">{task.duration}</td>
                <td className="py-2.5 pr-3 font-mono text-ink2">{r?.es ?? '–'}</td>
                <td className="py-2.5 pr-3 font-mono text-ink2">{r?.ef ?? '–'}</td>
                <td className="py-2.5 pr-3 font-mono text-ink2">{r?.float ?? '–'}</td>
                <td className="py-2.5 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{
                      backgroundColor: r?.critical ? 'rgba(212,175,55,0.15)' : 'rgba(156,156,150,0.15)',
                      color: r?.critical ? '#E8C766' : '#C6C6C1',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: r?.critical ? '#D4AF37' : '#9C9C96' }}
                    />
                    {r?.critical ? t.critical : t.float}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(task.id)
                    }}
                    className="text-gold-400 hover:text-gold-300 text-xs font-mono"
                  >
                    {t.edit}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(task.id)
                    }}
                    className="text-silver-400 hover:text-[#D97A6E] text-xs font-mono transition-colors"
                  >
                    {t.delete}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
