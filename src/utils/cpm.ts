import type { CPMOutput, CPMResult, Task } from '../types'

// Kahn's algorithm for topological order. Returns null if a cycle exists.
function topologicalOrder(tasks: Task[]): string[] | null {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const inDegree = new Map<string, number>()
  const successors = new Map<string, string[]>()

  for (const t of tasks) {
    inDegree.set(t.id, 0)
    successors.set(t.id, [])
  }
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (!byId.has(dep)) continue // ignore dangling references defensively
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)
      successors.get(dep)?.push(t.id)
    }
  }

  const queue = tasks.filter((t) => (inDegree.get(t.id) ?? 0) === 0).map((t) => t.id)
  const order: string[] = []

  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const succ of successors.get(id) ?? []) {
      inDegree.set(succ, (inDegree.get(succ) ?? 0) - 1)
      if (inDegree.get(succ) === 0) queue.push(succ)
    }
  }

  if (order.length !== tasks.length) return null // cycle detected
  return order
}

export function computeCPM(tasks: Task[]): CPMOutput {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const order = topologicalOrder(tasks)

  if (!order) {
    return {
      results: {},
      projectDuration: 0,
      criticalPath: [],
      hasCycle: true,
      order: [],
    }
  }

  const successors = new Map<string, string[]>()
  for (const t of tasks) successors.set(t.id, [])
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (byId.has(dep)) successors.get(dep)?.push(t.id)
    }
  }

  const es = new Map<string, number>()
  const ef = new Map<string, number>()

  // Forward pass, in topological order.
  for (const id of order) {
    const t = byId.get(id)!
    const validDeps = t.dependencies.filter((d) => byId.has(d))
    const start = validDeps.length === 0 ? 0 : Math.max(...validDeps.map((d) => ef.get(d) ?? 0))
    es.set(id, start)
    ef.set(id, start + t.duration)
  }

  const projectDuration = Math.max(0, ...tasks.map((t) => ef.get(t.id) ?? 0))

  const ls = new Map<string, number>()
  const lf = new Map<string, number>()

  // Backward pass, in reverse topological order.
  for (const id of [...order].reverse()) {
    const t = byId.get(id)!
    const succs = successors.get(id) ?? []
    const finish = succs.length === 0 ? projectDuration : Math.min(...succs.map((s) => ls.get(s) ?? projectDuration))
    lf.set(id, finish)
    ls.set(id, finish - t.duration)
  }

  const results: Record<string, CPMResult> = {}
  for (const t of tasks) {
    const taskEs = es.get(t.id) ?? 0
    const taskEf = ef.get(t.id) ?? 0
    const taskLs = ls.get(t.id) ?? 0
    const taskLf = lf.get(t.id) ?? 0
    const float = taskLs - taskEs
    results[t.id] = {
      id: t.id,
      es: taskEs,
      ef: taskEf,
      ls: taskLs,
      lf: taskLf,
      float,
      critical: float === 0,
    }
  }

  // Extract one representative critical path: start at a critical task with
  // es = 0, then repeatedly step to a critical successor. If several critical
  // chains exist in parallel, this returns the first one found in task order,
  // which is enough to explain "the" critical path in a walkthrough.
  const criticalPath: string[] = []
  const startCandidates = order.filter((id) => results[id].critical && results[id].es === 0)
  let cursor: string | undefined = startCandidates[0]
  while (cursor) {
    criticalPath.push(cursor)
    const succs = successors.get(cursor) ?? []
    const nextCritical = succs.find((s) => results[s]?.critical && results[s].es === results[cursor as string].ef)
    cursor = nextCritical
  }

  return { results, projectDuration, criticalPath, hasCycle: false, order }
}
