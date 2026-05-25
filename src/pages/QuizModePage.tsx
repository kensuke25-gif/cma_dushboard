// =============================================
// src/pages/QuizModePage.tsx
// 1問1ページ形式の問題演習ページ
// =============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ListChecks,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Star,
  Flame,
} from 'lucide-react'
import { useProblemStore } from '../stores/problemStore'
import { SUBJECT_CONFIGS } from '../types/problem'
import type { Problem, ProblemResult, QuizSessionResult, SubjectKey } from '../types/problem'
import MathText from '../components/MathText'

// -----------------------------------------------
// 難易度バッジ
// -----------------------------------------------

function DifficultyBadge({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className="w-3 h-3"
          strokeWidth={1.5}
          style={{
            color: n <= difficulty ? '#f59e0b' : '#d4d4d8',
            fill:  n <= difficulty ? '#f59e0b' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// -----------------------------------------------
// 進捗バー
// -----------------------------------------------

function ProgressBar({
  current,
  total,
  accentHex,
}: {
  current: number
  total: number
  accentHex: string
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[#ececef] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: accentHex }}
        />
      </div>
      <span className="text-xs text-[#52525b] tabular-nums shrink-0">
        {current} / {total}
      </span>
    </div>
  )
}

// -----------------------------------------------
// ヒントセクション（アニメーション展開）
// -----------------------------------------------

function HintSection({ hintText }: { hintText: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-amber-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3
                   bg-amber-50 hover:bg-amber-100 transition-colors text-left"
      >
        <Lightbulb
          className="w-4 h-4 shrink-0"
          style={{ color: '#d97706' }}
          strokeWidth={1.5}
        />
        <span className="text-sm font-medium text-amber-700 flex-1">
          {open ? 'ヒントを閉じる' : 'ヒントを見る'}
        </span>
        {open
          ? <ChevronUp  className="w-4 h-4 text-amber-600/70" strokeWidth={1.5} />
          : <ChevronDown className="w-4 h-4 text-amber-600/70" strokeWidth={1.5} />
        }
      </button>

      {open && (
        <div className="px-4 py-3 bg-amber-50/50 border-t border-amber-200">
          <div className="pl-2 border-l-2 border-amber-400">
            <div className="text-sm text-amber-800 leading-relaxed">
              <MathText text={hintText} theme="light" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------
// 解答・解説セクション（スライドイン展開）
// -----------------------------------------------

function AnswerSection({ problem }: { problem: Problem }) {
  return (
    <div className="rounded-xl border border-[#e4e4e7] overflow-hidden
                    animate-in slide-in-from-bottom-4 duration-300">

      {/* 模範解答 */}
      <div className="px-5 py-4 bg-white">
        <p className="text-xs font-semibold text-[#52525b] mb-3 flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-[#52525b] inline-block" />
          模範解答
        </p>
        <div className="text-sm text-[#1a1a1a] leading-relaxed">
          <MathText text={problem.answerText} theme="light" />
        </div>
      </div>

      {/* 初学者向け解説 */}
      <div className="px-5 py-4 bg-[#f7f9ff] border-t border-[#e4e4e7]">
        <p className="text-xs font-semibold text-[#2563eb] mb-3 flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-[#2563eb] inline-block" />
          初学者向け解説
        </p>
        <div className="text-sm text-[#1a1a1a] leading-relaxed">
          <MathText text={problem.explanation} theme="light" />
        </div>
      </div>

      {/* 周辺知識（任意） */}
      {problem.relatedKnowledge && (
        <div className="px-5 py-4 bg-[#f0faf5] border-t border-[#e4e4e7]">
          <p className="text-xs font-semibold text-[#059669] mb-3 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-[#059669] inline-block" />
            周辺知識・発展
          </p>
          <div className="text-sm text-[#52525b] leading-relaxed">
            <MathText text={problem.relatedKnowledge} theme="light" />
          </div>
        </div>
      )}

    </div>
  )
}

// -----------------------------------------------
// 正誤ボタン群
// -----------------------------------------------

type ResultButtonsProps = {
  selected: NonNullable<ProblemResult> | null
  onSelect: (r: NonNullable<ProblemResult>) => void
  disabled: boolean
}

function ResultButtons({ selected, onSelect, disabled }: ResultButtonsProps) {
  const buttons: {
    value: NonNullable<ProblemResult>
    label: string
    icon: string
    activeClass: string
    hoverClass: string
  }[] = [
    {
      value: 'incorrect',
      label: '不正解',
      icon: '✕',
      activeClass: 'bg-red-50 border-red-400 text-red-700',
      hoverClass:  'hover:bg-red-50 hover:border-red-300 hover:text-red-700',
    },
    {
      value: 'partial',
      label: '部分正解',
      icon: '△',
      activeClass: 'bg-amber-50 border-amber-400 text-amber-700',
      hoverClass:  'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
    },
    {
      value: 'correct',
      label: '正解',
      icon: '○',
      activeClass: 'bg-green-50 border-green-400 text-green-700',
      hoverClass:  'hover:bg-green-50 hover:border-green-300 hover:text-green-700',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {buttons.map(({ value, label, icon, activeClass, hoverClass }) => (
        <button
          key={value}
          onClick={() => !disabled && onSelect(value)}
          disabled={disabled}
          className={`
            flex flex-col items-center justify-center gap-1
            py-3 rounded-xl border font-medium
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            ${selected === value
              ? activeClass
              : `bg-white border-[#d4d4d8] text-[#9ca3af] ${hoverClass}`
            }
          `}
        >
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </div>
  )
}

// -----------------------------------------------
// 結果サマリー画面
// -----------------------------------------------

function SummaryScreen({
  session,
  streak,
  onRetryWrong,
  onBackToList,
}: {
  session: QuizSessionResult
  streak: number
  onRetryWrong: () => void
  onBackToList: () => void
}) {
  const accuracy = session.totalProblems > 0
    ? Math.round((session.correct / session.totalProblems) * 100)
    : 0

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* タイトル */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-[#1a1a1a]">演習完了！</h2>
          <p className="text-sm text-[#52525b] mt-1">
            お疲れ様でした
          </p>
        </div>

        {/* スコアカード */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] shadow-sm p-6 mb-4">

          {/* 正答率メーター */}
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-[#1a1a1a] mb-1">
              {accuracy}
              <span className="text-2xl text-[#9ca3af]">%</span>
            </div>
            <p className="text-xs text-[#52525b]">正答率</p>
          </div>

          {/* 内訳 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between
                            px-4 py-2.5 rounded-xl bg-green-50
                            border border-green-200">
              <span className="flex items-center gap-2 text-sm text-green-700">
                <span className="text-base">○</span> 正解
              </span>
              <span className="text-sm font-bold text-green-700">
                {session.correct}問
                <span className="text-xs font-normal text-[#52525b] ml-1">
                  ({Math.round(session.correct / session.totalProblems * 100)}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between
                            px-4 py-2.5 rounded-xl bg-amber-50
                            border border-amber-200">
              <span className="flex items-center gap-2 text-sm text-amber-700">
                <span className="text-base">△</span> 部分正解
              </span>
              <span className="text-sm font-bold text-amber-700">
                {session.partial}問
                <span className="text-xs font-normal text-[#52525b] ml-1">
                  ({Math.round(session.partial / session.totalProblems * 100)}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between
                            px-4 py-2.5 rounded-xl bg-red-50
                            border border-red-200">
              <span className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-base">✕</span> 不正解
              </span>
              <span className="text-sm font-bold text-red-700">
                {session.incorrect}問
                <span className="text-xs font-normal text-[#52525b] ml-1">
                  ({Math.round(session.incorrect / session.totalProblems * 100)}%)
                </span>
              </span>
            </div>
          </div>

          {/* ストリーク */}
          {streak >= 3 && (
            <div className="mt-4 pt-4 border-t border-[#e4e4e7]
                            flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" strokeWidth={1.5} />
              <span className="text-sm font-bold text-orange-600">
                {streak}日連続正解中！
              </span>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-2">
          {session.incorrect + session.partial > 0 && (
            <button
              onClick={onRetryWrong}
              className="w-full flex items-center justify-center gap-2
                         py-3 rounded-xl bg-[#1f2937] hover:bg-[#111827]
                         text-white font-medium text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
              間違えた問題を再挑戦（{session.incorrect + session.partial}問）
            </button>
          )}

          <button
            onClick={onBackToList}
            className="w-full flex items-center justify-center gap-2
                       py-3 rounded-xl border border-[#d4d4d8]
                       text-[#1a1a1a] hover:border-[#9ca3af]
                       hover:bg-[#f4f4f5] font-medium text-sm transition-colors"
          >
            <ListChecks className="w-4 h-4" strokeWidth={1.5} />
            問題一覧へ戻る
          </button>
        </div>

      </div>
    </div>
  )
}

// -----------------------------------------------
// メインコンポーネント: QuizModePage
// -----------------------------------------------

export default function QuizModePage() {
  const { subject, chapterKey } = useParams<{
    subject: string
    chapterKey?: string
  }>()
  const navigate = useNavigate()

  const { getProblemsBySubject, submitResult, streak } = useProblemStore()

  // ---- 問題リストの構築 ----
  const allProblems = subject
    ? getProblemsBySubject(subject as SubjectKey)
    : []

  const problems: Problem[] = chapterKey
    ? allProblems.filter((p) => p.chapterKey === chapterKey)
    : allProblems

  const config = SUBJECT_CONFIGS.find((c) => c.key === subject)

  // ---- セッション状態 ----
  const [index,       setIndex]       = useState(0)
  const [showAnswer,  setShowAnswer]  = useState(false)
  const [selected,    setSelected]    = useState<NonNullable<ProblemResult> | null>(null)
  const [submitted,   setSubmitted]   = useState(false)
  const [sessionLog,  setSessionLog]  = useState<
    { problemId: string; result: NonNullable<ProblemResult> }[]
  >([])
  const [finished,    setFinished]    = useState(false)
  const [sessionResult, setSessionResult] = useState<QuizSessionResult | null>(null)

  // 解答開始時刻（秒計測用）
  const startTimeRef = useRef<number>(Date.now())

  // ---- 現在の問題 ----
  const problem = problems[index] ?? null

  // ---- 問題が変わるたびに状態リセット ----
  useEffect(() => {
    setShowAnswer(false)
    setSelected(null)
    setSubmitted(false)
    startTimeRef.current = Date.now()
  }, [index])

  // ---- 次の問題へ ----
  const handleNext = useCallback(() => {
    if (index + 1 >= problems.length) {
      // 全問終了 → サマリー（sessionLog を直接読んで集計）
      const now = new Date().toISOString()
      setSessionResult({
        subject: subject as SubjectKey,
        chapterKey,
        totalProblems: problems.length,
        correct:   sessionLog.filter((l) => l.result === 'correct').length,
        partial:   sessionLog.filter((l) => l.result === 'partial').length,
        incorrect: sessionLog.filter((l) => l.result === 'incorrect').length,
        startedAt: now,
        finishedAt: now,
      })
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }, [index, problems.length, subject, chapterKey, sessionLog])

  // ---- キーボードショートカット ----
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (finished) return
      if (e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case '1':
          if (!submitted) setSelected('correct')
          break
        case '2':
          if (!submitted) setSelected('partial')
          break
        case '3':
          if (!submitted) setSelected('incorrect')
          break
        case 'ArrowRight':
        case 'Enter':
          if (submitted) handleNext()
          break
      }
    },
    [submitted, finished, handleNext]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ---- 正誤ボタン押下 ----
  function handleSelect(result: NonNullable<ProblemResult>) {
    if (submitted) return
    setSelected(result)
    setShowAnswer(true)
    setSubmitted(true)

    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
    submitResult(problem!.id, result, elapsed)

    setSessionLog((prev) => [...prev, { problemId: problem!.id, result }])
  }

  // ---- 間違えた問題を再挑戦 ----
  function handleRetryWrong() {
    setIndex(0)
    setShowAnswer(false)
    setSelected(null)
    setSubmitted(false)
    setSessionLog([])
    setFinished(false)
    setSessionResult(null)
  }

  // ---- 問題一覧へ戻る ----
  function handleBackToList() {
    navigate(`/problems/${subject}`)
  }

  // ---- 問題がない場合 ----
  if (problems.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#52525b] mb-4">この科目・章の問題が見つかりません</p>
          <button
            onClick={() => navigate(-1)}
            className="text-[#1f2937] text-sm underline"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  // ---- 結果サマリー画面 ----
  if (finished && sessionResult) {
    return (
      <SummaryScreen
        session={sessionResult}
        streak={streak}
        onRetryWrong={handleRetryWrong}
        onBackToList={handleBackToList}
      />
    )
  }

  if (!problem) return null

  // -----------------------------------------------
  // メイン演習画面
  // -----------------------------------------------

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ========== ヘッダー（sticky） ========== */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#e4e4e7]">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">

          {/* 上段: 戻るボタン + パンくず */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToList}
              className="p-1.5 rounded-lg text-[#52525b] hover:text-[#1a1a1a]
                         hover:bg-[#f4f4f5] transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[#52525b] truncate">
                {config?.shortLabel ?? subject}
                {chapterKey && problem && (
                  <> › {problem.chapterName}</>
                )}
              </p>
            </div>
          </div>

          {/* 下段: 進捗バー */}
          <ProgressBar current={index + 1} total={problems.length} accentHex={config?.accentHex ?? '#1f2937'} />

        </div>
      </header>

      {/* ========== 問題エリア（スクロール可） ========== */}
      <main className="flex-1 overflow-y-auto pb-48">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* 問題メタ情報 */}
          <div className="flex items-center gap-2 flex-wrap">
            <DifficultyBadge difficulty={problem.difficulty} />
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${config?.accentHex ?? '#1f2937'}1a`, color: config?.accentHex ?? '#1f2937' }}
            >
              {problem.questionNo}
            </span>
            {problem.points > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full
                               bg-[#f4f4f5] text-[#52525b]">
                {problem.points}点
              </span>
            )}
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full
                           bg-[#f4f4f5] text-[#9ca3af]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 問題文カード */}
          <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa]
                          px-5 py-5">
            <div className="text-sm text-[#1a1a1a] leading-relaxed">
              <MathText text={problem.questionText} theme="light" />
            </div>
          </div>

          {/* ヒント */}
          {problem.hintText && (
            <HintSection hintText={problem.hintText} />
          )}

          {/* 解答・解説（正誤ボタン押下後に表示） */}
          {showAnswer && (
            <AnswerSection problem={problem} />
          )}

        </div>
      </main>

      {/* ========== 下部固定フッター ========== */}
      <footer className="fixed bottom-0 left-0 right-0 z-20
                         bg-white/95 backdrop-blur-sm
                         border-t border-[#e4e4e7]">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">

          {/* 正誤ボタン */}
          <ResultButtons
            selected={selected}
            onSelect={handleSelect}
            disabled={submitted}
          />

          {/* 次へボタン（正誤選択後に活性化） */}
          <button
            onClick={handleNext}
            disabled={!submitted}
            className={`
              w-full flex items-center justify-center gap-2
              py-3 rounded-xl font-medium text-sm
              transition-all duration-200
              ${submitted
                ? 'bg-[#1f2937] hover:bg-[#111827] text-white shadow-sm'
                : 'bg-[#ececef] text-[#cbcbd1] cursor-not-allowed'
              }
            `}
          >
            {index + 1 >= problems.length ? (
              <>結果を見る <ChevronRight className="w-4 h-4" strokeWidth={1.5} /></>
            ) : (
              <>次の問題 <ChevronRight className="w-4 h-4" strokeWidth={1.5} /></>
            )}
          </button>

          {/* キーボードショートカットヒント（デスクトップのみ） */}
          <p className="hidden md:block text-center text-[10px] text-[#9ca3af]">
            1: 正解 　2: 部分正解 　3: 不正解 　→: 次へ
          </p>

        </div>
      </footer>

    </div>
  )
}
