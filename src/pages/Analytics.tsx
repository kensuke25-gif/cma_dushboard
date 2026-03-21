import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useStudyStore, type StudyRecord } from '../stores/studyStore'
import SubjectHeatmap from '../components/problems/SubjectHeatmap'
import StreakBanner    from '../components/problems/StreakBanner'
import { useProblemStore } from '../stores/problemStore'
import { SUBJECT_CONFIGS } from '../types/problem'

const SUBJECT_COLORS: Record<string, string> = {
  '証券分析': '#7c4dff',
  '財務分析': '#60a5fa',
  '市場分析': '#a78bfa',
  '職業行為・倫理基準': '#2dd4bf',
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const tooltipStyle = {
  backgroundColor: '#1e1e3a',
  border: '1px solid #2a2a4a',
  borderRadius: '12px',
  color: '#c8c8e8',
  fontSize: '12px',
  padding: '8px 12px',
}

// ---- ヘルパー ----

function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toLocalDateKey(iso: string): string {
  return toDayKey(new Date(iso))
}

function toMMDD(dayKey: string): string {
  const [, m, d] = dayKey.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDayKey(d)
}

function exportCSV(records: StudyRecord[]) {
  const header = ['日付', '科目', '学習内容', '時間（分）', '次のアクション']
  const rows = [...records]
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    .map(r => [
      r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP') : r.date,
      r.subject,
      r.content,
      r.minutes,
      r.next_action,
    ])
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cma_study_${toDayKey(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- ChartCard ----

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#111125] border border-[#2a2a4a] rounded-2xl p-5">
      <h3 className="text-sm font-medium text-[#c8c8e8] mb-4">{title}</h3>
      {children}
    </div>
  )
}

// ---- メインページ ----

export default function Analytics() {
  const { records, loading, fetchRecords } = useStudyStore()
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // 1. 累計学習時間の推移（過去60日）
  const cumulativeData = useMemo(() => {
    const days = Array.from({ length: 60 }, (_, i) => daysAgo(59 - i))
    const dailyMap: Record<string, number> = {}
    records.forEach(r => {
      if (!r.created_at) return
      const key = toLocalDateKey(r.created_at)
      dailyMap[key] = (dailyMap[key] ?? 0) + r.minutes
    })
    let cum = 0
    return days.map(d => {
      cum += (dailyMap[d] ?? 0) / 60
      return { date: toMMDD(d), value: Math.round(cum * 10) / 10 }
    })
  }, [records])

  // 2. 週別学習時間（直近8週）
  const weeklyData = useMemo(() => {
    const now = new Date()
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
    const monday = new Date(now)
    monday.setDate(now.getDate() - dow)
    monday.setHours(0, 0, 0, 0)

    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(monday)
      weekStart.setDate(monday.getDate() - (7 - i) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const startKey = toDayKey(weekStart)
      const endKey = toDayKey(weekEnd)
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      const total = records
        .filter(r => {
          if (!r.created_at) return false
          const k = toLocalDateKey(r.created_at)
          return k >= startKey && k <= endKey
        })
        .reduce((s, r) => s + r.minutes, 0)
      return { label, hours: Math.round(total / 60 * 10) / 10 }
    })
  }, [records])

  // 3. 科目別学習割合（全期間）
  const subjectData = useMemo(() => {
    const map: Record<string, number> = {}
    records.forEach(r => {
      map[r.subject] = (map[r.subject] ?? 0) + r.minutes
    })
    return Object.entries(map)
      .map(([name, minutes]) => ({ name, value: minutes }))
      .sort((a, b) => b.value - a.value)
  }, [records])

  // 4. 曜日別学習パターン（累計）
  const dowData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    records.forEach(r => {
      if (!r.created_at) return
      totals[new Date(r.created_at).getDay()] += r.minutes
    })
    return DOW_LABELS.map((label, i) => ({
      label,
      hours: Math.round(totals[i] / 60 * 10) / 10,
    }))
  }, [records])

  // カレンダー用：月のセル配列
  const calendarCells = useMemo(() => {
    const firstDow = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [calYear, calMonth])

  // カレンダー用：日付 → 記録マップ
  const recordsByDate = useMemo(() => {
    const map: Record<string, StudyRecord[]> = {}
    const prefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-`
    records.forEach(r => {
      if (!r.created_at) return
      const key = toLocalDateKey(r.created_at)
      if (!key.startsWith(prefix)) return
      ;(map[key] ??= []).push(r)
    })
    return map
  }, [records, calYear, calMonth])

  const selectedDayRecords = selectedDate ? (recordsByDate[selectedDate] ?? []) : []
  const totalHours = Math.round(records.reduce((s, r) => s + r.minutes, 0) / 60 * 10) / 10

  // 問題演習統計
  const {
    getSubjectStats,
    loadingProblems,
    problems: allProblems,
  } = useProblemStore()

  const problemSummary = useMemo(() => {
    const subjects = SUBJECT_CONFIGS.map((cfg) => {
      const s = getSubjectStats(cfg.key)
      return {
        name:      cfg.shortLabel,
        accentHex: cfg.accentHex,
        ...s,
      }
    })
    const totalProblems  = subjects.reduce((s, x) => s + x.total,    0)
    const totalAnswered  = subjects.reduce((s, x) => s + x.answered, 0)
    const totalCorrect   = subjects.reduce((s, x) => s + x.correct,  0)
    const overallAccuracy = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0
    return { subjects, totalProblems, totalAnswered, totalCorrect, overallAccuracy }
  }, [getSubjectStats])

  function prevMonth() {
    setSelectedDate(null)
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectedDate(null)
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  function toggleDay(day: number) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(prev => prev === key ? null : key)
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">学習レポート</h1>
            {!loading && records.length > 0 && (
              <p className="text-xs text-[#8888aa] mt-0.5">累計 {totalHours} 時間</p>
            )}
          </div>
          <button
            onClick={() => exportCSV(records)}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2a2a4a] text-sm text-[#c8c8e8] hover:border-[#3a3a5c] disabled:opacity-40 transition-all"
          >
            <Download className="w-4 h-4" />
            CSVエクスポート
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#7c4dff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-[#8888aa] py-20 text-sm">学習記録がありません</p>
        ) : (
          <div className="space-y-4">

            {/* Row 1: 累計推移 + 週別 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="累計学習時間の推移（過去60日）">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={cumulativeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="date" tick={{ fill: '#8888aa', fontSize: 10 }} interval={11} />
                    <YAxis tick={{ fill: '#8888aa', fontSize: 10 }} unit="h" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}h`, '累計']} />
                    <Line type="monotone" dataKey="value" stroke="#7c4dff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="週別学習時間（直近8週）">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="label" tick={{ fill: '#8888aa', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#8888aa', fontSize: 10 }} unit="h" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}h`, '学習時間']} />
                    <Bar dataKey="hours" fill="#7c4dff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Row 2: 科目別 + 曜日別 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard title="科目別学習割合（全期間）">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={subjectData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                      {subjectData.map(e => (
                        <Cell key={e.name} fill={SUBJECT_COLORS[e.name] ?? '#5a5a7a'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => [`${Math.round(Number(v) / 60 * 10) / 10}h`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                  {subjectData.map(e => (
                    <span key={e.name} className="flex items-center gap-1.5 text-xs text-[#8888aa]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SUBJECT_COLORS[e.name] ?? '#5a5a7a' }} />
                      {e.name}
                    </span>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="曜日別学習パターン（累計）">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dowData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="label" tick={{ fill: '#8888aa', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8888aa', fontSize: 10 }} unit="h" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v)}h`, '学習時間']} />
                    <Bar dataKey="hours" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* ミニカレンダー */}
            <ChartCard title="学習カレンダー">
              {/* 月ナビ */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#1a1a3a] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-white">{calYear}年{calMonth + 1}月</span>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#1a1a3a] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 mb-1">
                {DOW_LABELS.map(d => (
                  <div key={d} className="text-center text-[10px] text-[#5a5a7a] py-1">{d}</div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((day, i) => {
                  if (day === null) return <div key={`e${i}`} />
                  const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const hasRecord = !!recordsByDate[key]
                  const isSelected = selectedDate === key
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDay(day)}
                      className={`flex flex-col items-center justify-center h-9 rounded-lg text-xs transition-all ${
                        isSelected
                          ? 'bg-[#7c4dff] text-white'
                          : hasRecord
                          ? 'text-white hover:bg-[#1a1a3a]'
                          : 'text-[#5a5a7a] hover:bg-[#1a1a3a]'
                      }`}
                    >
                      <span>{day}</span>
                      {hasRecord && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-[#7c4dff] mt-0.5" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 選択日サマリ */}
              {selectedDate && (
                <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ja-JP', {
                        month: 'long', day: 'numeric', weekday: 'short',
                      })}
                    </span>
                    {selectedDayRecords.length > 0 && (
                      <span className="text-xs text-[#8888aa]">
                        合計 {selectedDayRecords.reduce((s, r) => s + r.minutes, 0)} 分
                      </span>
                    )}
                  </div>
                  {selectedDayRecords.length === 0 ? (
                    <p className="text-xs text-[#5a5a7a]">この日の記録はありません</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayRecords.map(r => (
                        <div key={r.id} className="flex items-start gap-2 text-xs">
                          <span
                            className="mt-1 w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: SUBJECT_COLORS[r.subject] ?? '#5a5a7a' }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[#8888aa]">{r.subject}</span>
                            <span className="mx-1 text-[#3a3a5c]">・</span>
                            <span className="text-[#c8c8e8] break-words">{r.content}</span>
                          </div>
                          <span className="shrink-0 text-[#8888aa]">{r.minutes}分</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ChartCard>

          </div>
        )}

        {/* ========== 問題演習セクション ========== */}
        <div className="mt-2 space-y-4">

          {/* セクションタイトル */}
          <div className="flex items-center gap-2 pt-2">
            <div className="w-1 h-4 rounded-full bg-[#7c4dff]" />
            <h2 className="text-sm font-semibold text-white">
              問題演習統計
            </h2>
          </div>

          {/* ストリークバナー */}
          <StreakBanner />

          {/* 問題データがない場合 */}
          {allProblems.length === 0 && !loadingProblems && (
            <div className="rounded-xl border border-[#2a2a4a] bg-[#111125]
                            py-10 text-center">
              <p className="text-sm text-[#8888aa]">
                問題データがまだ登録されていません
              </p>
              <p className="text-xs text-[#5a5a7a] mt-1">
                Supabase の problems テーブルにデータを追加してください
              </p>
            </div>
          )}

          {/* 問題データがある場合 */}
          {allProblems.length > 0 && (
            <>
              {/* 演習サマリーカード */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 全体サマリー */}
                <ChartCard title="演習サマリー（全科目）">
                  <div className="flex items-center gap-6">

                    {/* ドーナツグラフ */}
                    <div className="shrink-0">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: '正解',
                                value: problemSummary.totalCorrect,
                                fill: '#22c55e',
                              },
                              {
                                name: '不正解・部分',
                                value: problemSummary.totalAnswered
                                     - problemSummary.totalCorrect,
                                fill: '#ef4444',
                              },
                              {
                                name: '未回答',
                                value: problemSummary.totalProblems
                                     - problemSummary.totalAnswered,
                                fill: '#252540',
                              },
                            ].filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {[
                              { fill: '#22c55e' },
                              { fill: '#ef4444' },
                              { fill: '#252540' },
                            ].map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 数値サマリー */}
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-2xl font-bold text-white tabular-nums">
                          {problemSummary.overallAccuracy}
                          <span className="text-sm text-[#8888aa] font-normal">%</span>
                        </p>
                        <p className="text-xs text-[#8888aa]">全体正答率</p>
                      </div>
                      <div className="space-y-1 text-xs text-[#8888aa]">
                        <p>
                          回答済み:
                          <span className="text-[#c8c8e8] ml-1 font-medium">
                            {problemSummary.totalAnswered}
                            <span className="text-[#5a5a7a]">
                              /{problemSummary.totalProblems}問
                            </span>
                          </span>
                        </p>
                        <p>
                          正解数:
                          <span className="text-green-400 ml-1 font-medium">
                            {problemSummary.totalCorrect}問
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </ChartCard>

                {/* 科目別正答率 横棒グラフ */}
                <ChartCard title="科目別正答率">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={problemSummary.subjects.filter((s) => s.answered > 0)}
                      layout="vertical"
                      margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#2a2a4a"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: '#8888aa', fontSize: 10 }}
                        unit="%"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#8888aa', fontSize: 10 }}
                        width={52}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${Number(v)}%`, '正答率']}
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {problemSummary.subjects
                          .filter((s) => s.answered > 0)
                          .map((s, i) => (
                            <Cell key={i} fill={s.accentHex} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {problemSummary.subjects.every((s) => s.answered === 0) && (
                    <p className="text-center text-xs text-[#5a5a7a] py-4">
                      まだ回答データがありません
                    </p>
                  )}
                </ChartCard>

              </div>

              {/* 苦手分野ヒートマップ */}
              <ChartCard title="苦手分野ヒートマップ">
                <SubjectHeatmap />
              </ChartCard>

            </>
          )}

        </div>

      </div>
    </div>
  )
}
