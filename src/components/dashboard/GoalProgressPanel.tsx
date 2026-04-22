import { useState, useEffect, useMemo } from 'react'
import { Settings, X, Check, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'
import { useGoalStore, type UserGoals } from '../../stores/goalStore'
import { useStudyStore } from '../../stores/studyStore'

// ── 学習記録から期間別の合計分数を計算 ───────────────────────
function useStudyTotals() {
  const records = useStudyStore(s => s.records)

  return useMemo(() => {
    const now = new Date()
    const todayStart    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dow           = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
    const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1)

    // 前期の境界
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterdayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
    const lastWeekEnd    = new Date(weekStart.getTime() - 1)
    const lastWeekStart  = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate() - 6)
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)

    // 直近7日間（合格ペース算出用）
    const last7Start = new Date(todayStart)
    last7Start.setDate(todayStart.getDate() - 6)

    let todayMin = 0, weekMin = 0, monthMin = 0, totalMin = 0
    let yesterdayMin = 0, lastWeekMin = 0, lastMonthMin = 0
    let last7Min = 0

    for (const r of records) {
      const d = r.created_at ? new Date(r.created_at) : null
      if (!d) continue
      const min = r.minutes ?? 0
      totalMin += min
      if (d >= monthStart)                         monthMin     += min
      if (d >= weekStart)                          weekMin      += min
      if (d >= todayStart)                         todayMin     += min
      if (d >= yesterdayStart && d <= yesterdayEnd) yesterdayMin += min
      if (d >= lastWeekStart  && d <= lastWeekEnd)  lastWeekMin  += min
      if (d >= lastMonthStart && d <= lastMonthEnd) lastMonthMin += min
      if (d >= last7Start)                         last7Min     += min
    }
    return { todayMin, weekMin, monthMin, totalMin, yesterdayMin, lastWeekMin, lastMonthMin, last7Min }
  }, [records])
}

// ── 試験日までの残り日数 ──────────────────────────────────────
function daysUntilExam(examDateStr: string): number {
  if (!examDateStr) return 0
  const [y, m, d] = examDateStr.split('-').map(Number)
  const exam = new Date(y, m - 1, d)
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.ceil((exam.getTime() - todayMid.getTime()) / 86400000))
}

const fmtMin = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ''}` : `${m}m`

// ── 合格ペースメーター ─────────────────────────────────────
type PaceStatus = 'ontrack' | 'warning' | 'behind' | 'done' | 'noexam'

function PaceMeter({
  totalMin,
  last7Min,
  targetTotalMin,
  daysLeft,
}: {
  totalMin: number
  last7Min: number
  targetTotalMin: number
  daysLeft: number
}) {
  // 現在の1日あたり実績ペース（直近7日平均、分/日）
  const currentPacePerDay = last7Min / 7
  // 必要な残り学習分数
  const remainingMin = Math.max(0, targetTotalMin - totalMin)
  // 必要な1日あたりペース（分/日）
  const requiredPacePerDay = daysLeft > 0 ? remainingMin / daysLeft : 0
  // 現在のペース換算で試験日までに到達できる合計分数
  const projectedTotal = totalMin + currentPacePerDay * daysLeft
  // 達成率
  const projectedPct = targetTotalMin > 0
    ? Math.min(200, Math.round((projectedTotal / targetTotalMin) * 100))
    : 0

  let status: PaceStatus
  if (targetTotalMin === 0 || daysLeft === 0) status = 'noexam'
  else if (remainingMin === 0) status = 'done'
  else if (projectedTotal >= targetTotalMin) status = 'ontrack'
  else if (projectedTotal >= targetTotalMin * 0.9) status = 'warning'
  else status = 'behind'

  const style: Record<PaceStatus, { badge: string; text: string; bar: string; label: string }> = {
    ontrack: { badge: 'bg-green-900/30 border-green-500/40',  text: 'text-green-400',  bar: 'bg-green-500',  label: '順調!' },
    warning: { badge: 'bg-amber-900/30 border-amber-500/40',  text: 'text-amber-400',  bar: 'bg-amber-500',  label: '要ペースアップ' },
    behind:  { badge: 'bg-red-900/30 border-red-500/40',      text: 'text-red-400',    bar: 'bg-red-500',    label: '危険' },
    done:    { badge: 'bg-[#7c4dff]/20 border-[#7c4dff]/40',  text: 'text-[#a78bfa]',  bar: 'bg-[#a78bfa]',  label: '目標達成!' },
    noexam:  { badge: 'bg-[#252540] border-[#3a3a5c]',        text: 'text-[#8888aa]',  bar: 'bg-[#3a3a5c]',  label: '未設定' },
  }
  const s = style[status]

  const msg = status === 'done'
    ? '累計学習時間の目標を達成済み。お疲れさまでした。'
    : status === 'noexam'
      ? '試験日と目標時間を設定するとペース診断を表示します。'
      : status === 'ontrack'
        ? `現在のペース（${fmtMin(Math.round(currentPacePerDay))}/日）で到達見込み。`
        : `必要ペース ${fmtMin(Math.round(requiredPacePerDay))}/日、現在 ${fmtMin(Math.round(currentPacePerDay))}/日。`

  return (
    <div className={`rounded-[16px] border px-3 py-2.5 ${s.badge}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Target className={`w-3.5 h-3.5 ${s.text}`} strokeWidth={1.5} />
          <span className="text-xs font-semibold text-white">合格ペース診断</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badge} ${s.text}`}>
          {s.label}
        </span>
      </div>

      {status !== 'noexam' && (
        <>
          {/* 到達見込みバー（目標100%を緑点線で示す） */}
          <div className="relative w-full h-2 bg-[#111125] rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
              style={{ width: `${Math.min(100, projectedPct)}%` }}
            />
            {/* 100%ライン */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/40"
              style={{ left: '100%' }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`text-[11px] ${s.text} font-medium`}>
              試験日までに {projectedPct}% 到達見込み
            </span>
            <span className="text-[10px] text-[#8888aa]">
              {msg}
            </span>
          </div>
        </>
      )}

      {status === 'noexam' && (
        <p className="text-[11px] text-[#8888aa]">{msg}</p>
      )}
    </div>
  )
}

// ── 前期比バッジ ──────────────────────────────────────────────
function DiffBadge({ actual, prev, label }: { actual: number; prev: number; label: string }) {
  const diff = actual - prev
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 shrink-0">
        <TrendingUp className="w-3 h-3" strokeWidth={2} />
        +{fmtMin(diff)}
        <span className="text-[#8888aa] font-normal">{label}</span>
      </span>
    )
  }
  if (diff < 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400 shrink-0">
        <TrendingDown className="w-3 h-3" strokeWidth={2} />
        -{fmtMin(Math.abs(diff))}
        <span className="text-[#8888aa] font-normal">{label}</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#8888aa] shrink-0">
      <Minus className="w-3 h-3" strokeWidth={2} />
      ±0
      <span className="font-normal">{label}</span>
    </span>
  )
}

// ── 進捗カード ────────────────────────────────────────────────
interface CardProps {
  label: string
  actual: number   // 分
  target: number   // 分
  prev?: number    // 前期の分（比較用）
  prevLabel?: string
  sub?: string     // 補助テキスト（例: 残り○日）
}

function ProgressCard({ label, actual, target, prev, prevLabel, sub }: CardProps) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
  const remaining = Math.max(0, target - actual)
  const done = actual >= target

  return (
    <div className="bg-[#252540] rounded-[16px] p-3 sm:p-4 flex flex-col gap-2 min-w-0">
      {/* ラベル */}
      <span className="text-[10px] sm:text-xs text-[#8888aa] font-medium">{label}</span>

      {/* 実績 / 目標 */}
      <div className="flex items-end gap-1">
        <span className={`text-lg sm:text-xl font-bold leading-none ${done ? 'text-[#a78bfa]' : 'text-white'}`}>
          {fmtMin(actual)}
        </span>
        <span className="text-[10px] text-[#8888aa] mb-0.5">/ {fmtMin(target)}</span>
      </div>

      {/* プログレスバー */}
      <div className="w-full h-1.5 bg-[#111125] rounded-full overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${done ? 'bg-[#a78bfa]' : 'bg-[#7c4dff]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* フッター: 残り/達成 ← → 前期比 or 残りXX日 */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-medium shrink-0 ${done ? 'text-[#a78bfa]' : 'text-[#8888aa]'}`}>
          {done ? '達成!' : `残り ${fmtMin(remaining)}`}
        </span>
        {prev !== undefined && prevLabel ? (
          <DiffBadge actual={actual} prev={prev} label={prevLabel} />
        ) : sub ? (
          <span className="text-[10px] text-[#8888aa] shrink-0">{sub}</span>
        ) : null}
      </div>
    </div>
  )
}

// ── 目標設定フォーム ──────────────────────────────────────────
interface SettingsFormProps {
  initial: UserGoals
  saving: boolean
  onSave: (g: UserGoals) => void
  onClose: () => void
}

function SettingsForm({ initial, saving, onSave, onClose }: SettingsFormProps) {
  const [form, setForm] = useState<UserGoals>({ ...initial })
  const set = (k: keyof UserGoals, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="bg-[#1e1e3a] rounded-[16px] p-4 sm:p-5 border border-[#2a2a4a]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">目標を設定する</h3>
        <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#8888aa]">試験日</span>
          <input
            type="date"
            value={form.examDate}
            onChange={e => set('examDate', e.target.value)}
            className="bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c4dff] transition-colors"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#8888aa]">試験までの総目標時間（時間）</span>
          <input
            type="number" min={1} max={9999}
            value={form.examTotalHours}
            onChange={e => set('examTotalHours', Number(e.target.value))}
            className="bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c4dff] transition-colors"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#8888aa]">月間目標時間（時間）</span>
          <input
            type="number" min={1} max={744}
            value={form.monthlyHours}
            onChange={e => set('monthlyHours', Number(e.target.value))}
            className="bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c4dff] transition-colors"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#8888aa]">週間目標時間（時間）</span>
          <input
            type="number" min={1} max={168}
            value={form.weeklyHours}
            onChange={e => set('weeklyHours', Number(e.target.value))}
            className="bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c4dff] transition-colors"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-[#8888aa]">1日の目標時間（分）</span>
          <input
            type="number" min={1} max={1440}
            value={form.dailyMinutes}
            onChange={e => set('dailyMinutes', Number(e.target.value))}
            className="bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c4dff] transition-colors"
          />
        </label>
      </div>

      <div className="flex justify-end mt-4 sm:mt-5">
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#7c4dff] hover:bg-[#6c3dee] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Check className="w-4 h-4" />
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────────────────
export default function GoalProgressPanel() {
  const { goals, saving, fetchGoals, saveGoals } = useGoalStore()
  const { todayMin, weekMin, monthMin, totalMin, yesterdayMin, lastWeekMin, lastMonthMin, last7Min } = useStudyTotals()
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const examDays = daysUntilExam(goals.examDate)
  const examDayLabel = examDays > 0 ? `残り${examDays}日` : '試験日'

  return (
    <div className="bg-[#1e1e3a] rounded-[20px] p-4 sm:p-5 space-y-3 border border-[#2a2a4a]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">学習時間の目標</h2>
        <button
          onClick={() => setShowSettings(v => !v)}
          className="flex items-center gap-1.5 text-xs text-[#8888aa] hover:text-[#c8c8e8] transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          目標を設定
        </button>
      </div>

      {/* 設定フォーム */}
      {showSettings && (
        <SettingsForm
          initial={goals}
          saving={saving}
          onSave={async (g) => { await saveGoals(g); setShowSettings(false) }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 合格ペースメーター */}
      <PaceMeter
        totalMin={totalMin}
        last7Min={last7Min}
        targetTotalMin={goals.examTotalHours * 60}
        daysLeft={examDays}
      />

      {/* 4カード */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <ProgressCard
          label="今日"
          actual={todayMin}
          target={goals.dailyMinutes}
          prev={yesterdayMin}
          prevLabel="前日比"
        />
        <ProgressCard
          label="今週"
          actual={weekMin}
          target={goals.weeklyHours * 60}
          prev={lastWeekMin}
          prevLabel="先週比"
        />
        <ProgressCard
          label="今月"
          actual={monthMin}
          target={goals.monthlyHours * 60}
          prev={lastMonthMin}
          prevLabel="先月比"
        />
        <ProgressCard
          label="試験まで"
          actual={totalMin}
          target={goals.examTotalHours * 60}
          sub={examDayLabel}
        />
      </div>
    </div>
  )
}
