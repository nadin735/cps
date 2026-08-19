import { CorridorPoint } from '../utils/corridor'
import { Dict } from '../i18n'

interface Props {
  points: CorridorPoint[]
  optimized?: number[]
  totalTasks: number
  t: Dict
}

const W = 720
const H = 260
const PAD_L = 40
const PAD_B = 28
const PAD_T = 12
const PAD_R = 12

export default function ScheduleCorridorChart({ points, optimized, totalTasks, t }: Props) {
  if (points.length === 0) return null

  const maxDay = points[points.length - 1].day
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B

  const x = (day: number) => PAD_L + (maxDay === 0 ? 0 : (day / maxDay) * plotW)
  const y = (count: number) => PAD_T + plotH - (totalTasks === 0 ? 0 : (count / totalTasks) * plotH)

  const pathFor = (key: 'earliest' | 'latest') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.day)} ${y(p[key])}`).join(' ')

  const corridorArea =
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.day)} ${y(p.earliest)}`).join(' ') +
    ' ' +
    [...points].reverse().map((p) => `L ${x(p.day)} ${y(p.latest)}`).join(' ') +
    ' Z'

  const optimizedPath = optimized
    ? optimized.map((v, day) => `${day === 0 ? 'M' : 'L'} ${x(day)} ${y(v)}`).join(' ')
    : null

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * totalTasks))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-edge" strokeWidth={1} />
            <text x={PAD_L - 8} y={y(tick) + 3} textAnchor="end" fontSize={9} className="fill-ink3 font-mono">
              {tick}
            </text>
          </g>
        ))}

        <path d={corridorArea} fill="rgba(212,175,55,0.08)" stroke="none" />

        <path d={pathFor('latest')} fill="none" stroke="#9C9C96" strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={pathFor('earliest')} fill="none" stroke="#D4AF37" strokeWidth={2.5} />
        {optimizedPath && <path d={optimizedPath} fill="none" stroke="#4F8F6B" strokeWidth={2} strokeDasharray="2 3" />}

        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const day = Math.round(f * maxDay)
          return (
            <text key={f} x={x(day)} y={H - 8} textAnchor="middle" fontSize={9} className="fill-ink3 font-mono">
              {day}
            </text>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-gold-400">
          <span className="w-3 h-0.5 bg-gold-500 inline-block" /> {t.corridorEarliest}
        </span>
        <span className="flex items-center gap-1.5 text-ink2">
          <span className="w-3 h-0.5 bg-silver-500 inline-block" /> {t.corridorLatest}
        </span>
        {optimizedPath && (
          <span className="flex items-center gap-1.5" style={{ color: '#4F8F6B' }}>
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: '#4F8F6B' }} /> {t.corridorOptimized}
          </span>
        )}
      </div>
    </div>
  )
}
