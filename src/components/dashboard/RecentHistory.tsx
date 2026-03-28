import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { formatMinutes, subjectBadgeColors, SUBJECTS } from './StudyRecordPanel'
import { useStudyStore, type StudyRecord } from '../../stores/studyStore'

// ── 編集モーダル ──────────────────────────────────────────────
type EditModalProps = {
  record: StudyRecord
  onClose: () => void
}

function EditRecordModal({ record, onClose }: EditModalProps) {
  const updateRecord = useStudyStore(s => s.updateRecord)
  const [subject, setSubject] = useState(record.subject)
  const [content, setContent] = useState(record.content)
  const [timeValue, setTimeValue] = useState(String(record.minutes))
  const [timeUnit, setTimeUnit] = useState<'min' | 'hour'>('min')
  const [nextAction, setNextAction] = useState(record.next_action ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const num = parseFloat(timeValue)
    if (!content.trim() || isNaN(num) || num <= 0) return
    const minutes = timeUnit === 'hour' ? Math.round(num * 60) : Math.round(num)
    setSaving(true)
    await updateRecord(record.id, {
      subject,
      content: content.trim(),
      minutes,
      next_action: nextAction.trim(),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">学習記録を編集</h3>
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
                min="1"
                className="flex-1 bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
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
              className="w-full bg-[#252540] border border-[#3a3a5c] rounded-[20px] px-3 py-2.5 text-sm text-[#c8c8e8] placeholder-[#8888aa] focus:outline-none focus:border-[#7c4dff] transition-colors"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 rounded-[20px] bg-[#7c4dff] hover:bg-[#6c3dee] disabled:opacity-50 text-white text-sm font-medium transition-colors mt-1"
          >
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────────────────
export default function RecentHistory() {
  const records = useStudyStore(s => s.records)
  const [editingRecord, setEditingRecord] = useState<StudyRecord | null>(null)

  return (
    <>
      <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-white mb-3">直近の学習履歴</h2>
        {records.length === 0 ? (
          <p className="text-xs text-[#8888aa] text-center py-8">まだ記録がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a4a]">
                  <th className="text-left text-[#9090bb] font-medium pb-2 pr-3 whitespace-nowrap">科目</th>
                  <th className="text-left text-[#9090bb] font-medium pb-2 pr-2 whitespace-nowrap">日付</th>
                  <th className="text-left text-[#9090bb] font-medium pb-2 pr-2">内容</th>
                  <th className="text-right text-[#9090bb] font-medium pb-2 whitespace-nowrap">時間</th>
                  <th className="pb-2 w-6" />
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map(r => (
                  <tr key={r.id} className="border-b border-[#1e1e3a] hover:bg-[#252540]/50 transition-colors group">
                    <td className="py-1.5 pr-3 align-top">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${subjectBadgeColors[r.subject] ?? 'bg-[#252540] text-[#8888aa]'}`}>
                        {r.subject}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-[#8888aa] whitespace-nowrap align-top">{r.date}</td>
                    <td className="py-1.5 pr-2 text-[#c8c8e8] align-top">
                      <p className="line-clamp-1 leading-snug">{r.content}</p>
                      {r.next_action && (
                        <p className="text-[10px] text-[#6a6a8a] line-clamp-1 mt-0.5">→ {r.next_action}</p>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-[#7c4dff] font-medium whitespace-nowrap align-top">{formatMinutes(r.minutes)}</td>
                    <td className="py-1.5 align-top">
                      <button
                        onClick={() => setEditingRecord(r)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#5a5a7a] hover:text-[#a78bfa] hover:bg-[#2a2a4a] transition-all"
                        title="編集"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRecord && (
        <EditRecordModal
          key={editingRecord.id}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </>
  )
}
