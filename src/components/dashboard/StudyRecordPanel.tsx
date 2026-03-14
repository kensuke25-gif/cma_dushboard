import { useState } from 'react'

export const SUBJECTS = ['証券分析', '財務分析', '市場分析', '職業行為・倫理基準'] as const

export const subjectBadgeColors: Record<string, string> = {
  '証券分析': 'bg-blue-900/50 text-blue-300',
  '財務分析': 'bg-orange-900/50 text-orange-300',
  '市場分析': 'bg-violet-900/50 text-violet-300',
  '職業行為・倫理基準': 'bg-teal-900/50 text-teal-300',
}

export type StudyRecord = {
  id: number
  subject: string
  content: string
  minutes: number
  nextAction: string
  recordedAt: string
  date: string
}

export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}分`
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSave: (record: StudyRecord) => void
}

export default function StudyRecordModal({ isOpen, onClose, onSave }: Props) {
  const [subject, setSubject] = useState<string>(SUBJECTS[0])
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
    const date = `${now.getMonth() + 1}/${now.getDate()}`
    onSave({ id: Date.now(), subject, content: content.trim(), minutes, nextAction: nextAction.trim(), recordedAt, date })
    setContent('')
    setTimeValue('')
    setNextAction('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-800 rounded-2xl border border-zinc-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">学習を記録</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">科目</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">何をしたか</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="例：DCFモデルの復習、問題演習10問"
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
