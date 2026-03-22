import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useQuizStore } from '../../stores/quizStore'
import { SUBJECTS } from '../dashboard/StudyRecordPanel'
import MathText from '../MathText'

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
  const { questions, loading, fetchQuestions, getFields, fetchAnswerStats, deleteField } = useQuizStore()
  const [subject, setSubject] = useState('')
  const [field, setField] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({})
  const [stats, setStats] = useState<AnswerStats>({})
  const [loadingStats, setLoadingStats] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // 削除確認中の分野名
  const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 科目変更: 分野一覧を取得
  useEffect(() => {
    if (!subject) { setFields([]); setField(null); setFieldCounts({}); return }
    getFields(subject).then(f => {
      setFields(f)
      setField(null)
    })
  }, [subject, getFields])

  // 分野一覧が変わったら各分野の件数を取得
  useEffect(() => {
    if (fields.length === 0) { setFieldCounts({}); return }
    Promise.all(
      fields.map(f =>
        useQuizStore.getState().countExisting(subject, f).then(c => [f, c] as [string, number])
      )
    ).then(results => {
      setFieldCounts(Object.fromEntries(results))
    })
  }, [fields, subject])

  // 科目・分野変更: 問題を取得
  useEffect(() => {
    if (!subject) return
    setExpandedId(null)
    setStats({})
    fetchQuestions(subject, field)
  }, [subject, field, fetchQuestions])

  // 問題が変わったら正答率を取得
  useEffect(() => {
    if (questions.length === 0) { setStats({}); return }
    setLoadingStats(true)
    fetchAnswerStats(questions.map(q => q.id))
      .then(s => setStats(s))
      .finally(() => setLoadingStats(false))
  }, [questions, fetchAnswerStats])

  const handleDeleteField = async (f: string) => {
    setDeleting(true)
    await deleteField(subject, f)
    // 分野リストと件数を再取得
    const updatedFields = await getFields(subject)
    setFields(updatedFields)
    if (field === f) setField(null)
    setConfirmDeleteField(null)
    setDeleting(false)
  }

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

      {/* 分野管理（件数表示＋削除） */}
      {subject && fields.length > 0 && (
        <div className="mb-5 bg-[#111125] rounded-xl border border-[#2a2a4a] overflow-hidden">
          <p className="text-xs font-medium text-[#5a5a7a] px-4 py-2.5 border-b border-[#2a2a4a]">
            分野ごとの登録問題数
          </p>
          <div className="divide-y divide-[#1e1e38]">
            {fields.map(f => {
              const isConfirming = confirmDeleteField === f
              const cnt = fieldCounts[f] ?? '…'
              return (
                <div key={f}>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <span className="flex-1 text-sm text-[#c8c8e8] truncate">{f}</span>
                    <span className="text-xs text-[#5a5a7a] tabular-nums shrink-0">{cnt}問</span>
                    <button
                      onClick={() => setConfirmDeleteField(isConfirming ? null : f)}
                      title="この分野を削除"
                      className="shrink-0 p-1.5 rounded-lg text-[#5a5a7a] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                  {isConfirming && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 border-t border-red-900/40">
                      <p className="flex-1 text-xs text-red-300">
                        「{f}」の問題を全て削除しますか？
                      </p>
                      <button
                        onClick={() => setConfirmDeleteField(null)}
                        className="px-3 py-1 text-xs text-[#8888aa] hover:text-white rounded-lg hover:bg-[#252540] transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDeleteField(f)}
                        disabled={deleting}
                        className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting ? '削除中…' : '削除する'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 分野フィルター */}
      {subject && fields.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#c8c8e8] mb-2">分野で絞り込む</label>
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

                  {expandedId === q.id && (
                    <div className="border-t border-[#2a2a4a] px-4 py-3 space-y-3">
                      <p className="text-sm text-[#c8c8e8] leading-relaxed">
                        <MathText text={q.question} />
                      </p>

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
                            <span><MathText text={opt} /></span>
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="bg-[#1a1a2e] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#5a5a7a] mb-1 font-medium">解説</p>
                          <p className="text-xs text-[#8888aa] leading-relaxed">
                            <MathText text={q.explanation} />
                          </p>
                        </div>
                      )}

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
