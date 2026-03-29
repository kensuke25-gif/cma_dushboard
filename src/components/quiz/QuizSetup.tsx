import { useState, useEffect } from 'react'
import { BookOpen, Brain, Shuffle, AlertCircle } from 'lucide-react'
import { useQuizStore } from '../../stores/quizStore'
import { SUBJECTS } from '../dashboard/StudyRecordPanel'

export type QuizConfig = {
  subject: string
  field: string | null
  count: number
  weakMode: boolean
}

type Props = {
  onStart: (config: QuizConfig) => void
}

const COUNT_OPTIONS = [5, 10, 20]

export default function QuizSetup({ onStart }: Props) {
  const [subject, setSubject] = useState('')
  const [field, setField] = useState<string | null>(null)
  const [fields, setFields] = useState<string[]>([])
  const [count, setCount] = useState(10)
  const [customCount, setCustomCount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [weakMode, setWeakMode] = useState(false)
  const [availableCount, setAvailableCount] = useState<number | null>(null)

  const { getFields, fetchQuestions, fetchWeakQuestions, questions, weakQuestionIds, loading } = useQuizStore()

  // 科目変更時に分野リストを取得（保存済みの並び順を適用）
  useEffect(() => {
    if (!subject) { setFields([]); setField(null); return }
    getFields(subject).then(rawFields => {
      try {
        const saved = localStorage.getItem(`quiz_field_order_${subject}`)
        if (saved) {
          const savedOrder = JSON.parse(saved) as string[]
          const ordered = [
            ...savedOrder.filter(f => rawFields.includes(f)),
            ...rawFields.filter(f => !savedOrder.includes(f)),
          ]
          setFields(ordered)
        } else {
          setFields(rawFields)
        }
      } catch {
        setFields(rawFields)
      }
      setField(null)
    })
  }, [subject, getFields])

  // 設定変更時に問題数を取得
  useEffect(() => {
    if (!subject) { setAvailableCount(null); return }
    fetchQuestions(subject, field).then(() => {
      fetchWeakQuestions()
    })
  }, [subject, field, fetchQuestions, fetchWeakQuestions])

  useEffect(() => {
    if (!subject) return
    if (weakMode) {
      const weakInSet = questions.filter(q => weakQuestionIds.has(q.id))
      setAvailableCount(weakInSet.length)
    } else {
      setAvailableCount(questions.length)
    }
  }, [questions, weakQuestionIds, weakMode, subject])

  const finalCount = useCustom ? (parseInt(customCount) || 0) : count

  const canStart = subject !== '' && finalCount > 0 && availableCount !== null &&
    availableCount > 0 && finalCount <= availableCount

  function handleStart() {
    if (!canStart) return
    onStart({ subject, field, count: finalCount, weakMode })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7c4dff]/20 mb-4">
          <Brain className="w-7 h-7 text-[#7c4dff]" />
        </div>
        <h2 className="text-xl font-semibold text-white">クイズ設定</h2>
        <p className="text-sm text-[#8888aa] mt-1">科目・分野を選んで始めましょう</p>
      </div>

      {/* 科目選択 */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#c8c8e8] mb-2">
          <BookOpen className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          科目
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => { setSubject(s); setWeakMode(false) }}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
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
      {subject && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-[#c8c8e8] mb-2">分野</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setField(null)}
              className={`py-2 px-4 rounded-lg border text-sm transition-all ${
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
                className={`py-2 px-4 rounded-lg border text-sm transition-all ${
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

      {/* 苦手モード */}
      {subject && (
        <div className="mb-5">
          <button
            onClick={() => setWeakMode(v => !v)}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl border text-sm transition-all ${
              weakMode
                ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:border-[#3a3a5c]'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">苦手問題のみ出題</span>
            {weakMode && availableCount !== null && (
              <span className="ml-auto text-xs">{availableCount}問</span>
            )}
          </button>
        </div>
      )}

      {/* 出題数 */}
      {subject && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-[#c8c8e8] mb-2">
            <Shuffle className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            出題数
            {availableCount !== null && !weakMode && (
              <span className="ml-2 text-xs text-[#8888aa]">（{availableCount}問中）</span>
            )}
          </label>
          <div className="flex gap-2 mb-2">
            {COUNT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => { setCount(n); setUseCustom(false) }}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  !useCustom && count === n
                    ? 'border-[#7c4dff] bg-[#7c4dff]/20 text-white'
                    : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:border-[#3a3a5c]'
                }`}
              >
                {n}問
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                useCustom
                  ? 'border-[#7c4dff] bg-[#7c4dff]/20 text-white'
                  : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:border-[#3a3a5c]'
              }`}
            >
              カスタム
            </button>
          </div>
          {useCustom && (
            <input
              type="number"
              min={1}
              max={availableCount ?? 999}
              value={customCount}
              onChange={e => setCustomCount(e.target.value)}
              placeholder={`1〜${availableCount ?? '?'}問`}
              className="w-full py-2.5 px-3 rounded-lg border border-[#2a2a4a] bg-[#111125] text-white text-sm focus:outline-none focus:border-[#7c4dff]"
            />
          )}
        </div>
      )}

      {/* 問題がない場合の警告 */}
      {subject && !loading && availableCount === 0 && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50 text-yellow-300 text-sm">
          {weakMode ? '苦手問題がまだ登録されていません。' : 'この科目・分野には問題がまだ登録されていません。'}
        </div>
      )}

      {/* 開始ボタン */}
      <button
        onClick={handleStart}
        disabled={!canStart || loading}
        className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
          canStart && !loading
            ? 'bg-[#7c4dff] text-white hover:bg-[#6a3de8] active:scale-95'
            : 'bg-[#252540] text-[#4a4a6a] cursor-not-allowed'
        }`}
      >
        {loading ? '読み込み中...' : 'クイズを始める'}
      </button>
    </div>
  )
}
