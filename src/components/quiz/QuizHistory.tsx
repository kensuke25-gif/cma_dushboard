import { useEffect } from 'react'
import { useQuizStore } from '../../stores/quizStore'
import { History } from 'lucide-react'

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}分${sec > 0 ? `${sec}秒` : ''}` : `${sec}秒`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function QuizHistory() {
  const { sessions, fetchSessions } = useQuizStore()

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-[#5a5a7a]" />
        <h3 className="text-sm font-medium text-[#c8c8e8]">回答履歴</h3>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-[#2a2a4a] bg-[#111125]">
          <p className="text-sm text-[#5a5a7a]">まだ記録がありません</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#2a2a4a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a4a] bg-[#0d0d1e]">
                {['日時', '科目', '分野', '正答率', '問題数', '時間'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-[#8888aa] font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const rate = Math.round((s.correct_count / s.total_questions) * 100)
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-[#2a2a4a] last:border-0 ${i % 2 === 0 ? 'bg-[#111125]' : 'bg-[#0d0d1e]'}`}
                  >
                    <td className="px-3 py-2.5 text-[#8888aa] whitespace-nowrap text-xs">{formatDate(s.created_at)}</td>
                    <td className="px-3 py-2.5 text-[#c8c8e8] whitespace-nowrap">{s.subject}</td>
                    <td className="px-3 py-2.5 text-[#8888aa] whitespace-nowrap">
                      {s.field ?? '全分野'}{s.is_weak_mode ? <span className="ml-1 text-xs text-orange-400">苦手</span> : null}
                    </td>
                    <td className={`px-3 py-2.5 font-semibold whitespace-nowrap ${
                      rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{rate}%</td>
                    <td className="px-3 py-2.5 text-[#8888aa] whitespace-nowrap">{s.correct_count}/{s.total_questions}</td>
                    <td className="px-3 py-2.5 text-[#8888aa] whitespace-nowrap">{formatDuration(s.duration_seconds)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
