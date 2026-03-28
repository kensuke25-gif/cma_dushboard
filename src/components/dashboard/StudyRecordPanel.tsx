import { useState } from 'react'
import { useStudyStore } from '../../stores/studyStore'

export const SUBJECTS = ['証券分析', '財務分析', '市場分析', '職業行為・倫理基準'] as const

export const subjectBadgeColors: Record<string, string> = {
  '証券分析': 'bg-[rgba(124,77,255,0.2)] text-[#b39dff]',
  '財務分析': 'bg-[rgba(96,165,250,0.2)] text-[#93c5fd]',
  '市場分析': 'bg-[rgba(167,139,250,0.3)] text-[#c4b5fd]',
  '職業行為・倫理基準': 'bg-[rgba(45,212,191,0.2)] text-[#5eead4]',
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
  defaultMinutes?: number
}

export default function StudyRecordModal({ isOpen, onClose, defaultMinutes }: Props) {
  const addRecord = useStudyStore(s => s.addRecord)
  const [subject, setSubject] = useState<string>(SUBJECTS[0])
  const [content, setContent] = useState('')
  const [timeValue, setTimeValue] = useState(defaultMinutes != null ? String(defaultMinutes) : '')
  const [timeUnit, setTimeUnit] = useState<'min' | 'hour'>('min')
  const [nextAction, setNextAction] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    const num = parseFloat(timeValue)
    if (!content.trim() || isNaN(num) || num <= 0) return
    const minutes = timeUnit === 'hour' ? Math.round(num * 60) : Math.round(num)
    const now = new Date()
    const recorded_at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const date = `${now.getMonth() + 1}/${now.getDate()}`
    await addRecord({ subject, content: content.trim(), minutes, next_action: nextAction.trim(), recorded_at, date })
    setContent('')
    setTimeValue('')
    setNextAction('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">学習を記録</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#8888aa] mb-1.5 block">科目</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8888aa] mb-1.5 block">何をしたか</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="例：DCFモデルの復習、問題演習10問"
              rows={2}
              className="w-full bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] placeholder-[#8888aa] resize-none focus:outline-none focus:border-[#7c4dff] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-[#8888aa] mb-1.5 block">学習時間</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={timeValue}
                onChange={e => setTimeValue(e.target.value)}
                placeholder="例：25"
                min="1"
                className="flex-1 bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] placeholder-[#8888aa] focus:outline-none focus:border-[#7c4dff] transition-colors"
              />
              <select
                value={timeUnit}
                onChange={e => setTimeUnit(e.target.value as 'min' | 'hour')}
                className="bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
              >
                <option value="min">分</option>
                <option value="hour">時間</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8888aa] mb-1.5 block">次は何から始めるか</label>
            <input
              type="text"
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder="例：財務分析 ROE分解の問題演習"
              className="w-full bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] placeholder-[#8888aa] focus:outline-none focus:border-[#7c4dff] transition-colors"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-[20px] bg-[#7c4dff] hover:bg-[#6c3dee] text-white text-sm font-medium transition-colors mt-1"
          >
            記録を保存
          </button>
        </div>
      </div>
    </div>
  )
}
