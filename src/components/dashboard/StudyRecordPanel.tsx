import { useState } from 'react'

type StudyRecord = {
  id: number
  content: string
  minutes: number
  nextAction: string
  recordedAt: string
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}分`
}

export default function StudyRecordPanel() {
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<StudyRecord[]>([])
  const [content, setContent] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [timeUnit, setTimeUnit] = useState<'min' | 'hour'>('min')
  const [nextAction, setNextAction] = useState('')

  const handleSubmit = () => {
    const num = parseFloat(timeValue)
    if (!content.trim() || isNaN(num) || num <= 0) return
    const minutes = timeUnit === 'hour' ? Math.round(num * 60) : Math.round(num)
    const now = new Date()
    const recordedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setRecords(prev => [
      { id: Date.now(), content: content.trim(), minutes, nextAction: nextAction.trim(), recordedAt },
      ...prev,
    ])
    setContent('')
    setTimeValue('')
    setNextAction('')
    setOpen(false)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">学習記録</h2>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-medium transition-colors"
        >
          {open ? 'キャンセル' : '+ 記録する'}
        </button>
      </div>

      {/* 記録フォーム */}
      {open && (
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">何をしたか</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="例：証券分析 DCFモデルの復習"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">学習時間</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={timeValue}
                onChange={e => setTimeValue(e.target.value)}
                placeholder="例：25"
                min="1"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <select
                value={timeUnit}
                onChange={e => setTimeUnit(e.target.value as 'min' | 'hour')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value="min">分</option>
                <option value="hour">時間</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">次は何から始めるか</label>
            <input
              type="text"
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder="例：財務分析 ROE分解の問題演習"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
          >
            記録を保存
          </button>
        </div>
      )}

      {/* 記録リスト */}
      {records.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-4">まだ記録がありません</p>
      ) : (
        <div className="flex flex-col gap-3">
          {records.slice(0, 3).map(r => (
            <div key={r.id} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm text-gray-100 font-medium leading-snug">{r.content}</span>
                <span className="text-xs text-gray-500 shrink-0">{r.recordedAt}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-orange-400 font-medium">{formatMinutes(r.minutes)}</span>
                {r.nextAction && (
                  <span className="text-xs text-gray-400">
                    <span className="text-gray-600">次→</span> {r.nextAction}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
