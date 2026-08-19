export interface Task {
  id: string
  name: string
  duration: number // in days
  dependencies: string[] // ids of predecessor tasks
}

export interface Project {
  id: string
  name: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  tasks: Task[]
  sourcePdfNames: string[]
}

export interface CPMResult {
  id: string
  es: number // earliest start
  ef: number // earliest finish
  ls: number // latest start
  lf: number // latest finish
  float: number
  critical: boolean
}

export interface CPMOutput {
  results: Record<string, CPMResult>
  projectDuration: number
  criticalPath: string[]
  hasCycle: boolean
  order: string[] // topological order
}
