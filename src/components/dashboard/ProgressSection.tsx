import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

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
    { name: '証券分析', value: 50, color: '#60a5fa' },
    { name: '財務分析', value: 25, color: '#fb923c' },
    { name: 'CF', value: 10, color: '#34d399' },
    { name: '経済', value: 0, color: '#f87171' },
  ].filter(d => d.value > 0),
  week: [
    { name: '証券分析', value: 180, color: '#60a5fa' },
    { name: '財務分析', value: 120, color: '#fb923c' },
    { name: 'CF', value: 90, color: '#34d399' },
    { name: '経済', value: 40, color: '#f87171' },
  ],
  month: [
    { name: '証券分析', value: 720, color: '#60a5fa' },
    { name: '財務分析', value: 480, color: '#fb923c' },
    { name: 'CF', value: 380, color: '#34d399' },
    { name: '経済', value: 160, color: '#f87171' },
  ],
}

const bottomStats = [
  { label: '連続日数', value: '8日' },
  { label: '残り日数', value: '87日' },
]

const customTooltipStyle = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
}

export default function StudyStats() {
  const [period, setPeriod] = useState<Period>('today')

  const stats = periodStats[period]
  const data = timeBreakdown[period]

  return (
    <div className="flex flex-col gap-4">
      {/* 期間タブ */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">学習時間レポート</h2>
          <div className="flex gap-1 bg-gray-800 rounded-full p-1">
            {(Object.keys(periodLabels) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1 rounded-full transition-all ${
                  period === p
                    ? 'bg-orange-500 text-white font-medium'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* 学習時間カード */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{stats.primary.label}</p>
            <p className="text-2xl font-bold text-white">{stats.primary.value}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{stats.secondary.label}</p>
            <p className={`text-2xl font-bold ${stats.secondary.value.startsWith('+') ? 'text-green-400' : 'text-white'}`}>
              {stats.secondary.value}
            </p>
          </div>
        </div>

        {/* 勉強時間内訳 円グラフ */}
        <div>
          <p className="text-xs text-gray-400 mb-3">勉強時間の内訳</p>
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${v}分`, '']}
                    contentStyle={customTooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {data.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-400 flex-1">{d.name}</span>
                  <span className="text-xs font-medium text-gray-200">{d.value}分</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 連続日数 / 残り日数 */}
      <div className="grid grid-cols-2 gap-3">
        {bottomStats.map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
