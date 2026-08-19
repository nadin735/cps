import type { CPMOutput, Task } from '../types'

export interface CorridorPoint {
  day: number
  earliest: number // cumulative tasks that COULD be finished by this day (ES-based pace)
  latest: number // cumulative tasks that MUST be finished by this day to stay on schedule (LS-based pace)
}

// Builds a day-by-day cumulative "how many tasks are done" curve two ways:
// once assuming every task starts at its earliest possible start (the best
// case pace), once assuming every task waits until its latest allowable
// start (the worst case before something on the critical path slips). The
// gap between the two lines at any point is exactly the schedule's slack at
// that moment, and the lines touch wherever the critical path is running.
export function buildCorridor(tasks: Task[], cpm: CPMOutput): CorridorPoint[] {
  if (tasks.length === 0 || cpm.hasCycle) return []

  const points: CorridorPoint[] = []
  for (let day = 0; day <= cpm.projectDuration; day++) {
    let earliestDone = 0
    let latestDone = 0
    for (const task of tasks) {
      const r = cpm.results[task.id]
      if (!r) continue
      if (day >= r.ef) earliestDone++
      if (day >= r.lf) latestDone++
    }
    points.push({ day, earliest: earliestDone, latest: latestDone })
  }
  return points
}

// Optimized curve: the earliest-pace completion count for a hypothetically
// shortened schedule, aligned to the same day axis as the original corridor
// so the two can be drawn on one chart.
export function buildOptimizedCurve(tasks: Task[], cpm: CPMOutput, maxDay: number): number[] {
  const curve: number[] = []
  for (let day = 0; day <= maxDay; day++) {
    let done = 0
    for (const task of tasks) {
      const r = cpm.results[task.id]
      if (r && day >= r.ef) done++
    }
    curve.push(done)
  }
  return curve
}
