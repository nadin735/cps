import { useEffect, useState } from 'react'
import type { Project, Task } from './types'
import { dict, isRtl, Lang } from './i18n'
import { getSession, getAccountDisplayName, logout } from './utils/account'
import { loadPortfolio, upsertProject, deleteProject, newProject } from './utils/portfolio'
import LoginScreen from './components/LoginScreen'
import PortfolioDashboard from './components/PortfolioDashboard'
import AddProjectModal from './components/AddProjectModal'
import ProjectResultScreen from './components/ProjectResultScreen'

const THEME_KEY = 'cps-theme-v1'

const LANG_LABEL: Record<Lang, string> = { de: 'DE', en: 'EN', ar: 'AR' }

export default function App() {
  const [lang, setLang] = useState<Lang>('de')
  const t = dict[lang]
  const rtl = isRtl[lang]

  const [theme, setTheme] = useState<'night' | 'day'>(
    () => (localStorage.getItem(THEME_KEY) as 'night' | 'day') ?? 'night',
  )
  const [accountKey, setAccountKey] = useState<string | null>(() => getSession())
  const [projects, setProjects] = useState<Project[]>(() => {
    const session = getSession()
    return session ? loadPortfolio(session) : []
  })
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, rtl])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  if (!accountKey) {
    return (
      <LoginScreen
        t={t}
        onLogin={(key) => {
          setAccountKey(key)
          setProjects(loadPortfolio(key))
          setActiveProjectId(null)
        }}
      />
    )
  }

  const displayName = getAccountDisplayName(accountKey)
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) ?? null : null

  const handleAddComplete = (tasks: Task[], targetProjectId: string | null, pdfName: string | null) => {
    if (targetProjectId) {
      const existing = projects.find((p) => p.id === targetProjectId)
      if (existing) {
        const updated: Project = {
          ...existing,
          tasks: [...existing.tasks, ...tasks],
          sourcePdfNames: pdfName ? [...existing.sourcePdfNames, pdfName] : existing.sourcePdfNames,
          updatedAt: new Date().toISOString(),
        }
        const next = upsertProject(accountKey, updated)
        setProjects(next)
        setActiveProjectId(updated.id)
      }
    } else {
      const name = pdfName?.replace(/\.pdf$/i, '') || `${t.newProject} ${new Date().toLocaleDateString()}`
      const project = newProject(name, tasks, pdfName ? [pdfName] : [])
      const next = upsertProject(accountKey, project)
      setProjects(next)
      setActiveProjectId(project.id)
    }
    setShowAddModal(false)
  }

  const handleSaveResult = (tasks: Task[]) => {
    if (!activeProject) return
    const updated: Project = { ...activeProject, tasks, updatedAt: new Date().toISOString() }
    const next = upsertProject(accountKey, updated)
    setProjects(next)
  }

  const handleDeleteProject = (id: string) => setProjects(deleteProject(accountKey, id))

  return (
    <div className="min-h-screen scanlines">
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-6 flex items-start justify-between gap-4 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full border border-gold-500 bg-field px-2 py-1 text-[11px] font-mono text-ink2">
            {displayName}
          </span>
          <span className="text-[11px] font-mono text-ink3 underline cursor-pointer hover:text-gold-400" onClick={() => { logout(); setAccountKey(null) }}>
            {t.logout}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
            className="font-mono text-xs border border-fieldEdge rounded-full px-3 py-1.5 text-ink2 hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            {theme === 'night' ? '☾' : '☀'} {theme === 'night' ? t.nightMode : t.dayMode}
          </button>
          <div className="flex gap-1">
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`font-mono text-xs border rounded-full px-3 py-1.5 transition-colors ${
                  lang === l ? 'border-gold-500 text-gold-400' : 'border-fieldEdge text-ink3 hover:text-ink hover:border-edge'
                }`}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">
        {activeProject ? (
          <ProjectResultScreen
            project={activeProject}
            allProjects={projects}
            rtl={rtl}
            lang={lang}
            onSave={handleSaveResult}
            onBack={() => setActiveProjectId(null)}
            t={t}
          />
        ) : (
          <PortfolioDashboard
            projects={projects}
            onOpen={(id) => setActiveProjectId(id)}
            onAdd={() => setShowAddModal(true)}
            onDelete={handleDeleteProject}
            t={t}
          />
        )}
      </main>

      {showAddModal && (
        <AddProjectModal projects={projects} onClose={() => setShowAddModal(false)} onComplete={handleAddComplete} t={t} />
      )}
    </div>
  )
}
