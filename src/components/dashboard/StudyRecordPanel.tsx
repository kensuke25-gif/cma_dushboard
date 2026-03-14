import { useState } from 'react'

export type StudyRecord = {
  id: number
  content: string
  minutes: number
  nextAction: string
  recordedAt: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSave: (record: StudyRecord) => void
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}分`
}

export { formatMinutes }

export default function StudyRecordModal({ isOpen, onClose, onSave }: Props) {
  const [content, setContent] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [timeUnit, setTimeUnit] = useState<'min' | 'hour'>('min')
  const [nextAction, setNextAction] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    const num = parseFloat(timeValue)
    if (!content.trim() || isNaN(num) || num <= 0) return
    const minutes = timeUnit === 'hour' ? Math.round(num * 60) : Math.round(num)
    const now = new Date()
    const recordedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    onSave({ id: Date.now(), content: content.trim(), minutes, nextAction: nextAction.trim(), recordedAt })
    setContent('')
    setTimeValue('')
    setNextAction('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* バックドロップ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* モーダル本体 */}
      <div className="relative w-full max-w-md bg-zinc-800 rounded-2xl border border-zinc-700 p-6 shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">学習を記録</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* フォーム */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">何をしたか</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="例：証券分析 DCFモデルの復習"
              rows={2}
              className="w-full bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">学習時間</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={timeValue}
                onChange={e => setTimeValue(e.target.value)}
                placeholder="例：25"
                min="1"
                className="flex-1 bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <select
                value={timeUnit}
                onChange={e => setTimeUnit(e.target.value as 'min' | 'hour')}
                className="bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value="min">分</option>
                <option value="hour">時間</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">次は何から始めるか</label>
            <input
              type="text"
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder="例：財務分析 ROE分解の問題演習"
              className="w-full bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors mt-1"
          >
            記録を保存
          </button>
        </div>
      </div>
    </div>
  )
}

// 記録リスト表示用コンポーネント（ProgressSection内で使用）
export function RecordList({ records }: { records: StudyRecord[] }) {
  if (records.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {records.slice(0, 3).map(r => (
        <div key={r.id} className="bg-zinc-700/50 rounded-xl p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs text-zinc-100 font-medium leading-snug">{r.content}</span>
            <span className="text-xs text-zinc-500 shrink-0">{r.recordedAt}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-orange-400 font-medium">{formatMinutes(r.minutes)}</span>
            {r.nextAction && (
              <span className="text-xs text-zinc-400">
                <span className="text-zinc-600">次→</span> {r.nextAction}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
