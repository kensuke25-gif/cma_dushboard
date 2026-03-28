import { useState, useEffect, useMemo } from 'react'
import { Settings, X, Check } from 'lucide-react'
import { useGoalStore, type UserGoals } from '../../stores/goalStore'
import { useStudyStore } from '../../stores/studyStore'

// ── 学習記録から期間別の合計分数を計算 ───────────────────────
function useStudyTotals() {
  const records = useStudyStore(s => s.records)

  return useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayMin = 0, weekMin = 0, monthMin = 0, totalMin = 0

    for (const r of records) {
      const d = r.created_at ? new Date(r.created_at) : null
      if (!d) continue
      const min = r.minutes ?? 0
      totalMin += min
      if (d >= monthStart) monthMin += min
      if (d >= weekStart)  weekMin  += min
      if (d >= todayStart) todayMin += min
    }
    return { todayMin, weekMin, monthMin, totalMin }
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

// ── 進捗カード ────────────────────────────────────────────────
interface CardProps {
  label: string
  actual: number   // 分
  target: number   // 分
  sub?: string     // 補助テキスト（例: 残り○日）
}

function ProgressCard({ label, actual, target, sub }: CardProps) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
  const remaining = Math.max(0, target - actual)
  const done = actual >= target

  const fmtMin = (m: number) =>
    m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ''}` : `${m}分`

  return (
    <div className="bg-[#0f0f23] rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
      </div>

      <div className="flex items-end gap-1">
        <span className={`text-xl font-bold ${done ? 'text-green-400' : 'text-white'}`}>
          {fmtMin(actual)}
        </span>
        <span className="text-xs text-gray-500 mb-1">/ {fmtMin(target)}</span>
      </div>

      {/* プログレスバー */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${done ? 'bg-green-400' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${done ? 'text-green-400' : 'text-gray-400'}`}>
          {done ? '達成!' : `残り ${fmtMin(remaining)}`}
        </span>
        <span className="text-xs text-gray-600">{pct}%</span>
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
    <div className="bg-[#0f0f23] rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">目標を設定する</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">試験日</span>
          <input
            type="date"
            value={form.examDate}
            onChange={e => set('examDate', e.target.value)}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">試験までの総目標時間（時間）</span>
          <input
            type="number" min={1} max={9999}
            value={form.examTotalHours}
            onChange={e => set('examTotalHours', Number(e.target.value))}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">月間目標時間（時間）</span>
          <input
            type="number" min={1} max={744}
            value={form.monthlyHours}
            onChange={e => set('monthlyHours', Number(e.target.value))}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">週間目標時間（時間）</span>
          <input
            type="number" min={1} max={168}
            value={form.weeklyHours}
            onChange={e => set('weeklyHours', Number(e.target.value))}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-gray-400">1日の目標時間（分）</span>
          <input
            type="number" min={1} max={1440}
            value={form.dailyMinutes}
            onChange={e => set('dailyMinutes', Number(e.target.value))}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="flex justify-end mt-5">
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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
  const { todayMin, weekMin, monthMin, totalMin } = useStudyTotals()
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const examDays = daysUntilExam(goals.examDate)
  const examDayLabel = examDays > 0 ? `残り${examDays}日` : '試験日'

  return (
    <div className="bg-[#13132a] rounded-2xl p-4 sm:p-5 space-y-3 border border-gray-800/50">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">学習時間の目標</h2>
        <button
          onClick={() => setShowSettings(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
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

      {/* 4カード */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <ProgressCard
          label="今日"
          actual={todayMin}
          target={goals.dailyMinutes}
        />
        <ProgressCard
          label="今週"
          actual={weekMin}
          target={goals.weeklyHours * 60}
        />
        <ProgressCard
          label="今月"
          actual={monthMin}
          target={goals.monthlyHours * 60}
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
