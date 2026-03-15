import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Trophy, RotateCcw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { QuizQuestion } from '../../stores/quizStore'
import { useQuizStore } from '../../stores/quizStore'
import { useStudyStore } from '../../stores/studyStore'

type AnswerRecord = {
  question: QuizQuestion
  selectedOriginalIndex: number
  isCorrect: boolean
}

type Props = {
  subject: string
  field: string | null
  weakMode: boolean
  answers: AnswerRecord[]
  durationSeconds: number
  onRestart: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return `${m}分${s > 0 ? ` ${s}秒` : ''}`
}

export default function QuizResult({ subject, field, weakMode, answers, durationSeconds, onRestart }: Props) {
  const [saving, setSaving] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const { saveSession } = useQuizStore()
  const { addRecord } = useStudyStore()

  const correct = answers.filter(a => a.isCorrect).length
  const total = answers.length
  const rate = Math.round((correct / total) * 100)

  useEffect(() => {
    let cancelled = false
    async function autoSave() {
      const now = new Date()
      const recorded_at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const date = `${now.getMonth() + 1}/${now.getDate()}`
      const minutes = Math.max(1, Math.round(durationSeconds / 60))
      const fieldLabel = field ?? '全分野'
      const modeLabel = weakMode ? '【苦手】' : ''
      try {
        await Promise.all([
          addRecord({
            subject,
            content: `${modeLabel}小テスト: ${subject} ${fieldLabel} ${correct}/${total}問正解（${rate}%）`,
            minutes,
            next_action: '',
            recorded_at,
            date,
          }),
          saveSession({
            subject,
            field,
            is_weak_mode: weakMode,
            total_questions: total,
            correct_count: correct,
            duration_seconds: durationSeconds,
            answers: answers.map(a => ({
              question_key: a.question.id,
              selected_answer: a.selectedOriginalIndex,
              is_correct: a.isCorrect,
            })),
          }),
        ])
        if (!cancelled) setSaved(true)
      } catch {
        if (!cancelled) setSaveError(true)
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    autoSave()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* スコアカード */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7c4dff]/20 mb-4">
          <Trophy className="w-8 h-8 text-[#7c4dff]" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-1">クイズ完了！</h2>
        <p className="text-sm text-[#8888aa]">{subject}　{field ?? '全分野'}{weakMode ? '（苦手）' : ''}</p>
      </div>

      {/* スコア */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111125] border border-[#2a2a4a] rounded-xl p-4 text-center">
          <div className={`text-3xl font-bold mb-1 ${rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {rate}%
          </div>
          <div className="text-xs text-[#8888aa]">正答率</div>
        </div>
        <div className="bg-[#111125] border border-[#2a2a4a] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white mb-1">{correct}<span className="text-lg text-[#8888aa]">/{total}</span></div>
          <div className="text-xs text-[#8888aa]">正解数</div>
        </div>
        <div className="bg-[#111125] border border-[#2a2a4a] rounded-xl p-4 text-center">
          <Clock className="w-4 h-4 text-[#8888aa] mx-auto mb-1" />
          <div className="text-sm font-semibold text-white">{formatDuration(durationSeconds)}</div>
          <div className="text-xs text-[#8888aa]">経過時間</div>
        </div>
      </div>

      {/* ボタン行 */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[#2a2a4a] text-[#c8c8e8] hover:border-[#3a3a5c] transition-all text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          もう一度
        </button>
        {/* 保存ステータス */}
        <div className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-medium ${
          saveError
            ? 'border-red-500/50 bg-red-900/20 text-red-300'
            : saved
            ? 'border-green-600/50 bg-green-700/20 text-green-300'
            : 'border-[#2a2a4a] bg-[#111125] text-[#8888aa]'
        }`}>
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-[#5a5a7a] border-t-[#8888aa] rounded-full animate-spin" />
              保存中...
            </>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" />記録済み</>
          ) : saveError ? (
            <><AlertCircle className="w-4 h-4" />保存失敗</>
          ) : null}
        </div>
      </div>

      {/* 問題ごとの正誤一覧 */}
      <div>
        <h3 className="text-sm font-medium text-[#c8c8e8] mb-3">問題ごとの結果</h3>
        <div className="space-y-2">
          {answers.map((a, i) => (
            <div key={i} className="rounded-xl border border-[#2a2a4a] overflow-hidden">
              <button
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#111125] hover:bg-[#16162a] transition-colors text-left"
              >
                {a.isCorrect
                  ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                }
                <span className="flex-1 text-sm text-[#c8c8e8] line-clamp-1">{a.question.question}</span>
                {expandedIndex === i
                  ? <ChevronUp className="w-4 h-4 text-[#5a5a7a] shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-[#5a5a7a] shrink-0" />
                }
              </button>
              {expandedIndex === i && (
                <div className="px-4 pb-4 bg-[#0d0d1e] border-t border-[#2a2a4a]">
                  <p className="text-sm text-[#c8c8e8] pt-3 mb-3 leading-relaxed whitespace-pre-wrap">{a.question.question}</p>
                  <div className="space-y-1.5 mb-3">
                    {a.question.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
                          oi === a.question.correct_answer
                            ? 'bg-green-900/30 text-green-300'
                            : oi === a.selectedOriginalIndex && !a.isCorrect
                            ? 'bg-red-900/30 text-red-300'
                            : 'text-[#5a5a7a]'
                        }`}
                      >
                        <span className="shrink-0 font-medium">{String.fromCharCode(65 + oi)}.</span>
                        <span>{opt}</span>
                        {oi === a.question.correct_answer && <span className="ml-auto shrink-0 text-xs">✓ 正解</span>}
                        {oi === a.selectedOriginalIndex && !a.isCorrect && <span className="ml-auto shrink-0 text-xs">あなたの回答</span>}
                      </div>
                    ))}
                  </div>
                  {a.question.explanation && (
                    <div className="p-3 rounded-lg bg-[#111125] border border-[#2a2a4a]">
                      <p className="text-xs text-[#8888aa] leading-relaxed whitespace-pre-wrap">{a.question.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
