import { formatMinutes, subjectBadgeColors } from './StudyRecordPanel'
import { useStudyStore } from '../../stores/studyStore'

export default function RecentHistory() {
  const records = useStudyStore(s => s.records)

  return (
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
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map(r => (
                <tr key={r.id} className="border-b border-[#1e1e3a] hover:bg-[#252540]/50 transition-colors">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
