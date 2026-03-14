import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import StudyRecordModal, { SUBJECTS, formatMinutes } from './StudyRecordPanel'
import { useStudyStore } from '../../stores/studyStore'

type Period = 'today' | 'week' | 'month'

const periodLabels: Record<Period, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
}

const SUBJECT_COLORS: Record<string, string> = {
  '証券分析': '#7c4dff',
  '財務分析': '#60a5fa',
  '市場分析': '#a78bfa',
  '職業行為・倫理基準': '#2dd4bf',
}

const bottomStats = [
  { label: '連続日数', value: '計算中' },
  { label: '残り日数', value: '87日' },
]

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

const customTooltipStyle = {
  backgroundColor: '#1e1e3a',
  border: '1px solid #2a2a4a',
  borderRadius: '12px',
  color: '#c8c8e8',
  fontSize: '12px',
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { start, end }
  }
  if (period === 'week') {
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
    return { start, end }
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start, end }
}

// "M/D" 形式の日付文字列を Date に変換
function parseDateStr(dateStr: string): Date {
  const [m, d] = dateStr.split('/').map(Number)
  const year = new Date().getFullYear()
  return new Date(year, m - 1, d)
}

export default function StudyStats() {
  const [period, setPeriod] = useState<Period>('today')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const records = useStudyStore(s => s.records)

  // 期間フィルタ
  const { start, end } = getDateRange(period)
  const filtered = records.filter(r => {
    const d = parseDateStr(r.date)
    return d >= start && d <= end
  })

  const totalMinutes = filtered.reduce((sum, r) => sum + r.minutes, 0)

  // 先週/先月の合計
  const getPrevMinutes = () => {
    const now = new Date()
    if (period === 'week') {
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 1, 23, 59, 59)
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - 6)
      return records
        .filter(r => { const d = parseDateStr(r.date); return d >= prevStart && d <= prevEnd })
        .reduce((sum, r) => sum + r.minutes, 0)
    }
    if (period === 'month') {
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
      return records
        .filter(r => { const d = parseDateStr(r.date); return d >= prevStart && d <= prevEnd })
        .reduce((sum, r) => sum + r.minutes, 0)
    }
    return null
  }

  const prevMinutes = period !== 'today' ? getPrevMinutes() : null
  const diffMinutes = prevMinutes !== null ? totalMinutes - prevMinutes : null

  // 今日のデータをweekのsecondaryに使う
  const { start: todayStart } = getDateRange('today')
  const todayMinutes = records
    .filter(r => { const d = parseDateStr(r.date); return d >= todayStart })
    .reduce((sum, r) => sum + r.minutes, 0)

  const primaryLabel = period === 'today' ? '今日の学習時間'
    : period === 'week' ? '今週の学習時間' : '今月の学習時間'
  const secondaryLabel = period === 'today' ? '今週の学習時間'
    : period === 'week' ? '先週比' : '先月比'
  const secondaryValue = period === 'today'
    ? formatMinutes(records.filter(r => { const d = parseDateStr(r.date); const { start: ws } = getDateRange('week'); return d >= ws }).reduce((sum, r) => sum + r.minutes, 0))
    : diffMinutes !== null
      ? `${diffMinutes >= 0 ? '+' : ''}${formatMinutes(Math.abs(diffMinutes))}`
      : '-'
  const secondaryPositive = period === 'today' ? false : (diffMinutes ?? 0) >= 0

  // 科目別内訳
  const breakdown = SUBJECTS
    .map(s => ({
      name: s,
      value: filtered.filter(r => r.subject === s).reduce((sum, r) => sum + r.minutes, 0),
      color: SUBJECT_COLORS[s] ?? '#7c4dff',
    }))
    .filter(d => d.value > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">学習時間レポート</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs px-3 py-1 rounded-full bg-[#7c4dff] hover:bg-[#6c3dee] text-white font-medium transition-colors"
            >
              + 記録する
            </button>
            <div className="flex gap-1 bg-[#111125] rounded-full p-1">
              {(Object.keys(periodLabels) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-xs px-3 py-1 rounded-full transition-all ${
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
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#252540] rounded-[20px] p-4">
            <p className="text-xs text-[#8888aa] mb-1">{primaryLabel}</p>
            <p className="text-2xl font-bold text-white">
              {totalMinutes > 0 ? formatMinutes(totalMinutes) : <span className="text-[#8888aa] text-lg">-</span>}
            </p>
          </div>
          <div className="bg-[#252540] rounded-[20px] p-4">
            <p className="text-xs text-[#8888aa] mb-1">{secondaryLabel}</p>
            <p className={`text-2xl font-bold ${
              period === 'today'
                ? (todayMinutes > 0 ? 'text-white' : 'text-[#8888aa]')
                : secondaryPositive ? 'text-green-400' : 'text-[#c8c8e8]'
            }`}>
              {secondaryValue || <span className="text-[#8888aa] text-lg">-</span>}
            </p>
          </div>
        </div>

        {/* 円グラフ */}
        <div>
          <p className="text-xs text-[#8888aa] mb-2">勉強時間の内訳</p>
          <div className="h-52">
            {breakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-[#8888aa]">記録がありません</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    outerRadius={60}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="#1a1a2e"
                    strokeWidth={2}
                    label={renderCustomLabel}
                    labelLine={{ stroke: '#3a3a5c', strokeWidth: 1 }}
                  >
                    {breakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [formatMinutes(v as number), '']}
                    contentStyle={customTooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 連続日数 / 残り日数 */}
      <div className="grid grid-cols-2 gap-3">
        {bottomStats.map(s => (
          <div key={s.label} className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-4 text-center">
            <p className="text-xs text-[#8888aa] mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <StudyRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
