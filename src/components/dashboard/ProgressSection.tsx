import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import StudyRecordModal, { SUBJECTS, formatMinutes } from './StudyRecordPanel'
import { useStudyStore } from '../../stores/studyStore'

type Period = 'today' | 'week' | 'month'

const periodLabels: Record<Period, string> = {
  today: '今日',
  week:  '今週',
  month: '今月',
}

const SUBJECT_COLORS: Record<string, string> = {
  '証券分析': '#7c4dff',
  '財務分析': '#60a5fa',
  '市場分析': '#a78bfa',
  '職業行為・倫理基準': '#2dd4bf',
}

// ── 試験日設定（CMA 2次試験 2026年6月7日） ──────────────
const EXAM_DATE = new Date(2026, 5, 7) // 月は 0-indexed

function calcDaysUntilExam(): number {
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = EXAM_DATE.getTime() - todayMidnight.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ── 連続勉強日数 ───────────────────────────────────────────
// dateStr は "M/D" 形式
function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const today = new Date()
  const uniqueDates = new Set(dates)

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

  // 今日に記録があれば今日から、なければ昨日からカウント開始
  const startOffset = uniqueDates.has(fmt(today)) ? 0 : 1
  let streak = 0

  for (let i = startOffset; i < 400; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (uniqueDates.has(fmt(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ── 日付パース ─────────────────────────────────────────────
function parseDateStr(dateStr: string): Date {
  const [m, d] = dateStr.split('/').map(Number)
  return new Date(new Date().getFullYear(), m - 1, d)
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  if (period === 'today') {
    return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end }
  }
  if (period === 'week') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
    return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow), end }
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end }
}

// ── グラフラベル ───────────────────────────────────────────
const RADIAN = Math.PI / 180

const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, outerRadius, name, value } = props
  if (cx == null || cy == null || midAngle == null || outerRadius == null) return null
  const radius = (outerRadius as number) + 32
  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN)
  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#8888aa" textAnchor={x > (cx as number) ? 'start' : 'end'}
      dominantBaseline="central" fontSize={10}>
      {name} {formatMinutes(value as number)}
    </text>
  )
}

const tooltipStyle = {
  backgroundColor: '#1e1e3a',
  border: '1px solid #2a2a4a',
  borderRadius: '12px',
  color: '#c8c8e8',
  fontSize: '12px',
}

// ── コンポーネント ─────────────────────────────────────────
export default function StudyStats() {
  const [period, setPeriod]     = useState<Period>('today')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const records = useStudyStore(s => s.records)

  const { start, end } = getDateRange(period)
  const filtered = records.filter(r => {
    const d = parseDateStr(r.date)
    return d >= start && d <= end
  })

  const totalMinutes = filtered.reduce((sum, r) => sum + r.minutes, 0)

  const getPrevMinutes = () => {
    const now = new Date()
    if (period === 'week') {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      const prevEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - 1, 23, 59, 59)
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - 6)
      return records
        .filter(r => { const d = parseDateStr(r.date); return d >= prevStart && d <= prevEnd })
        .reduce((sum, r) => sum + r.minutes, 0)
    }
    if (period === 'month') {
      const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
      return records
        .filter(r => { const d = parseDateStr(r.date); return d >= prevStart && d <= prevEnd })
        .reduce((sum, r) => sum + r.minutes, 0)
    }
    return null
  }

  const prevMinutes  = period !== 'today' ? getPrevMinutes() : null
  const diffMinutes  = prevMinutes !== null ? totalMinutes - prevMinutes : null

  const { start: weekStart } = getDateRange('week')
  const weekMinutes = records
    .filter(r => { const d = parseDateStr(r.date); return d >= weekStart })
    .reduce((sum, r) => sum + r.minutes, 0)

  const primaryLabel    = period === 'today' ? '今日の学習時間' : period === 'week' ? '今週の学習時間' : '今月の学習時間'
  const secondaryLabel  = period === 'today' ? '今週の学習時間' : period === 'week' ? '先週比' : '先月比'
  const secondaryValue  = period === 'today'
    ? formatMinutes(weekMinutes)
    : diffMinutes !== null
      ? `${diffMinutes >= 0 ? '+' : ''}${formatMinutes(Math.abs(diffMinutes))}`
      : '-'
  const secondaryPositive = period === 'today' ? false : (diffMinutes ?? 0) >= 0

  // 科目別内訳
  const breakdown = SUBJECTS
    .map(s => ({
      name:  s,
      value: filtered.filter(r => r.subject === s).reduce((sum, r) => sum + r.minutes, 0),
      color: SUBJECT_COLORS[s] ?? '#7c4dff',
    }))
    .filter(d => d.value > 0)

  // 連続日数 & 残り日数
  const streak      = useMemo(() => calcStreak(records.map(r => r.date)), [records])
  const daysLeft    = calcDaysUntilExam()

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-4 sm:p-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-white">学習時間レポート</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs px-3 py-1 rounded-full bg-[#7c4dff] hover:bg-[#6c3dee] text-white font-medium transition-colors whitespace-nowrap"
            >
              + 記録する
            </button>
            <div className="flex gap-1 bg-[#111125] rounded-full p-1">
              {(Object.keys(periodLabels) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
                    period === p ? 'bg-[#7c4dff] text-white font-medium' : 'text-[#8888aa] hover:text-[#c8c8e8]'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="bg-[#252540] rounded-[16px] p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-[#8888aa] mb-1">{primaryLabel}</p>
            <p className="text-xl sm:text-2xl font-bold text-white">
              {totalMinutes > 0 ? formatMinutes(totalMinutes) : <span className="text-[#8888aa] text-base sm:text-lg">-</span>}
            </p>
          </div>
          <div className="bg-[#252540] rounded-[16px] p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-[#8888aa] mb-1">{secondaryLabel}</p>
            <p className={`text-xl sm:text-2xl font-bold ${
              period === 'today'
                ? 'text-white'
                : secondaryPositive ? 'text-green-400' : 'text-[#c8c8e8]'
            }`}>
              {secondaryValue || <span className="text-[#8888aa] text-base sm:text-lg">-</span>}
            </p>
          </div>
        </div>

        {/* 円グラフ */}
        <div>
          <p className="text-xs text-[#8888aa] mb-2">科目別内訳</p>
          <div className="h-44 sm:h-52">
            {breakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-[#8888aa]">記録がありません</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    cx="50%" cy="50%"
                    startAngle={90} endAngle={-270}
                    outerRadius={55}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="#1a1a2e"
                    strokeWidth={2}
                    label={renderCustomLabel}
                    labelLine={{ stroke: '#3a3a5c', strokeWidth: 1 }}
                  >
                    {breakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatMinutes(v as number), '']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 連続日数 / 残り日数 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-[#1e1e3a] rounded-[16px] sm:rounded-[20px] border border-[#2a2a4a] p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-[#8888aa] mb-1">連続勉強日数</p>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {streak}<span className="text-xs sm:text-sm font-normal text-[#8888aa] ml-1">日</span>
          </p>
        </div>
        <div className="bg-[#1e1e3a] rounded-[16px] sm:rounded-[20px] border border-[#2a2a4a] p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-[#8888aa] mb-1">試験まで</p>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {daysLeft}<span className="text-xs sm:text-sm font-normal text-[#8888aa] ml-1">日</span>
          </p>
        </div>
      </div>

      <StudyRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
