import { useState, useEffect } from 'react'
import { Trash2, Plus, Loader2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { useQuizStore, type QuizQuestion } from '../../stores/quizStore'
import { SUBJECTS } from '../dashboard/StudyRecordPanel'

type NewQuestionForm = {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

const EMPTY_FORM: NewQuestionForm = {
  question: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  explanation: '',
}

export default function QuizEditor() {
  const { questions, loading, fetchQuestions, getFields, deleteQuestion, addQuestion } = useQuizStore()
  const [subject, setSubject] = useState('')
  const [field, setField] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewQuestionForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  useEffect(() => {
    if (!subject) { setFields([]); setField(null); return }
    getFields(subject).then(f => { setFields(f); setField(null) })
  }, [subject, getFields])

  useEffect(() => {
    if (!subject) return
    fetchQuestions(subject, field)
  }, [subject, field, fetchQuestions])

  async function handleDelete(q: QuizQuestion) {
    setDeletingId(q.id)
    await deleteQuestion(q.id)
    setDeletingId(null)
    if (expandedId === q.id) setExpandedId(null)
  }

  async function handleAdd() {
    if (!subject || !form.question.trim() || form.options.some(o => !o.trim())) return
    setSaving(true)
    try {
      await addQuestion(subject, field ?? subject, {
        question: form.question.trim(),
        options: form.options.map(o => o.trim()),
        correct_answer: form.correct_answer,
        explanation: form.explanation.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const canAdd = !!subject && form.question.trim() !== '' &&
    form.options.every(o => o.trim() !== '')

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
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#8888aa]">
              {loading ? '読み込み中...' : `${questions.length}問`}
            </p>
            {addSuccess && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" />追加しました
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-[#7c4dff] animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-center text-sm text-[#8888aa] py-8">この科目・分野には問題がありません</p>
          ) : (
            <div className="space-y-2 mb-6">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-[#111125] rounded-xl border border-[#2a2a4a] overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-xs text-[#5a5a7a] w-6 shrink-0 text-right">{i + 1}</span>
                    <p className="flex-1 text-sm text-[#c8c8e8] line-clamp-1">{q.question}</p>
                    <button
                      onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                      className="text-[#5a5a7a] hover:text-[#8888aa] transition-colors p-1"
                    >
                      {expandedId === q.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(q)}
                      disabled={deletingId === q.id}
                      className="text-[#5a5a7a] hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                    >
                      {deletingId === q.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  {expandedId === q.id && (
                    <div className="border-t border-[#2a2a4a] px-4 py-3 space-y-2">
                      <p className="text-sm text-[#c8c8e8] whitespace-pre-wrap">{q.question}</p>
                      <div className="space-y-1 mt-2">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`text-xs px-2 py-1 rounded-lg ${
                              oi === q.correct_answer
                                ? 'bg-green-900/30 text-green-300 font-medium'
                                : 'text-[#8888aa]'
                            }`}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-[#6a6a9a] mt-2 whitespace-pre-wrap">{q.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 問題追加フォーム */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl border border-dashed border-[#3a3a5c] text-sm text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#7c4dff] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              問題を追加
            </button>
          ) : (
            <div className="bg-[#111125] rounded-2xl border border-[#2a2a4a] p-4 space-y-3">
              <p className="text-sm font-medium text-[#c8c8e8]">新しい問題</p>

              <textarea
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="問題文"
                rows={3}
                className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-3 py-2 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] resize-none"
              />

              <div className="space-y-2">
                <p className="text-xs text-[#8888aa]">選択肢</p>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setForm(f => ({ ...f, correct_answer: i }))}
                      className={`w-6 h-6 rounded-full border text-xs font-bold shrink-0 transition-all ${
                        form.correct_answer === i
                          ? 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-[#3a3a5c] text-[#5a5a7a] hover:border-[#7c4dff]'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const next = [...form.options]
                        next[i] = e.target.value
                        setForm(f => ({ ...f, options: next }))
                      }}
                      placeholder={`選択肢${String.fromCharCode(65 + i)}`}
                      className="flex-1 bg-[#1e1e3a] border border-[#3a3a5c] rounded-lg px-3 py-1.5 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff]"
                    />
                  </div>
                ))}
                <p className="text-[10px] text-[#5a5a7a]">正解の選択肢をクリックして選択</p>
              </div>

              <textarea
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                placeholder="解説（省略可）"
                rows={2}
                className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-3 py-2 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] resize-none"
              />

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                  className="flex-1 py-2.5 rounded-xl border border-[#2a2a4a] text-sm text-[#8888aa] hover:border-[#3a3a5c] transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!canAdd || saving}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    canAdd && !saving
                      ? 'bg-[#7c4dff] text-white hover:bg-[#6a3de8]'
                      : 'bg-[#252540] text-[#4a4a6a] cursor-not-allowed'
                  }`}
                >
                  {saving ? '追加中...' : '追加する'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
