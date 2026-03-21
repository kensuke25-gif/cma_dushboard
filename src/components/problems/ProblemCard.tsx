import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Problem, ProblemResult } from '../../types/problem'
import MathText from '../MathText'

type Props = {
  problem: Problem
  result: ProblemResult
  onSetResult: (result: NonNullable<ProblemResult> | null) => void
}

type ResultButton = {
  value: 'correct' | 'partial' | 'incorrect'
  label: string
  activeClass: string
}

const RESULT_BUTTONS: ResultButton[] = [
  {
    value: 'correct',
    label: '○',
    activeClass: 'bg-green-900/30 text-green-400 border-green-500/50',
  },
  {
    value: 'partial',
    label: '△',
    activeClass: 'bg-amber-900/30 text-amber-400 border-amber-500/50',
  },
  {
    value: 'incorrect',
    label: '×',
    activeClass: 'bg-red-900/30 text-red-400 border-red-500/50',
  },
]

function HintSection({ hintText }: { hintText: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-4 py-2 bg-[#1a1a3a] border-t border-[#2a2a4a]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-[#fbbf24]
                   hover:text-amber-300 transition-colors py-1"
      >
        <span className="text-base leading-none">💡</span>
        {open ? 'ヒントを閉じる' : 'ヒントを見る'}
      </button>
      {open && (
        <div className="mt-2 pl-2 border-l-2 border-[#fbbf24]/40">
          <div className="text-xs text-[#c8c8e8] leading-relaxed">
            <MathText text={hintText} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProblemCard({ problem, result, onSetResult }: Props) {
  const [showAnswer, setShowAnswer] = useState(false)

  function handleResultClick(value: 'correct' | 'partial' | 'incorrect') {
    // 既に同じ結果が選択済みの場合は何もしない（二重送信防止）
    if (result === value) return
    onSetResult(value)
  }

  return (
    <div className="rounded-xl border border-[#2a2a4a] overflow-hidden">
      {/* カードヘッダー */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111125] flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c4dff]/20 text-[#a78bfa] font-medium">
          {problem.questionNo}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252540] text-[#8888aa]">
          {problem.points}点
        </span>
        {problem.tags.map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e3a] text-[#5a5a7a]">
            {tag}
          </span>
        ))}
      </div>

      {/* 問題文 */}
      <div className="px-4 py-4 bg-[#1e1e3a]">
        <div className="text-sm text-[#c8c8e8] leading-relaxed">
          <MathText text={problem.questionText} />
        </div>
      </div>

      {/* ヒントボタン（hintText が存在する場合のみ表示） */}
      {problem.hintText && (
        <HintSection hintText={problem.hintText} />
      )}

      {/* 解答エリア（展開式） */}
      {showAnswer && (
        <div className="px-4 py-4 bg-[#16162a] border-t border-[#2a2a4a] space-y-4">

          {/* 模範解答 */}
          <div>
            <p className="text-xs font-semibold text-[#9090bb] mb-2">
              ▍模範解答
            </p>
            <div className="text-sm text-[#c8c8e8] leading-relaxed">
              <MathText text={problem.answerText} />
            </div>
          </div>

          {/* 初学者向け解説 */}
          <div className="pt-3 border-t border-[#2a2a4a]">
            <p className="text-xs font-semibold text-[#a78bfa] mb-2">
              ▍初学者向け解説
            </p>
            <div className="text-sm text-[#c8c8e8] leading-relaxed">
              <MathText text={problem.explanation} />
            </div>
          </div>

          {/* 周辺知識（存在する場合のみ表示） */}
          {problem.relatedKnowledge && (
            <div className="pt-3 border-t border-[#2a2a4a]">
              <p className="text-xs font-semibold text-[#34d399] mb-2">
                ▍周辺知識・発展
              </p>
              <div className="text-sm text-[#8888aa] leading-relaxed">
                <MathText text={problem.relatedKnowledge} />
              </div>
            </div>
          )}

        </div>
      )}

      {/* カードフッター */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#111125] border-t border-[#2a2a4a]">
        {/* 解答表示トグル */}
        <button
          onClick={() => setShowAnswer(v => !v)}
          className="flex items-center gap-1.5 text-xs text-[#8888aa] hover:text-[#c8c8e8] transition-colors py-1"
        >
          {showAnswer
            ? <><ChevronUp className="w-3.5 h-3.5" />解答を閉じる</>
            : <><ChevronDown className="w-3.5 h-3.5" />解答を見る</>
          }
        </button>

        {/* 正誤ボタン */}
        <div className="flex items-center gap-1.5">
          {RESULT_BUTTONS.map(({ value, label, activeClass }) => (
            <button
              key={value}
              onClick={() => handleResultClick(value)}
              title={value === 'correct' ? '正解' : value === 'partial' ? '部分正解' : '不正解'}
              className={`w-11 h-11 rounded-xl border text-base font-bold transition-all ${
                result === value
                  ? activeClass
                  : 'bg-[#252540] text-[#5a5a7a] border-[#3a3a5c] hover:border-[#5a5a7a] hover:text-[#8888aa]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
