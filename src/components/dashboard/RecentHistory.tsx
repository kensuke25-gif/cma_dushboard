import { formatMinutes, subjectBadgeColors } from './StudyRecordPanel'
import { useStudyStore } from '../../stores/studyStore'

export default function RecentHistory() {
  const records = useStudyStore(s => s.records)

  return (
    <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-white mb-4">直近の学習履歴</h2>
      {records.length === 0 ? (
        <p className="text-xs text-[#8888aa] text-center py-8">まだ記録がありません</p>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto">
          {records.slice(0, 10).map(r => (
            <div key={r.id} className="bg-[#252540] rounded-[20px] p-3">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${subjectBadgeColors[r.subject] ?? 'bg-[#252540] text-[#8888aa]'}`}
                >
                  {r.subject}
                </span>
                <div className="flex items-center gap-2 text-xs text-[#8888aa]">
                  <span>{r.date}</span>
                  <span>{r.recorded_at}</span>
                </div>
              </div>
              <p className="text-sm text-[#c8c8e8] leading-snug mb-1">{r.content}</p>
              <p className="text-xs text-[#7c4dff] font-medium">{formatMinutes(r.minutes)}</p>
              {r.next_action && (
                <p className="text-xs text-[#8888aa] mt-1">
                  <span className="text-[#8888aa]">次→</span> {r.next_action}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
