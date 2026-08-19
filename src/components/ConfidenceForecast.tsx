import { useEffect, useState } from 'react'
import type { Task } from '../types'
import { runMonteCarloForecast, ForecastResult } from '../utils/monteCarlo'
import { Dict } from '../i18n'

interface Props {
  tasks: Task[]
  t: Dict
}

export default function ConfidenceForecast({ tasks, t }: Props) {
  const [result, setResult] = useState<ForecastResult | null>(null)
  const [running, setRunning] = useState(false)

  // BUGFIX: this result used to persist even after `tasks` changed (adding
  // a task, applying a crash plan, editing a duration), silently showing a
  // forecast for a task list that no longer matches what's on screen. It
  // now clears whenever the task list actually changes, prompting a fresh
  // run instead of displaying stale numbers as if they were current.
  useEffect(() => {
    setResult(null)
  }, [tasks])

  const run = () => {
    setRunning(true)
    // Yield to the browser once so the "running" state actually paints
    // before the (synchronous, but fast) simulation blocks the thread.
    setTimeout(() => {
      setResult(runMonteCarloForecast(tasks, 2000))
      setRunning(false)
    }, 30)
  }

  const maxCount = result ? Math.max(...result.histogram.map((h) => h.count), 1) : 1

  return (
    <div className="border border-edge bg-surface2 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="font-display font-semibold text-ink">{t.forecastTitle}</h3>
          <p className="text-xs text-ink3 mt-0.5 max-w-md">{t.forecastHint}</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="px-3 py-1.5 text-xs font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500 disabled:opacity-40 shrink-0"
        >
          {running ? t.forecastRunning : result ? t.tryAgain : t.forecastRun}
        </button>
      </div>

      {!result && !running && <p className="text-sm text-ink3 mt-3">{t.forecastNotYetRun}</p>}

      {result && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center">
              <p className="text-[10px] font-mono text-ink3 uppercase tracking-wide">{t.forecastP50}</p>
              <p className="font-mono text-2xl font-bold text-ink mt-1">{result.p50}</p>
              <p className="text-[10px] text-ink3">{t.days}</p>
            </div>
            <div className="text-center border-x border-edge">
              <p className="text-[10px] font-mono text-gold-400 uppercase tracking-wide">{t.forecastP80}</p>
              <p className="font-mono text-2xl font-bold text-gold-400 mt-1">{result.p80}</p>
              <p className="text-[10px] text-ink3">{t.days}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-mono text-ink3 uppercase tracking-wide">{t.forecastP95}</p>
              <p className="font-mono text-2xl font-bold text-ink mt-1">{result.p95}</p>
              <p className="text-[10px] text-ink3">{t.days}</p>
            </div>
          </div>

          <p className="text-xs text-ink2 mb-4 leading-relaxed">
            {t.forecastP80Explainer1} <span className="text-gold-400 font-mono">{result.p80}</span> {t.forecastP80Explainer2}{' '}
            {result.deterministicDays} {t.days}
            {t.forecastP80Explainer3}
          </p>

          <div className="flex items-end gap-1 h-16 mb-1">
            {result.histogram.map((bucket, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${bucket.count}`}>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max((bucket.count / maxCount) * 100, 3)}%`,
                    backgroundColor: bucket.bucketStart <= result.p80 && bucket.bucketEnd >= result.p50 ? '#D4AF37' : '#9C9C96',
                    opacity: 0.85,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-ink3 mb-4">
            <span>{result.min} {t.days}</span>
            <span>{result.max} {t.days}</span>
          </div>

          <details className="text-xs text-ink3">
            <summary className="cursor-pointer font-mono uppercase tracking-wide text-ink2">{t.forecastMethodology}</summary>
            <p className="mt-2 leading-relaxed">{t.forecastMethodologyText}</p>
          </details>

          <div className="mt-5 pt-5 border-t border-edge">
            <h4 className="font-display font-semibold text-ink mb-1">{t.criticalityTitle}</h4>
            <p className="text-xs text-ink3 mb-3">{t.criticalityHint}</p>
            <div className="space-y-2">
              {result.criticality.slice(0, 6).map((c) => (
                <div key={c.taskId} className="flex items-center gap-3 text-xs">
                  <span className="w-36 shrink-0 text-ink truncate font-mono">{c.taskName}</span>
                  <div className="flex-1 h-2 bg-field rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: c.pct >= 70 ? '#D4AF37' : c.pct >= 30 ? '#C9A227' : '#9C9C96',
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-ink font-mono">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
