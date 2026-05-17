import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { useQAStore } from '../stores/qaStore'

export default function QAEditPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const items = useQAStore(s => s.items)
  const initialize = useQAStore(s => s.initialize)
  const addItem = useQAStore(s => s.addItem)
  const updateItem = useQAStore(s => s.updateItem)

  useEffect(() => { initialize() }, [initialize])

  const target = useMemo(() => items.find(i => i.id === id), [items, id])

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [subject, setSubject] = useState('')
  const [unit, setUnit] = useState('')

  useEffect(() => {
    if (target) {
      setQuestion(target.question)
      setAnswer(target.answer)
      setSubject(target.subject)
      setUnit(target.unit)
    }
  }, [target])

  const subjectSuggestions = useMemo(
    () => Array.from(new Set(items.map(i => i.subject).filter(Boolean))),
    [items]
  )
  const unitSuggestions = useMemo(
    () => Array.from(new Set(items.filter(i => !subject || i.subject === subject).map(i => i.unit).filter(Boolean))),
    [items, subject]
  )

  const canSave = question.trim().length > 0 && answer.trim().length > 0

  const onSave = () => {
    if (!canSave) return
    const payload = { question: question.trim(), answer: answer.trim(), subject: subject.trim(), unit: unit.trim() }
    if (isEdit && target) {
      updateItem(target.id, payload)
      navigate(`/qa/${target.id}`)
    } else {
      const created = addItem(payload)
      navigate(`/qa/${created.id}`)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link to="/qa" className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white mb-4">
        <ChevronLeft className="w-3.5 h-3.5" />
        一覧へ戻る
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">{isEdit ? '問題を編集' : '新しい問題を作成'}</h1>
      <p className="text-xs text-[#8888aa] mb-6">問題文と答えを入力してください。科目・単元はフィルターに利用されます。</p>

      <div className="bg-[#111125] border border-[#2a2a4a] rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#8888aa] mb-1.5">科目</label>
            <input
              list="qa-subject-list"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="例: 財務分析"
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white placeholder-[#5a5a7a] focus:border-[#7c4dff] focus:outline-none"
            />
            <datalist id="qa-subject-list">
              {subjectSuggestions.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs text-[#8888aa] mb-1.5">単元</label>
            <input
              list="qa-unit-list"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="例: キャッシュフロー計算書"
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white placeholder-[#5a5a7a] focus:border-[#7c4dff] focus:outline-none"
            />
            <datalist id="qa-unit-list">
              {unitSuggestions.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#8888aa] mb-1.5">問題文</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="例: のれんの償却方法を説明せよ"
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white placeholder-[#5a5a7a] focus:border-[#7c4dff] focus:outline-none resize-y"
          />
        </div>

        <div>
          <label className="block text-xs text-[#8888aa] mb-1.5">答え</label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="模範解答を入力"
            rows={6}
            className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white placeholder-[#5a5a7a] focus:border-[#7c4dff] focus:outline-none resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            to="/qa"
            className="px-4 py-2 rounded-xl text-sm text-[#8888aa] hover:text-white transition-colors"
          >
            キャンセル
          </Link>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7c4dff] text-white text-sm font-medium hover:bg-[#6c3ddf] disabled:bg-[#3a3a5c] disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
