import { useState, useEffect } from 'react'
import { Trash2, Plus, Loader2, ChevronDown, ChevronUp, CheckCircle, Pencil, X } from 'lucide-react'
import { useQuizStore, type QuizQuestion } from '../../stores/quizStore'
import { SUBJECTS } from '../dashboard/StudyRecordPanel'

type QuestionForm = {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

const EMPTY_FORM: QuestionForm = {
  question: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  explanation: '',
}

function toForm(q: QuizQuestion): QuestionForm {
  return {
    question: q.question,
    options: [...q.options],
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? '',
  }
}

function QuestionFormFields({
  form,
  onChange,
}: {
  form: QuestionForm
  onChange: (form: QuestionForm) => void
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={form.question}
        onChange={e => onChange({ ...form, question: e.target.value })}
        placeholder="問題文"
        rows={3}
        className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-3 py-2 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] resize-none"
      />

      <div className="space-y-2">
        <p className="text-xs text-[#8888aa]">選択肢</p>
        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...form, correct_answer: i })}
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
                onChange({ ...form, options: next })
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
        onChange={e => onChange({ ...form, explanation: e.target.value })}
        placeholder="解説（省略可）"
        rows={2}
        className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-3 py-2 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] resize-none"
      />
    </div>
  )
}

export default function QuizEditor() {
  const { questions, loading, fetchQuestions, getFields, deleteQuestion, addQuestion, updateQuestion, renameField } = useQuizStore()
  const [subject, setSubject] = useState('')
  const [field, setField] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<QuestionForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  // 問題編集状態
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<QuestionForm>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  // 分野リネーム状態
  const [renamingField, setRenamingField] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  useEffect(() => {
    if (!subject) { setFields([]); setField(null); return }
    getFields(subject).then(f => { setFields(f); setField(null) })
  }, [subject, getFields])

  async function handleRenameField(oldName: string) {
    const newName = renameValue.trim()
    if (!newName || newName === oldName) { setRenamingField(null); return }
    setRenameSaving(true)
    try {
      await renameField(subject, oldName, newName)
      setFields(prev => prev.map(f => (f === oldName ? newName : f)))
      if (field === oldName) setField(newName)
    } finally {
      setRenameSaving(false)
      setRenamingField(null)
    }
  }

  useEffect(() => {
    if (!subject) return
    fetchQuestions(subject, field)
  }, [subject, field, fetchQuestions])

  async function handleDelete(q: QuizQuestion) {
    setDeletingId(q.id)
    await deleteQuestion(q.id)
    setDeletingId(null)
    if (expandedId === q.id) setExpandedId(null)
    if (editingId === q.id) setEditingId(null)
  }

  async function handleAdd() {
    if (!subject || !addForm.question.trim() || addForm.options.some(o => !o.trim())) return
    setSaving(true)
    try {
      await addQuestion(subject, field ?? subject, {
        question: addForm.question.trim(),
        options: addForm.options.map(o => o.trim()),
        correct_answer: addForm.correct_answer,
        explanation: addForm.explanation.trim() || undefined,
      })
      setAddForm(EMPTY_FORM)
      setShowAddForm(false)
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(q: QuizQuestion) {
    setEditingId(q.id)
    setEditForm(toForm(q))
    setExpandedId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleUpdate() {
    if (!editingId) return
    if (!editForm.question.trim() || editForm.options.some(o => !o.trim())) return
    setEditSaving(true)
    try {
      await updateQuestion(editingId, {
        question: editForm.question.trim(),
        options: editForm.options.map(o => o.trim()),
        correct_answer: editForm.correct_answer,
        explanation: editForm.explanation.trim() || undefined,
      })
      setEditingId(null)
      setEditSuccess(true)
      setTimeout(() => setEditSuccess(false), 2000)
    } finally {
      setEditSaving(false)
    }
  }

  const canAdd = !!subject && addForm.question.trim() !== '' && addForm.options.every(o => o.trim() !== '')
  const canUpdate = editForm.question.trim() !== '' && editForm.options.every(o => o.trim() !== '')

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

      {/* 分野管理（リネーム） */}
      {subject && fields.length > 0 && (
        <div className="mb-5 bg-[#111125] rounded-xl border border-[#2a2a4a] overflow-hidden">
          <p className="text-xs font-medium text-[#5a5a7a] px-4 py-2.5 border-b border-[#2a2a4a]">分野の管理</p>
          <div className="divide-y divide-[#1e1e38]">
            {fields.map(f => (
              <div key={f} className="px-4 py-2.5">
                {renamingField === f ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameField(f)
                        if (e.key === 'Escape') setRenamingField(null)
                      }}
                      className="flex-1 bg-[#1e1e3a] border border-[#7c4dff] rounded-lg px-3 py-1 text-sm text-[#c8c8e8] focus:outline-none"
                    />
                    <button
                      onClick={() => handleRenameField(f)}
                      disabled={renameSaving}
                      className="px-3 py-1 text-xs bg-[#7c4dff] text-white rounded-lg hover:bg-[#6a3de8] disabled:opacity-50 transition-colors shrink-0"
                    >
                      {renameSaving ? '保存中…' : '保存'}
                    </button>
                    <button
                      onClick={() => setRenamingField(null)}
                      className="p-1 text-[#5a5a7a] hover:text-[#c8c8e8] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-[#c8c8e8] truncate">{f}</span>
                    <button
                      onClick={() => { setRenamingField(f); setRenameValue(f) }}
                      title="分野名を変更"
                      className="p-1.5 rounded-lg text-[#5a5a7a] hover:text-[#a78bfa] hover:bg-[#7c4dff]/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
            {(addSuccess || editSuccess) && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" />
                {editSuccess ? '更新しました' : '追加しました'}
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
                  {editingId === q.id ? (
                    /* インライン編集フォーム */
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-[#a78bfa]">問題 {i + 1} を編集</p>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-[#5a5a7a] hover:text-[#c8c8e8] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <QuestionFormFields form={editForm} onChange={setEditForm} />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-2.5 rounded-xl border border-[#2a2a4a] text-sm text-[#8888aa] hover:border-[#3a3a5c] transition-colors"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleUpdate}
                          disabled={!canUpdate || editSaving}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            canUpdate && !editSaving
                              ? 'bg-[#7c4dff] text-white hover:bg-[#6a3de8]'
                              : 'bg-[#252540] text-[#4a4a6a] cursor-not-allowed'
                          }`}
                        >
                          {editSaving ? '保存中...' : '保存する'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 通常表示 */
                    <>
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
                          onClick={() => startEdit(q)}
                          title="編集"
                          className="text-[#5a5a7a] hover:text-[#a78bfa] transition-colors p-1"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(q)}
                          disabled={deletingId === q.id}
                          title="削除"
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
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 問題追加フォーム */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 rounded-xl border border-dashed border-[#3a3a5c] text-sm text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#7c4dff] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              問題を追加
            </button>
          ) : (
            <div className="bg-[#111125] rounded-2xl border border-[#2a2a4a] p-4">
              <p className="text-sm font-medium text-[#c8c8e8] mb-3">新しい問題</p>
              <QuestionFormFields form={addForm} onChange={setAddForm} />
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM) }}
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
