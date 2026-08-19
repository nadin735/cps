import type { CPMOutput, Task } from '../types'

// Simple, dependency-free CSV export. Escapes quotes and wraps any field
// containing a comma, quote, or newline, per RFC 4180.
function csvCell(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportTasksAsCsv(projectName: string, tasks: Task[], cpm: CPMOutput) {
  const headers = ['Task', 'Duration (days)', 'Depends on', 'ES', 'EF', 'LS', 'LF', 'Float', 'Critical']
  const byId = new Map(tasks.map((t) => [t.id, t]))

  const rows = tasks.map((task) => {
    const r = cpm.results[task.id]
    const depNames = task.dependencies.map((d) => byId.get(d)?.name ?? d).join('; ')
    return [
      task.name,
      task.duration,
      depNames,
      r?.es ?? '',
      r?.ef ?? '',
      r?.ls ?? '',
      r?.lf ?? '',
      r?.float ?? '',
      r?.critical ? 'yes' : 'no',
    ]
  })

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-tasks.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
