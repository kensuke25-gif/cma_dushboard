import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'
import StudyRecordModal, { type StudyRecord } from './StudyRecordPanel'

type Period = 'today' | 'week' | 'month'

const periodLabels: Record<Period, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
}

const periodStats: Record<Period, { primary: { label: string; value: string }; secondary: { label: string; value: string } }> = {
  today: {
    primary: { label: '今日の学習時間', value: '1h 25m' },
    secondary: { label: '今週の学習時間', value: '8h 40m' },
  },
  week: {
    primary: { label: '今週の学習時間', value: '8h 40m' },
    secondary: { label: '先週比', value: '+2h 10m' },
  },
  month: {
    primary: { label: '今月の学習時間', value: '34h 20m' },
    secondary: { label: '先月比', value: '+6h 05m' },
  },
}

const timeBreakdown: Record<Period, { name: string; value: number; color: string }[]> = {
  today: [
    { name: '証券分析', value: 50, color: '#7c4dff' },
    { name: '財務分析', value: 25, color: '#60a5fa' },
    { name: '市場分析', value: 10, color: '#a78bfa' },
  ],
  week: [
    { name: '証券分析', value: 180, color: '#7c4dff' },
    { name: '財務分析', value: 120, color: '#60a5fa' },
    { name: '市場分析', value: 90, color: '#a78bfa' },
    { name: '職業行為・倫理基準', value: 40, color: '#2dd4bf' },
  ],
  month: [
    { name: '証券分析', value: 720, color: '#7c4dff' },
    { name: '財務分析', value: 480, color: '#60a5fa' },
    { name: '市場分析', value: 380, color: '#a78bfa' },
    { name: '職業行為・倫理基準', value: 160, color: '#2dd4bf' },
  ],
}

const bottomStats = [
  { label: '連続日数', value: '8日' },
  { label: '残り日数', value: '87日' },
]

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}分`
}

const RADIAN = Math.PI / 180

const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, outerRadius, name, value } = props
  if (cx == null || cy == null || midAngle == null || outerRadius == null) return null
  const radius = (outerRadius as number) + 32
  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN)
  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#8888aa"
      textAnchor={x > (cx as number) ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10}
    >
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

type Props = {
  records: StudyRecord[]
  onSaveRecord: (record: StudyRecord) => void
}

export default function StudyStats({ records: _records, onSaveRecord }: Props) {
  const [period, setPeriod] = useState<Period>('today')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const stats = periodStats[period]
  const data = timeBreakdown[period]

  return (
    <div className="flex flex-col gap-4">
      {/* 学習時間レポートカード */}
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
                    period === p
                      ? 'bg-[#7c4dff] text-white font-medium'
                      : 'text-[#8888aa] hover:text-[#c8c8e8]'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 学習時間カード */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#252540] rounded-[20px] p-4">
            <p className="text-xs text-[#8888aa] mb-1">{stats.primary.label}</p>
            <p className="text-2xl font-bold text-white">{stats.primary.value}</p>
          </div>
          <div className="bg-[#252540] rounded-[20px] p-4">
            <p className="text-xs text-[#8888aa] mb-1">{stats.secondary.label}</p>
            <p className={`text-2xl font-bold ${stats.secondary.value.startsWith('+') ? 'text-green-400' : 'text-white'}`}>
              {stats.secondary.value}
            </p>
          </div>
        </div>

        {/* 勉強時間内訳 円グラフ */}
        <div>
          <p className="text-xs text-[#8888aa] mb-2">勉強時間の内訳</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
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
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatMinutes(v as number), '']}
                  contentStyle={customTooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
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

      {/* 記録モーダル */}
      <StudyRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveRecord}
      />
    </div>
  )
}
