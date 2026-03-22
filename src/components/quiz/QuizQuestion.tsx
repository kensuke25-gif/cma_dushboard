import { useMemo, useState } from 'react'
import { CheckCircle, XCircle, Flag } from 'lucide-react'
import type { QuizQuestion as Question } from '../../stores/quizStore'
import { useQuizStore } from '../../stores/quizStore'
import MathText from '../MathText'

type Props = {
  question: Question
  questionIndex: number
  totalQuestions: number
  onAnswer: (selectedOriginalIndex: number, isCorrect: boolean) => void
}

type ShuffledOption = {
  text: string
  originalIndex: number
}

export default function QuizQuestion({ question, questionIndex, totalQuestions, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null) // shuffled index
  const [confirmed, setConfirmed] = useState(false)
  const { weakQuestionIds, toggleWeakQuestion } = useQuizStore()

  const shuffled = useMemo<ShuffledOption[]>(() => {
    const opts = question.options.map((text, i) => ({ text, originalIndex: i }))
    // Fisher-Yates shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return opts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const correctShuffledIndex = shuffled.findIndex(o => o.originalIndex === question.correct_answer)
  const answered = confirmed
  const isCorrect = answered && selected === correctShuffledIndex
  const isWeak = weakQuestionIds.has(question.id)

  function handleSelect(shuffledIndex: number) {
    if (confirmed) return
    setSelected(shuffledIndex)
  }

  function handleConfirm() {
    if (selected === null || confirmed) return
    setConfirmed(true)
    onAnswer(shuffled[selected].originalIndex, selected === correctShuffledIndex)
  }

  function optionStyle(shuffledIndex: number): string {
    const base = 'w-full text-left py-4 px-4 rounded-xl border text-sm transition-all '
    if (!confirmed) {
      if (shuffledIndex === selected) {
        return base + 'border-[#7c4dff] bg-[#7c4dff]/20 text-white'
      }
      return base + 'border-[#2a2a4a] bg-[#111125] text-[#c8c8e8] hover:border-[#7c4dff]/60 hover:bg-[#7c4dff]/10 active:scale-[0.98]'
    }
    if (shuffledIndex === correctShuffledIndex) {
      return base + 'border-green-500 bg-green-900/30 text-green-300'
    }
    if (shuffledIndex === selected) {
      return base + 'border-red-500 bg-red-900/30 text-red-300'
    }
    return base + 'border-[#2a2a4a] bg-[#111125] text-[#4a4a6a]'
  }

  function badgeStyle(shuffledIndex: number): string {
    const base = 'shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border '
    if (!confirmed) {
      if (shuffledIndex === selected) {
        return base + 'border-[#7c4dff] text-[#7c4dff]'
      }
      return base + 'border-[#3a3a5c] text-[#8888aa]'
    }
    if (shuffledIndex === correctShuffledIndex) return base + 'border-green-500 text-green-300'
    if (shuffledIndex === selected) return base + 'border-red-500 text-red-300'
    return base + 'border-[#2a2a4a] text-[#4a4a6a]'
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 進捗 */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-[#8888aa]">
          問 <span className="text-white font-medium">{questionIndex + 1}</span> / {totalQuestions}
        </span>
        <div className="flex-1 h-1.5 bg-[#252540] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7c4dff] rounded-full transition-all"
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[#5a5a7a] bg-[#252540] px-2 py-0.5 rounded-md">{question.field}</span>
      </div>

      {/* 問題文 */}
      <div className="mb-6 p-5 rounded-2xl bg-[#111125] border border-[#2a2a4a]">
        <p className="text-base text-white leading-relaxed">
          <MathText text={question.question} />
        </p>
      </div>

      {/* 選択肢 */}
      <div className="space-y-3 mb-4">
        {shuffled.map((opt, i) => (
          <button key={i} onClick={() => handleSelect(i)} className={optionStyle(i)}>
            <span className="flex items-start gap-3">
              <span className={badgeStyle(i)}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="leading-relaxed"><MathText text={opt.text} /></span>
            </span>
          </button>
        ))}
      </div>

      {/* 回答するボタン（選択済み・未確認） */}
      {selected !== null && !confirmed && (
        <div className="mb-4">
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-xl bg-[#7c4dff] text-white font-semibold text-base hover:bg-[#6a3de8] active:scale-95 transition-all"
          >
            回答する
          </button>
        </div>
      )}

      {/* 回答後の表示 */}
      {answered && (
        <div className={`mb-6 p-4 rounded-xl border ${
          isCorrect ? 'border-green-500/50 bg-green-900/20' : 'border-red-500/50 bg-red-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect
              ? <><CheckCircle className="w-5 h-5 text-green-400" /><span className="font-semibold text-green-300">正解！</span></>
              : <><XCircle className="w-5 h-5 text-red-400" /><span className="font-semibold text-red-300">不正解</span></>
            }
            {/* 苦手フラグ */}
            <button
              onClick={() => toggleWeakQuestion(question.id)}
              className={`ml-auto flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-all ${
                isWeak
                  ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                  : 'border-[#3a3a5c] text-[#8888aa] hover:border-orange-500/60 hover:text-orange-400'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              {isWeak ? '苦手解除' : '苦手登録'}
            </button>
          </div>
          {question.explanation && (
            <p className="text-sm text-[#c8c8e8] leading-relaxed">
              <MathText text={question.explanation} />
            </p>
          )}
        </div>
      )}
    </div>
  )
}
