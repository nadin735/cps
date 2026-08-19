import type { Task } from '../types'
import { computeCPM } from './cpm'

export interface CrashStep {
  taskId: string
  taskName: string
  originalDuration: number
  reduceBy: number
  newDuration: number
}

export interface CrashPlan {
  targetDuration: number
  startingDuration: number
  achievedDuration: number
  achievable: boolean
  steps: CrashStep[]
}

// Classic greedy "project crashing" from PM theory: to hit an earlier
// finish date, shorten one day at a time from whichever task on the
// CURRENT critical path still has the most room left, then recompute the
// entire critical path (since crashing one task can shift which path is
// critical) and repeat. This is the standard heuristic taught for the
// time-cost tradeoff problem, it does not claim to find the mathematically
// optimal crash schedule (that is a linear program), but it finds a
// genuinely workable one, transparently, and explains exactly which task
// to shorten by how much.
//
// A task is never crashed below 60% of its original duration (floor of 1
// day), a reasonable stand-in for "there's a limit to how much a task can
// realistically be compressed" absent real cost/resource data.
export function computeCrashPlan(tasks: Task[], targetDuration: number): CrashPlan | null {
  if (tasks.length === 0) return null

  const startingCpm = computeCPM(tasks)
  if (startingCpm.hasCycle) return null

  const startingDuration = startingCpm.projectDuration
  const floor = new Map(tasks.map((t) => [t.id, Math.max(1, Math.ceil(t.duration * 0.6))]))
  const reductions = new Map<string, number>()

  let working = tasks.map((t) => ({ ...t }))
  let cpm = startingCpm
  let guard = 0

  while (cpm.projectDuration > targetDuration && guard < 1000) {
    guard++
    const criticalIds = new Set(working.filter((t) => cpm.results[t.id]?.critical).map((t) => t.id))
    const candidates = working
      .filter((t) => criticalIds.has(t.id))
      .map((t) => ({ task: t, room: t.duration - (floor.get(t.id) ?? 1) }))
      .filter((c) => c.room > 0)
      .sort((a, b) => b.room - a.room)

    if (candidates.length === 0) break // nothing left that can be crashed further

    const pick = candidates[0].task
    reductions.set(pick.id, (reductions.get(pick.id) ?? 0) + 1)
    working = working.map((t) => (t.id === pick.id ? { ...t, duration: t.duration - 1 } : t))
    cpm = computeCPM(working)
    if (cpm.hasCycle) break
  }

  const steps: CrashStep[] = [...reductions.entries()]
    .map(([taskId, reduceBy]) => {
      const original = tasks.find((t) => t.id === taskId)!
      return {
        taskId,
        taskName: original.name,
        originalDuration: original.duration,
        reduceBy,
        newDuration: original.duration - reduceBy,
      }
    })
    .sort((a, b) => b.reduceBy - a.reduceBy)

  return {
    targetDuration,
    startingDuration,
    achievedDuration: cpm.projectDuration,
    achievable: cpm.projectDuration <= targetDuration,
    steps,
  }
}
