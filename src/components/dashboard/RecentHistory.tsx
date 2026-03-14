import { type StudyRecord, formatMinutes, subjectBadgeColors } from './StudyRecordPanel'

type Props = { records: StudyRecord[] }

export default function RecentHistory({ records }: Props) {
  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-white mb-4">直近の学習履歴</h2>
      {records.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-8">まだ記録がありません</p>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto">
          {records.slice(0, 10).map(r => (
            <div key={r.id} className="bg-zinc-700/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${subjectBadgeColors[r.subject] ?? 'bg-zinc-700 text-zinc-300'}`}
                >
                  {r.subject}
                </span>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{r.date}</span>
                  <span>{r.recordedAt}</span>
                </div>
              </div>
              <p className="text-sm text-zinc-100 leading-snug mb-1">{r.content}</p>
              <p className="text-xs text-orange-400 font-medium">{formatMinutes(r.minutes)}</p>
              {r.nextAction && (
                <p className="text-xs text-zinc-500 mt-1">
                  <span className="text-zinc-600">次→</span> {r.nextAction}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
