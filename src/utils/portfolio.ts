import type { Project, Task } from '../types'

function portfolioKey(accountKey: string) {
  return `cps-portfolio-${accountKey}-v1`
}

export function loadPortfolio(accountKey: string): Project[] {
  try {
    const raw = localStorage.getItem(portfolioKey(accountKey))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePortfolio(accountKey: string, projects: Project[]) {
  localStorage.setItem(portfolioKey(accountKey), JSON.stringify(projects))
}

export function upsertProject(accountKey: string, project: Project): Project[] {
  const projects = loadPortfolio(accountKey)
  const exists = projects.some((p) => p.id === project.id)
  const next = exists ? projects.map((p) => (p.id === project.id ? project : p)) : [...projects, project]
  savePortfolio(accountKey, next)
  return next
}

export function duplicateProject(accountKey: string, projectId: string): Project[] {
  const projects = loadPortfolio(accountKey)
  const source = projects.find((p) => p.id === projectId)
  if (!source) return projects
  const now = new Date().toISOString()
  const copy: Project = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (Kopie)`,
    createdAt: now,
    updatedAt: now,
  }
  const next = [...projects, copy]
  savePortfolio(accountKey, next)
  return next
}

export function deleteProject(accountKey: string, projectId: string): Project[] {
  const projects = loadPortfolio(accountKey).filter((p) => p.id !== projectId)
  savePortfolio(accountKey, projects)
  return projects
}

export function newProject(name: string, tasks: Task[], sourcePdfNames: string[]): Project {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    tasks,
    sourcePdfNames,
  }
}
