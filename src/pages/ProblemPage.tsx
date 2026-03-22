import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, List, X,
  ChevronDown, ChevronUp, Lightbulb,
} from 'lucide-react'
import { SUBJECT_CONFIGS } from '../types/problem'
import type { Problem, ProblemResult } from '../types/problem'
import { useProblemStore } from '../stores/problemStore'
import MathText from '../components/MathText'

// -----------------------------------------------
// 難易度バッジ
// -----------------------------------------------
function DifficultyDots({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: n <= difficulty ? '#fbbf24' : '#2a2a4a' }}
        />
      ))}
    </div>
  )
}

// -----------------------------------------------
// 結果バッジ（目次用）
// -----------------------------------------------
function ResultBadge({ result }: { result: ProblemResult }) {
  if (!result) return <span className="w-5 h-5 rounded-full border border-[#3a3a5c] inline-flex items-center justify-center text-[10px] text-[#5a5a7a]">−</span>
  const map = {
    correct:   { label: '○', cls: 'bg-green-900/30 text-green-400 border-green-500/40' },
    partial:   { label: '△', cls: 'bg-amber-900/30 text-amber-400 border-amber-500/40' },
    incorrect: { label: '×', cls: 'bg-red-900/30 text-red-400 border-red-500/40' },
  }
  const { label, cls } = map[result]
  return (
    <span className={`w-5 h-5 rounded-full border inline-flex items-center justify-center text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  )
}

// -----------------------------------------------
// ヒントセクション
// -----------------------------------------------
function HintSection({ hintText }: { hintText: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-[#fbbf24]/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#1a1a2e] hover:bg-[#1e1e35] transition-colors text-left"
      >
        <Lightbulb className="w-4 h-4 shrink-0 text-[#fbbf24]" strokeWidth={1.5} />
        <span className="text-sm font-medium text-[#fbbf24] flex-1">
          {open ? 'ヒントを閉じる' : 'ヒントを見る'}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#fbbf24]/60" strokeWidth={1.5} />
          : <ChevronDown className="w-4 h-4 text-[#fbbf24]/60" strokeWidth={1.5} />
        }
      </button>
      {open && (
        <div className="px-4 py-3 bg-[#1a1505] border-t border-[#fbbf24]/20">
          <div className="pl-2 border-l-2 border-[#fbbf24]/50 text-sm text-[#e5c97a] leading-relaxed">
            <MathText text={hintText} />
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------
// 解答・解説セクション
// -----------------------------------------------
function AnswerSection({ problem }: { problem: Problem }) {
  return (
    <div className="rounded-xl border border-[#2a2a4a] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="px-5 py-4 bg-[#111125]">
        <p className="text-xs font-semibold text-[#9090bb] mb-3 flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-[#9090bb] inline-block" />
          模範解答
        </p>
        <div className="text-sm text-[#c8c8e8] leading-relaxed">
          <MathText text={problem.answerText} />
        </div>
      </div>

      <div className="px-5 py-4 bg-[#13132a] border-t border-[#2a2a4a]">
        <p className="text-xs font-semibold text-[#a78bfa] mb-3 flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-[#a78bfa] inline-block" />
          初学者向け解説
        </p>
        <div className="text-sm text-[#c8c8e8] leading-relaxed">
          <MathText text={problem.explanation} />
        </div>
      </div>

      {problem.relatedKnowledge && (
        <div className="px-5 py-4 bg-[#0e1a14] border-t border-[#2a2a4a]">
          <p className="text-xs font-semibold text-[#34d399] mb-3 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-[#34d399] inline-block" />
            周辺知識・発展
          </p>
          <div className="text-sm text-[#8888aa] leading-relaxed">
            <MathText text={problem.relatedKnowledge} />
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------
// 正誤ボタン群
// -----------------------------------------------
const RESULT_BTNS = [
  { value: 'incorrect' as const, label: '✕', text: '不正解', activeClass: 'bg-red-900/40 border-red-500/70 text-red-400' },
  { value: 'partial'   as const, label: '△', text: '部分正解', activeClass: 'bg-amber-900/40 border-amber-500/70 text-amber-400' },
  { value: 'correct'   as const, label: '○', text: '正解',   activeClass: 'bg-green-900/40 border-green-500/70 text-green-400' },
]

function ResultButtons({
  result,
  onChange,
}: {
  result: ProblemResult
  onChange: (r: NonNullable<ProblemResult>) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {RESULT_BTNS.map(({ value, label, text, activeClass }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border font-medium transition-all duration-150 ${
            result === value
              ? activeClass
              : 'bg-[#1e1e3a] border-[#3a3a5c] text-[#5a5a7a] hover:border-[#5a5a7a] hover:text-[#8888aa]'
          }`}
        >
          <span className="text-xl leading-none">{label}</span>
          <span className="text-[10px]">{text}</span>
        </button>
      ))}
    </div>
  )
}

// -----------------------------------------------
// メインコンポーネント
// -----------------------------------------------
export default function ProblemPage() {
  const { subject } = useParams<{ subject: string }>()
  const navigate = useNavigate()
  const config = SUBJECT_CONFIGS.find(c => c.key === subject)

  const { loadingProblems, stats, submitResult, getProblemsBySubject } = useProblemStore()
  const problems = config ? getProblemsBySubject(config.key) : []

  // 章ごとにグルーピング
  const chapterKeys = [...new Set(problems.map(p => p.chapterKey))]
  const grouped = chapterKeys.map(key => ({
    chapterKey: key,
    chapterName: problems.find(p => p.chapterKey === key)!.chapterName,
    startIndex: problems.findIndex(p => p.chapterKey === key),
    problems: problems.filter(p => p.chapterKey === key),
  }))

  // 現在のインデックス
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  const problem = problems[index] ?? null

  // 問題が変わったら解答を閉じてトップにスクロール
  useEffect(() => {
    setShowAnswer(false)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])

  // キーボードショートカット
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showToc) { if (e.key === 'Escape') setShowToc(false); return }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft'  && index > 0)                setIndex(i => i - 1)
      if (e.key === 'ArrowRight' && index < problems.length - 1) setIndex(i => i + 1)
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, problems.length, showToc, navigate])

  function jumpTo(idx: number) {
    setIndex(idx)
    setShowToc(false)
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-[#8888aa]">科目が見つかりません</p>
      </div>
    )
  }

  if (!loadingProblems && problems.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#8888aa] mb-4">この科目の問題データが登録されていません</p>
          <button onClick={() => navigate(-1)} className="text-[#7c4dff] text-sm underline">戻る</button>
        </div>
      </div>
    )
  }

  // 現在の章
  const currentChapter = problem
    ? grouped.find(g => g.chapterKey === problem.chapterKey)
    : null

  const currentResult = problem ? (stats[problem.id]?.latestResult ?? null) : null

  // -----------------------------------------------
  // TOC ドロワー
  // -----------------------------------------------
  function TocDrawer() {
    return (
      <>
        {/* オーバーレイ */}
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowToc(false)}
        />
        {/* パネル（右から出てくる） */}
        <aside className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw]
                          bg-[#111125] border-l border-[#2a2a4a]
                          flex flex-col
                          animate-in slide-in-from-right duration-200">
          {/* ドロワーヘッダー */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a4a] shrink-0">
            <p className="text-sm font-semibold text-white">目次</p>
            <button
              onClick={() => setShowToc(false)}
              className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* スクロール可能なリスト */}
          <div className="flex-1 overflow-y-auto py-3">
            {grouped.map(({ chapterKey, chapterName, startIndex, problems: ps }) => (
              <div key={chapterKey} className="mb-1">
                {/* 章ヘッダー */}
                <div className="px-4 py-2 flex items-center gap-2">
                  <div className="w-1 h-3 rounded-full bg-[#7c4dff] shrink-0" />
                  <span className="text-xs font-semibold text-[#9090bb] leading-snug line-clamp-2">
                    {chapterName}
                  </span>
                </div>
                {/* 問題リスト */}
                <div className="pl-6 pr-3 space-y-0.5">
                  {ps.map((p, localIdx) => {
                    const globalIdx = startIndex + localIdx
                    const isActive = globalIdx === index
                    const r = stats[p.id]?.latestResult ?? null
                    return (
                      <button
                        key={p.id}
                        onClick={() => jumpTo(globalIdx)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#7c4dff]/20 text-white'
                            : 'text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#1a1a3a]'
                        }`}
                      >
                        <ResultBadge result={r} />
                        <span className="text-xs flex-1 truncate">{p.questionNo}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 進捗サマリー */}
          <div className="px-4 py-3 border-t border-[#2a2a4a] shrink-0">
            <p className="text-xs text-[#5a5a7a] text-center">
              {index + 1} / {problems.length} 問
            </p>
          </div>
        </aside>
      </>
    )
  }

  // -----------------------------------------------
  // メイン画面
  // -----------------------------------------------
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">

      {/* ===== ヘッダー（sticky） ===== */}
      <header className="sticky top-0 z-20 bg-[#111125] border-b border-[#2a2a4a]">
        <div className="max-w-2xl mx-auto px-4 py-3">

          {/* 上段: 戻る + パンくず + 目次ボタン */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8888aa] truncate">
                {config.shortLabel}
                {currentChapter && <> › {currentChapter.chapterName}</>}
              </p>
            </div>

            {/* 問題番号バッジ */}
            <span className="text-xs tabular-nums text-[#8888aa] shrink-0 px-2 py-1 rounded-lg bg-[#252540]">
              {problems.length > 0 ? `${index + 1} / ${problems.length}` : '−'}
            </span>

            {/* 目次ボタン */}
            <button
              onClick={() => setShowToc(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         bg-[#252540] border border-[#3a3a5c]
                         text-xs text-[#8888aa] hover:text-white hover:border-[#5a5a7a]
                         transition-colors shrink-0"
            >
              <List className="w-3.5 h-3.5" strokeWidth={1.5} />
              目次
            </button>
          </div>

          {/* 下段: プログレスバー */}
          {problems.length > 0 && (
            <div className="mt-2 h-1 bg-[#252540] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7c4dff] rounded-full transition-all duration-300"
                style={{ width: `${((index + 1) / problems.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* ===== メインエリア ===== */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-36">
        {loadingProblems && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#7c4dff] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {problem && (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

            {/* 問題メタ情報 */}
            <div className="flex items-center gap-2 flex-wrap">
              <DifficultyDots difficulty={problem.difficulty} />
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#7c4dff]/20 text-[#a78bfa] font-medium">
                {problem.questionNo}
              </span>
              {problem.points > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#252540] text-[#8888aa]">
                  {problem.points}点
                </span>
              )}
              {problem.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[#1e1e3a] text-[#5a5a7a]">
                  {tag}
                </span>
              ))}
            </div>

            {/* 問題文カード */}
            <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a] px-5 py-5">
              <div className="text-sm text-[#c8c8e8] leading-relaxed">
                <MathText text={problem.questionText} />
              </div>
            </div>

            {/* ヒント */}
            {problem.hintText && <HintSection hintText={problem.hintText} />}

            {/* 解答トグル */}
            <button
              onClick={() => setShowAnswer(v => !v)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-colors ${
                showAnswer
                  ? 'bg-[#1e1e3a] border-[#3a3a5c] text-[#8888aa] hover:border-[#5a5a7a]'
                  : 'bg-[#7c4dff]/10 border-[#7c4dff]/40 text-[#a78bfa] hover:bg-[#7c4dff]/20'
              }`}
            >
              {showAnswer
                ? <><ChevronUp className="w-4 h-4" strokeWidth={1.5} />解答を閉じる</>
                : <><ChevronDown className="w-4 h-4" strokeWidth={1.5} />解答を見る</>
              }
            </button>

            {/* 解答・解説 */}
            {showAnswer && <AnswerSection key={problem.id} problem={problem} />}

          </div>
        )}
      </main>

      {/* ===== フッター（fixed） ===== */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-[#111125]/95 backdrop-blur-sm border-t border-[#2a2a4a]">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">

          {/* 正誤ボタン */}
          {problem && (
            <ResultButtons
              result={currentResult}
              onChange={r => submitResult(problem.id, r)}
            />
          )}

          {/* 前へ / 次へ */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex(i => i - 1)}
              disabled={index === 0}
              className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl border font-medium text-sm transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed
                         border-[#3a3a5c] text-[#8888aa] hover:border-[#5a5a7a] hover:text-white
                         disabled:border-[#2a2a4a] disabled:text-[#3a3a5c]"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              前の問題
            </button>

            <button
              onClick={() => setIndex(i => i + 1)}
              disabled={index >= problems.length - 1}
              className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl font-medium text-sm transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed
                         bg-[#7c4dff] hover:bg-[#6c3de8] text-white shadow-lg shadow-[#7c4dff]/20
                         disabled:bg-[#252540] disabled:text-[#3a3a5c] disabled:shadow-none"
            >
              次の問題
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* キーボードヒント */}
          <p className="hidden md:block text-center text-[10px] text-[#3a3a5c]">
            ← / → キーで問題を移動　Esc で戻る
          </p>

        </div>
      </footer>

      {/* ===== 目次ドロワー ===== */}
      {showToc && <TocDrawer />}

    </div>
  )
}
