import type { CPMOutput, Task } from '../types'
import type { Dict } from '../i18n'

export type Severity = 'healthy' | 'watch' | 'critical'

export interface Analysis {
  severity: Severity
  heading: string
  body: string
  currentDays: number
  optimizedDays: number
  tips: string[]
  outlook: string
}

// Cheap, always-available classification, independent of the full prose
// analysis below. Used for status badges (portfolio table, result header)
// so "status" reflects actual schedule risk instead of a meaningless
// "computation succeeded" label.
export function computeSeverity(tasks: Task[], cpm: CPMOutput): Severity | null {
  if (tasks.length === 0 || cpm.hasCycle) return null
  const criticalTasks = tasks.filter((x) => cpm.results[x.id]?.critical)
  const nonCritical = tasks.filter((x) => !cpm.results[x.id]?.critical)
  const bottleneck = [...criticalTasks].sort((a, b) => b.duration - a.duration)[0]
  const totalFloat = nonCritical.reduce((sum, x) => sum + (cpm.results[x.id]?.float ?? 0), 0)
  const criticalShare = bottleneck ? Math.round((bottleneck.duration / cpm.projectDuration) * 100) : 0
  if (criticalShare >= 35 || nonCritical.length === 0) return 'critical'
  if (totalFloat < cpm.projectDuration * 0.15) return 'watch'
  return 'healthy'
}

// This is a rule based generator over the CPM numbers already computed in
// the browser, not a live call to a language model. It reads like an
// analysis because the underlying math (critical path, float, bottlenecks)
// is real, the prose is templated. Documented here and in the README so
// nobody mistakes it for an AI call that isn't happening.
export function buildAnalysis(tasks: Task[], cpm: CPMOutput, t: Dict, lang: 'de' | 'en' | 'ar'): Analysis | null {
  if (tasks.length === 0 || cpm.hasCycle) return null

  const byId = new Map(tasks.map((x) => [x.id, x]))
  const criticalTasks = tasks.filter((x) => cpm.results[x.id]?.critical)
  const nonCritical = tasks.filter((x) => !cpm.results[x.id]?.critical)

  const bottleneck = [...criticalTasks].sort((a, b) => b.duration - a.duration)[0]
  const floatEntries = nonCritical
    .map((x) => ({ task: x, float: cpm.results[x.id]?.float ?? 0 }))
    .sort((a, b) => b.float - a.float)
  const mostFloat = floatEntries[0]
  const totalFloat = floatEntries.reduce((sum, e) => sum + e.float, 0)

  const criticalShare = bottleneck ? Math.round((bottleneck.duration / cpm.projectDuration) * 100) : 0
  const criticalCount = criticalTasks.length
  const totalCount = tasks.length

  const severity = computeSeverity(tasks, cpm) as Severity

  // A crude "crashing" estimate: shaving 20% off the single biggest critical
  // task, floored, capped so it never goes below 1 day.
  const potentialSaving = bottleneck ? Math.max(1, Math.round(bottleneck.duration * 0.2)) : 0
  const optimizedDays = Math.max(1, cpm.projectDuration - potentialSaving)

  const secondCritical = criticalTasks.find((x) => x.id !== bottleneck?.id)

  const nameOf = (id?: string) => (id ? byId.get(id)?.name ?? '' : '')

  const templates = {
    de: {
      heading: 'Wohin steuert dieser Zeitplan?',
      body: `${criticalCount} von ${totalCount} Vorgängen liegen auf dem kritischen Pfad, das sind ${Math.round((criticalCount / totalCount) * 100)}% aller Vorgänge ohne jeden Puffer. Der größte Einzelposten auf dem kritischen Pfad ist „${bottleneck?.name ?? ''}" mit ${bottleneck?.duration ?? 0} Tagen, das sind ${criticalShare}% der Gesamtprojektdauer von ${cpm.projectDuration} Tagen. ${mostFloat ? `„${mostFloat.task.name}" hat mit ${mostFloat.float} Tagen den größten Puffer im Projekt und kann bei Bedarf flexibel verschoben werden.` : 'Es gibt kaum Pufferzeit im restlichen Projekt.'} Insgesamt stehen ${totalFloat} Tage an Gesamtpuffer über alle unkritischen Vorgänge zur Verfügung, das ist der Puffer, bevor eine externe Deadline in Gefahr gerät.`,
      tips: [
        `„${bottleneck?.name ?? ''}" (${bottleneck?.duration ?? 0} Tage, ${criticalShare}% des kritischen Pfads) zuerst absichern, jede Verzögerung hier verzögert das gesamte Projekt eins zu eins.`,
        secondCritical
          ? `„${secondCritical.name}" hat ebenfalls null Puffer und folgt direkt im Anschluss, hier lohnt sich eine feste Terminreservierung ohne Leerlauf dazwischen.`
          : `Prüfe, ob sich Aufgaben auf dem kritischen Pfad parallelisieren lassen, um die Gesamtdauer zu verkürzen.`,
        mostFloat
          ? `„${mostFloat.task.name}" hat ${mostFloat.float} Tage Puffer, hier lässt sich Personal bei Engpässen anderswo kurzfristig abziehen.`
          : `Da kaum Puffer vorhanden ist, sollte jede neue Aufgabe zuerst gegen den kritischen Pfad geprüft werden.`,
        `Erwäge, „${bottleneck?.name ?? ''}" um ${potentialSaving} Tage zu verkürzen (mehr Ressourcen, Scope-Reduktion, Parallelisierung), das würde die Projektdauer auf ${optimizedDays} Tage senken.`,
        `Gesamtpuffer über alle unkritischen Vorgänge: ${totalFloat} Tage. Das ist der eingebaute Sicherheitsspielraum, bevor ein externer Termin wackelt.`,
      ],
      outlook: `Wird „${bottleneck?.name ?? ''}" wie oben beschrieben um ${potentialSaving} Tage verkürzt, sinkt die Projektdauer von ${cpm.projectDuration} auf etwa ${optimizedDays} Tage. Das bleibt eine Schätzung auf Basis des aktuell längsten kritischen Vorgangs, echte Zusagen von Verantwortlichen sind trotzdem nötig.`,
    },
    en: {
      heading: 'Where is this schedule heading?',
      body: `${criticalCount} of ${totalCount} tasks sit on the critical path, that is ${Math.round((criticalCount / totalCount) * 100)}% of all tasks with zero buffer. The single biggest item on the critical path is "${bottleneck?.name ?? ''}" at ${bottleneck?.duration ?? 0} days, ${criticalShare}% of the total project duration of ${cpm.projectDuration} days. ${mostFloat ? `"${mostFloat.task.name}" carries the most float in the project at ${mostFloat.float} days and can be rescheduled flexibly if needed.` : 'There is very little float left elsewhere in the project.'} Across every non critical task, ${totalFloat} days of float remain in total, that is the buffer before any external deadline is at risk.`,
      tips: [
        `Protect "${bottleneck?.name ?? ''}" (${bottleneck?.duration ?? 0} days, ${criticalShare}% of the critical path) first, any slip here delays the whole project day for day.`,
        secondCritical
          ? `"${secondCritical.name}" also has zero float and follows right after, worth locking in a firm slot with no idle gap in between.`
          : `Check whether any critical path tasks can run in parallel to shorten the overall duration.`,
        mostFloat
          ? `"${mostFloat.task.name}" has ${mostFloat.float} days of float, a reasonable place to pull resources from temporarily if another task needs them.`
          : `With little float available, weigh any new task against the critical path before committing to it.`,
        `Consider trimming "${bottleneck?.name ?? ''}" by ${potentialSaving} days (more resources, reduced scope, parallelizing sub-steps), which would bring the project down to roughly ${optimizedDays} days.`,
        `Total float across all non critical tasks: ${totalFloat} days. That is the built in contingency before an external deadline slips.`,
      ],
      outlook: `If "${bottleneck?.name ?? ''}" is shortened by ${potentialSaving} days as described above, project duration drops from ${cpm.projectDuration} to roughly ${optimizedDays} days. This stays an estimate based on today's longest critical task, real commitments from the people doing the work are still needed.`,
    },
    ar: {
      heading: 'إلى أين يتجه هذا الجدول الزمني؟',
      body: `${criticalCount} من أصل ${totalCount} مهمة تقع على المسار الحرج، أي ${Math.round((criticalCount / totalCount) * 100)}% من جميع المهام بدون أي وقت احتياطي. أكبر بند منفرد على المسار الحرج هو "${bottleneck?.name ?? ''}" بمدة ${bottleneck?.duration ?? 0} يوم، أي ${criticalShare}% من إجمالي مدة المشروع البالغة ${cpm.projectDuration} يوم. ${mostFloat ? `تمتلك "${mostFloat.task.name}" أكبر وقت احتياطي في المشروع بمقدار ${mostFloat.float} يوم ويمكن جدولتها بمرونة عند الحاجة.` : 'لا يوجد سوى القليل من الوقت الاحتياطي في باقي المشروع.'} إجمالي الوقت الاحتياطي عبر جميع المهام غير الحرجة هو ${totalFloat} يوم، وهذا هو الهامش المتاح قبل أن يتأثر أي موعد نهائي خارجي.`,
      tips: [
        `أعطِ الأولوية لـ"${bottleneck?.name ?? ''}" (${bottleneck?.duration ?? 0} يوم، ${criticalShare}% من المسار الحرج)، أي تأخير هنا يؤخر المشروع بأكمله يوماً بيوم.`,
        secondCritical
          ? `تمتلك "${secondCritical.name}" أيضاً وقت احتياطي صفر وتأتي مباشرة بعدها، يستحق الأمر حجز موعد ثابت دون أي فجوة بينهما.`
          : `تحقق مما إذا كان يمكن تنفيذ بعض مهام المسار الحرج بالتوازي لتقصير المدة الإجمالية.`,
        mostFloat
          ? `تمتلك "${mostFloat.task.name}" وقتاً احتياطياً قدره ${mostFloat.float} يوم، مكان معقول لسحب الموارد منه مؤقتاً إذا احتاجتها مهمة أخرى.`
          : `مع قلة الوقت الاحتياطي المتاح، قيّم أي مهمة جديدة مقابل المسار الحرج قبل الالتزام بها.`,
        `فكر في تقليص "${bottleneck?.name ?? ''}" بمقدار ${potentialSaving} يوم (موارد أكثر، نطاق أقل، تنفيذ متوازٍ للخطوات الفرعية)، مما قد يخفض المشروع إلى نحو ${optimizedDays} يوم.`,
        `إجمالي الوقت الاحتياطي عبر جميع المهام غير الحرجة: ${totalFloat} يوم. هذا هو الهامش المدمج قبل أن يتأثر أي موعد نهائي خارجي.`,
      ],
      outlook: `إذا تم تقصير "${bottleneck?.name ?? ''}" بمقدار ${potentialSaving} يوم كما هو موضح أعلاه، تنخفض مدة المشروع من ${cpm.projectDuration} إلى نحو ${optimizedDays} يوم. يبقى هذا تقديراً مبنياً على أطول مهمة حرجة حالياً، ولا تزال هناك حاجة لالتزامات فعلية من فريق العمل.`,
    },
  }[lang]

  return {
    severity,
    heading: templates.heading,
    body: templates.body,
    currentDays: cpm.projectDuration,
    optimizedDays,
    tips: templates.tips,
    outlook: templates.outlook,
  }
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  healthy: '#4F8F6B',
  watch: '#C9A227',
  critical: '#B23A32',
}
