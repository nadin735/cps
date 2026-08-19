import { useEffect, useState } from 'react'
import type { Task } from '../types'
import { computeCrashPlan, CrashPlan } from '../utils/crashSchedule'
import { Dict } from '../i18n'

interface Props {
  tasks: Task[]
  currentDuration: number
  onApplyPlan: (steps: CrashPlan['steps']) => void
  t: Dict
}

export default function TargetDateSimulator({ tasks, currentDuration, onApplyPlan, t }: Props) {
  const [target, setTarget] = useState<number>(Math.max(1, currentDuration - Math.ceil(currentDuration * 0.15)))
  const [plan, setPlan] = useState<CrashPlan | null>(null)

  // BUGFIX: same staleness issue as the Confidence Forecast, a computed
  // crash plan used to stay on screen even after the task list it was
  // based on had changed, which could show a "shorten X by 2 days" plan
  // for an X that had already been edited or removed. Clears on any real
  // task list change instead of silently going stale.
  useEffect(() => {
    setPlan(null)
  }, [tasks])

  // Keeps the target input from silently pointing past the current
  // duration if the project got shorter through some other action
  // (applying this same plan, editing a task) without the person having
  // touched the target field themselves.
  useEffect(() => {
    setTarget((prev) => Math.min(prev, currentDuration))
  }, [currentDuration])

  const run = () => {
    setPlan(computeCrashPlan(tasks, target))
  }

  return (
    <div className="border border-edge bg-surface2 rounded-lg p-5 mb-6">
      <h3 className="font-display font-semibold text-ink mb-1">{t.crashTitle}</h3>
      <p className="text-xs text-ink3 mb-4 max-w-lg">{t.crashHint}</p>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block">
          <span className="text-xs font-mono text-ink2 uppercase tracking-wide block mb-1">{t.crashTargetLabel}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={currentDuration}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(currentDuration, Number(e.target.value))))}
              className="w-24 bg-field border border-fieldEdge rounded px-3 py-2 text-sm text-ink"
            />
            <span className="text-xs text-ink3">{t.days}</span>
          </div>
        </label>
        <input
          type="range"
          min={1}
          max={currentDuration}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="flex-1 min-w-[140px] accent-gold-500 mb-2.5"
        />
        <button
          onClick={run}
          className="px-4 py-2 text-sm font-mono bg-gold-500 text-inkOnGold rounded hover:bg-gold-400 font-semibold"
        >
          {t.crashRun}
        </button>
      </div>

      {plan && (
        <div>
          {plan.steps.length === 0 && plan.achievable && (
            <p className="text-sm text-ink2">{t.crashAlreadyMet}</p>
          )}

          {plan.steps.length > 0 && (
            <>
              <div
                className="rounded-md border px-3 py-2 mb-4 text-sm"
                style={{
                  borderColor: plan.achievable ? '#4F8F6B55' : '#B23A3255',
                  backgroundColor: plan.achievable ? '#4F8F6B15' : '#B23A3215',
                  color: plan.achievable ? '#7BBE99' : '#D97A6E',
                }}
              >
                {plan.achievable
                  ? `${t.crashAchievable} ${plan.achievedDuration} ${t.days}.`
                  : `${t.crashNotFullyAchievable} ${plan.achievedDuration} ${t.days} (${t.crashTargetWas} ${plan.targetDuration}).`}
              </div>

              <p className="text-xs font-mono text-ink3 uppercase tracking-wide mb-2">{t.crashPlanTitle}</p>
              <div className="space-y-2 mb-4">
                {plan.steps.map((step) => (
                  <div key={step.taskId} className="flex items-center justify-between text-sm border border-edge rounded px-3 py-2">
                    <span className="text-ink truncate">{step.taskName}</span>
                    <span className="font-mono text-xs text-ink2 shrink-0 ml-3">
                      {step.originalDuration} → {step.newDuration} {t.days}
                      <span className="text-gold-400 ml-1.5">(−{step.reduceBy})</span>
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onApplyPlan(plan.steps)}
                className="px-4 py-2 text-sm font-mono border border-fieldEdge rounded text-ink2 hover:text-gold-400 hover:border-gold-500"
              >
                {t.crashApplyPlan}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
