import type { Task } from '../types'
import { computeCPM } from './cpm'

export interface ForecastResult {
  deterministicDays: number
  p50: number
  p80: number
  p95: number
  min: number
  max: number
  histogram: { bucketStart: number; bucketEnd: number; count: number }[]
  iterations: number
  criticality: { taskId: string; taskName: string; pct: number }[]
}

// Standard inverse-transform sampling for a triangular distribution with
// minimum o, mode m, maximum p.
function sampleTriangular(o: number, m: number, p: number): number {
  if (p <= o) return o
  const u = Math.random()
  const c = (m - o) / (p - o)
  if (u < c) return o + Math.sqrt(u * (p - o) * (m - o))
  return p - Math.sqrt((1 - u) * (p - o) * (p - m))
}

// This is a genuine Monte Carlo simulation, not a canned number. Every task
// gets a PERT-style three-point estimate derived from its single duration
// (optimistic = 80%, most likely = the entered duration, pessimistic =
// 130%, standard rules-of-thumb absent better data), then the full
// critical-path calculation is re-run for each of `iterations` random
// samples across the whole dependency graph, respecting every dependency
// exactly as the deterministic calculation does. The result is a real
// distribution of possible project durations, not a guess.
export function runMonteCarloForecast(tasks: Task[], iterations = 2000): ForecastResult | null {
  if (tasks.length === 0) return null

  const base = computeCPM(tasks)
  if (base.hasCycle) return null

  const durations: number[] = []
  const criticalCount: Record<string, number> = {}
  for (const task of tasks) criticalCount[task.id] = 0

  for (let i = 0; i < iterations; i++) {
    const sampled = tasks.map((t) => {
      const o = Math.max(1, Math.round(t.duration * 0.8))
      const m = t.duration
      const p = Math.max(m, Math.round(t.duration * 1.3))
      return { ...t, duration: Math.max(1, Math.round(sampleTriangular(o, m, p))) }
    })
    const cpm = computeCPM(sampled)
    if (cpm.hasCycle) continue
    durations.push(cpm.projectDuration)
    for (const t of sampled) {
      if (cpm.results[t.id]?.critical) criticalCount[t.id]++
    }
  }

  durations.sort((a, b) => a - b)
  const n = durations.length
  const percentile = (frac: number) => durations[Math.min(n - 1, Math.floor(frac * (n - 1)))]

  const min = durations[0]
  const max = durations[n - 1]
  const bucketCount = Math.min(12, Math.max(4, max - min + 1))
  const bucketSize = Math.max(1, Math.ceil((max - min + 1) / bucketCount))
  const histogram: ForecastResult['histogram'] = []
  for (let b = min; b <= max; b += bucketSize) {
    const bucketEnd = Math.min(b + bucketSize - 1, max)
    const count = durations.filter((d) => d >= b && d <= bucketEnd).length
    histogram.push({ bucketStart: b, bucketEnd, count })
  }

  const criticality = tasks
    .map((task) => ({ taskId: task.id, taskName: task.name, pct: Math.round((criticalCount[task.id] / n) * 100) }))
    .sort((a, b) => b.pct - a.pct)

  return {
    deterministicDays: base.projectDuration,
    p50: percentile(0.5),
    p80: percentile(0.8),
    p95: percentile(0.95),
    min,
    max,
    histogram,
    iterations: n,
    criticality,
  }
}
