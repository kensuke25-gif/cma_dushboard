import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, List, X,
  Lightbulb, ChevronDown, ChevronUp, Eye,
} from 'lucide-react'
import { SUBJECT_CONFIGS } from '../types/problem'
import type { Problem, ProblemResult, ProblemStats, SubjectKey } from '../types/problem'
import { useProblemStore } from '../stores/problemStore'
import { usePomodoroStore, MODES } from '../stores/pomodoroStore'
import MathText from '../components/MathText'

// ── 章グループ型 ─────────────────────────────────
type ChapterGroup = {
  chapterKey: string
  chapterName: string
  startIndex: number
  problems: Problem[]
}

// ── 難易度ドット ──────────────────────────────────
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

// ── 結果バッジ ────────────────────────────────────
function ResultBadge({ result }: { result: ProblemResult }) {
  if (!result) {
    return (
      <span className="w-5 h-5 rounded-full border border-[#3a3a5c] inline-flex items-center justify-center text-[10px] text-[#5a5a7a] shrink-0">
        −
      </span>
    )
  }
  const m: Record<NonNullable<ProblemResult>, { label: string; cls: string }> = {
    correct:   { label: '○', cls: 'bg-green-900/30 text-green-400 border-green-500/40' },
    partial:   { label: '△', cls: 'bg-amber-900/30 text-amber-400 border-amber-500/40' },
    incorrect: { label: '×', cls: 'bg-red-900/30 text-red-400 border-red-500/40' },
  }
  return (
    <span className={`w-5 h-5 rounded-full border inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${m[result].cls}`}>
      {m[result].label}
    </span>
  )
}

// ── ヒントセクション ──────────────────────────────
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
          ? <ChevronUp   className="w-4 h-4 text-[#fbbf24]/60" strokeWidth={1.5} />
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

// ── 解答・解説セクション ──────────────────────────
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

// ── 採点ボタン ────────────────────────────────────
const RESULT_BTNS = [
  { value: 'incorrect' as const, label: '✕', text: '不正解',  activeClass: 'bg-red-900/40 border-red-500/70 text-red-400' },
  { value: 'partial'   as const, label: '△', text: '部分正解', activeClass: 'bg-amber-900/40 border-amber-500/70 text-amber-400' },
  { value: 'correct'   as const, label: '○', text: '正解',    activeClass: 'bg-green-900/40 border-green-500/70 text-green-400' },
]

function ScoringButtons({
  result,
  onChange,
}: {
  result: ProblemResult
  onChange: (r: NonNullable<ProblemResult>) => void
}) {
  return (
    <div>
      <p className="text-xs text-[#5a5a7a] mb-2 text-center">採点してください</p>
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
    </div>
  )
}

// ── 問題リスト（サイドバー・モバイルドロワー共通） ─
function ProblemListContent({
  grouped,
  currentIndex,
  stats,
  onJump,
}: {
  grouped: ChapterGroup[]
  currentIndex: number
  stats: Record<string, ProblemStats>
  onJump: (idx: number) => void
}) {
  return (
    <div className="py-2">
      {grouped.map(({ chapterKey, chapterName, startIndex, problems: ps }) => (
        <div key={chapterKey} className="mb-1">
          {/* 章ヘッダー */}
          <div className="px-3 py-1.5 flex items-center gap-2">
            <div className="w-1 h-3 rounded-full bg-[#7c4dff] shrink-0" />
            <span className="text-[11px] font-semibold text-[#9090bb] leading-snug line-clamp-2">
              {chapterName}
            </span>
          </div>
          {/* 問題リスト */}
          <div className="pl-4 pr-2 space-y-0.5">
            {ps.map((p, localIdx) => {
              const globalIdx = startIndex + localIdx
              const isActive = globalIdx === currentIndex
              const r = stats[p.id]?.latestResult ?? null
              return (
                <button
                  key={p.id}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => onJump(globalIdx)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors min-h-[36px] ${
                    isActive
                      ? 'bg-[#7c4dff]/20 text-white'
                      : 'text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#1a1a3a]'
                  }`}
                >
                  <ResultBadge result={r} />
                  <span className="text-xs flex-1 leading-snug">{p.questionNo}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────
export default function ProblemPage() {
  const { subject } = useParams<{ subject: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const config = SUBJECT_CONFIGS.find(c => c.key === subject)

  const { loadingProblems, stats, submitResult, getProblemsBySubject } = useProblemStore()
  const { running, seconds, mode } = usePomodoroStore()

  const problems = config ? getProblemsBySubject(config.key as SubjectKey) : []

  // 章グループ
  const chapterKeys = [...new Set(problems.map(p => p.chapterKey))]
  const grouped: ChapterGroup[] = chapterKeys.map(key => ({
    chapterKey: key,
    chapterName: problems.find(p => p.chapterKey === key)!.chapterName,
    startIndex:  problems.findIndex(p => p.chapterKey === key),
    problems:    problems.filter(p => p.chapterKey === key),
  }))

  // ?problem=problemId で特定問題、?chapter=chapterKey で章の先頭問題から開始
  const chapterParam = searchParams.get('chapter')
  const problemParam = searchParams.get('problem')
  const initialIndex = (() => {
    if (problemParam) {
      const idx = problems.findIndex(p => p.id === problemParam)
      if (idx >= 0) return idx
    }
    if (chapterParam) {
      return Math.max(0, problems.findIndex(p => p.chapterKey === chapterParam))
    }
    return 0
  })()

  const [index,          setIndex]          = useState(initialIndex)
  const [revealedAnswer, setRevealedAnswer] = useState(false)
  const [showToc,        setShowToc]        = useState(false)

  // problems が遅れてロードされた場合に initialIndex を反映
  useEffect(() => {
    if (problems.length === 0) return
    if (problemParam) {
      const idx = problems.findIndex(p => p.id === problemParam)
      if (idx >= 0) { setIndex(idx); return }
    }
    if (chapterParam) {
      const idx = problems.findIndex(p => p.chapterKey === chapterParam)
      if (idx >= 0) setIndex(idx)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems.length])

  const mainRef    = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const problem       = problems[index] ?? null
  const currentResult = problem ? (stats[problem.id]?.latestResult ?? null) : null
  const currentChapter = problem ? grouped.find(g => g.chapterKey === problem.chapterKey) : null

  // 問題切替時: 解答非表示 + スクロールリセット
  useEffect(() => {
    setRevealedAnswer(false)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])

  // サイドバーのアクティブ項目を自動スクロール
  useEffect(() => {
    const el = sidebarRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index])

  const jumpTo = useCallback((idx: number) => {
    setIndex(idx)
    setShowToc(false)
  }, [])

  // キーボードショートカット
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showToc) { if (e.key === 'Escape') setShowToc(false); return }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft'  && index > 0)                    setIndex(i => i - 1)
      if (e.key === 'ArrowRight' && index < problems.length - 1)  setIndex(i => i + 1)
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, problems.length, showToc, navigate])

  // ポモドーロ残り時間
  const pomMm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const pomSs = String(seconds % 60).padStart(2, '0')

  // ── エラー画面 ────────────────────────────────
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

  // ── レンダリング ──────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">

      {/* ===== ページヘッダー（sticky） ===== */}
      <header className="sticky top-0 z-20 bg-[#111125] border-b border-[#2a2a4a] shrink-0">
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">

            {/* 戻るボタン */}
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* パンくず */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8888aa] truncate">
                {config.shortLabel}
                {currentChapter && <> › {currentChapter.chapterName}</>}
              </p>
            </div>

            {/* 進捗バッジ */}
            {problems.length > 0 && (
              <span className="text-xs tabular-nums text-[#8888aa] px-2 py-1 rounded-lg bg-[#252540] shrink-0">
                {index + 1} / {problems.length}
              </span>
            )}

            {/* ポモドーロ残り時間（実行中のみ） */}
            {running && (
              <span className={`text-xs font-bold tabular-nums px-2 py-1 rounded-lg bg-[#252540] shrink-0 ${MODES[mode].textColor}`}>
                {pomMm}:{pomSs}
              </span>
            )}

            {/* 目次ボタン（モバイルのみ） */}
            <button
              onClick={() => setShowToc(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#252540] border border-[#3a3a5c] text-xs text-[#8888aa] hover:text-white hover:border-[#5a5a7a] transition-colors shrink-0"
            >
              <List className="w-3.5 h-3.5" strokeWidth={1.5} />
              目次
            </button>
          </div>

          {/* プログレスバー */}
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

      {/* ===== ボディ: サイドバー + メインコンテンツ ===== */}
      <div className="flex flex-1">

        {/* 問題一覧サイドバー（md+ のみ） */}
        <aside
          ref={sidebarRef}
          className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#2a2a4a] overflow-y-auto sticky self-start"
          style={{ top: '60px', maxHeight: 'calc(100dvh - 60px)' }}
        >
          {/* サイドバーヘッダー */}
          <div className="px-3 py-2.5 border-b border-[#2a2a4a] shrink-0 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#9090bb]">問題一覧</p>
            <span className="text-[10px] text-[#5a5a7a]">{problems.length}問</span>
          </div>
          <ProblemListContent
            grouped={grouped}
            currentIndex={index}
            stats={stats}
            onJump={jumpTo}
          />
        </aside>

        {/* メインコンテンツ */}
        <main ref={mainRef} className="flex-1 min-w-0 pb-28">
          {loadingProblems && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#7c4dff] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {problem && (
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

              {/* メタバッジ */}
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

              {/* 問題文 */}
              <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a] px-5 py-5">
                <div className="text-sm text-[#c8c8e8] leading-relaxed">
                  <MathText text={problem.questionText} />
                </div>
              </div>

              {/* ヒント */}
              {problem.hintText && <HintSection hintText={problem.hintText} />}

              {/* 解答確認フロー */}
              {!revealedAnswer ? (
                /* 解答を確認するボタン */
                <button
                  onClick={() => setRevealedAnswer(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#7c4dff] hover:bg-[#6c3de8] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#7c4dff]/25"
                >
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                  解答を確認する
                </button>
              ) : (
                <>
                  {/* 解答・解説 */}
                  <AnswerSection key={problem.id} problem={problem} />

                  {/* 採点ボタン */}
                  <ScoringButtons
                    result={currentResult}
                    onChange={r => submitResult(problem.id, r)}
                  />

                  {/* 解答を閉じる */}
                  <button
                    onClick={() => setRevealedAnswer(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[#5a5a7a] hover:text-[#8888aa] transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                    解答を閉じる
                  </button>
                </>
              )}

            </div>
          )}
        </main>
      </div>

      {/* ===== フッター（fixed） ===== */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-[#111125]/95 backdrop-blur-sm border-t border-[#2a2a4a]">
        {/* サイドバー幅分のスペーサー + ナビゲーション */}
        <div className="flex">
          {/* md+ サイドバーと揃えるスペーサー */}
          <div className="hidden md:block w-56 shrink-0 border-r border-[#2a2a4a]/50" />

          {/* ナビゲーション */}
          <div className="flex-1 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 max-w-2xl mx-auto">
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

            <p className="hidden md:block text-center text-[10px] text-[#3a3a5c]">
              ← / → キーで問題を移動　Esc で戻る
            </p>
          </div>
        </div>
      </footer>

      {/* ===== モバイル 目次ドロワー ===== */}
      {showToc && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setShowToc(false)}
          />
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] md:hidden
                            bg-[#111125] border-l border-[#2a2a4a] flex flex-col
                            animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a4a] shrink-0">
              <p className="text-sm font-semibold text-white">問題一覧</p>
              <button
                onClick={() => setShowToc(false)}
                className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProblemListContent
                grouped={grouped}
                currentIndex={index}
                stats={stats}
                onJump={jumpTo}
              />
            </div>
            <div className="px-4 py-3 border-t border-[#2a2a4a] shrink-0 text-center">
              <p className="text-xs text-[#5a5a7a]">{index + 1} / {problems.length} 問</p>
            </div>
          </aside>
        </>
      )}

    </div>
  )
}
