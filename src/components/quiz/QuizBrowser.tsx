import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuizStore } from '../../stores/quizStore'
import { SUBJECTS } from '../dashboard/StudyRecordPanel'

type AnswerStats = Record<string, { total: number; correct: number }>

function AccuracyBadge({ stats, id }: { stats: AnswerStats; id: string }) {
  const s = stats[id]
  if (!s || s.total === 0) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252540] text-[#5a5a7a]">
        未受験
      </span>
    )
  }
  const pct = Math.round((s.correct / s.total) * 100)
  const color = pct >= 70 ? 'text-green-400 bg-green-900/30' : pct >= 40 ? 'text-yellow-400 bg-yellow-900/30' : 'text-red-400 bg-red-900/30'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
      {s.correct}/{s.total}回 ({pct}%)
    </span>
  )
}

export default function QuizBrowser() {
  const { questions, loading, fetchQuestions, getFields, fetchAnswerStats } = useQuizStore()
  const [subject, setSubject] = useState('')
  const [field, setField] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [stats, setStats] = useState<AnswerStats>({})
  const [loadingStats, setLoadingStats] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!subject) { setFields([]); setField(null); return }
    getFields(subject).then(f => { setFields(f); setField(null) })
  }, [subject, getFields])

  useEffect(() => {
    if (!subject) return
    setExpandedId(null)
    setStats({})

    fetchQuestions(subject, field).then(() => {
      // fetchQuestions が完了すると useQuizStore の questions が更新される
      // ここでは ids を取得するため store から直接読む
    })
  }, [subject, field, fetchQuestions])

  // questions が変わったら正答率を取得
  useEffect(() => {
    if (questions.length === 0) { setStats({}); return }
    setLoadingStats(true)
    fetchAnswerStats(questions.map(q => q.id))
      .then(s => setStats(s))
      .finally(() => setLoadingStats(false))
  }, [questions, fetchAnswerStats])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 科目選択 */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#c8c8e8] mb-2">科目</label>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                subject === s
                  ? 'border-[#7c4dff] bg-[#7c4dff]/20 text-white'
                  : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:border-[#3a3a5c] hover:text-[#c8c8e8]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 分野選択 */}
      {subject && fields.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#c8c8e8] mb-2">分野</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setField(null)}
              className={`py-1.5 px-3 rounded-lg border text-sm transition-all ${
                field === null
                  ? 'border-[#7c4dff] bg-[#7c4dff]/20 text-white'
                  : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:border-[#3a3a5c]'
              }`}
            >
              全分野
            </button>
            {fields.map(f => (
              <button
                key={f}
                onClick={() => setField(f)}
                className={`py-1.5 px-3 rounded-lg border text-sm transition-all ${
                  field === f
                    ? 'border-[#7c4dff] bg-[#7c4dff]/20 text-white'
                    : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:border-[#3a3a5c]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 問題一覧 */}
      {subject && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm text-[#8888aa]">
              {loading ? '読み込み中...' : `${questions.length}問`}
            </p>
            {loadingStats && (
              <Loader2 className="w-3.5 h-3.5 text-[#5a5a7a] animate-spin" />
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-[#7c4dff] animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-center text-sm text-[#8888aa] py-8">この科目・分野には問題がありません</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-[#111125] rounded-xl border border-[#2a2a4a] overflow-hidden">
                  {/* 一覧行 */}
                  <button
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className="text-xs text-[#5a5a7a] w-6 shrink-0 text-right">{i + 1}</span>
                    <p className="flex-1 text-sm text-[#c8c8e8] line-clamp-1 min-w-0">{q.question}</p>
                    <AccuracyBadge stats={stats} id={q.id} />
                    {expandedId === q.id
                      ? <ChevronUp className="w-4 h-4 text-[#5a5a7a] shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-[#5a5a7a] shrink-0" />}
                  </button>

                  {/* 展開: 全文・選択肢・解説 */}
                  {expandedId === q.id && (
                    <div className="border-t border-[#2a2a4a] px-4 py-3 space-y-3">
                      <p className="text-sm text-[#c8c8e8] whitespace-pre-wrap leading-relaxed">{q.question}</p>

                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                              oi === q.correct_answer
                                ? 'bg-green-900/30 border border-green-700/50 text-green-300 font-medium'
                                : 'bg-[#1e1e3a] text-[#8888aa]'
                            }`}
                          >
                            <span className="shrink-0 font-bold">{String.fromCharCode(65 + oi)}.</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="bg-[#1a1a2e] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#5a5a7a] mb-1 font-medium">解説</p>
                          <p className="text-xs text-[#8888aa] whitespace-pre-wrap leading-relaxed">{q.explanation}</p>
                        </div>
                      )}

                      {/* 正答率詳細 */}
                      {stats[q.id] && stats[q.id].total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#252540] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#7c4dff] rounded-full"
                              style={{ width: `${Math.round((stats[q.id].correct / stats[q.id].total) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#8888aa] whitespace-nowrap">
                            正答率 {Math.round((stats[q.id].correct / stats[q.id].total) * 100)}%
                            （{stats[q.id].correct}/{stats[q.id].total}回）
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!subject && (
        <p className="text-center text-sm text-[#8888aa] py-12">科目を選択してください</p>
      )}
    </div>
  )
}
