import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ExternalLink } from 'lucide-react'
import { SUBJECT_CONFIGS } from '../types/problem'
import type { SubjectKey } from '../types/problem'
import { useProblemStore } from '../stores/problemStore'

// ── 回答履歴ドット ──────────────────────────────────
type AttemptResult = 'correct' | 'partial' | 'incorrect'

function HistoryDots({ history }: { history: AttemptResult[] }) {
  const slots = Array.from({ length: 10 }, (_, i) => history[i] ?? null)
  return (
    <div className="flex items-center gap-0.5">
      {slots.map((r, i) => {
        if (!r) {
          return (
            <span
              key={i}
              className="w-4 h-4 rounded-full border border-[#2a2a4a] flex items-center justify-center text-[8px] text-[#3a3a5c]"
            >
              −
            </span>
          )
        }
        if (r === 'correct') {
          return (
            <span
              key={i}
              className="w-4 h-4 rounded-full bg-green-900/50 border border-green-500/50 flex items-center justify-center text-[8px] font-bold text-green-400"
            >
              ○
            </span>
          )
        }
        if (r === 'partial') {
          return (
            <span
              key={i}
              className="w-4 h-4 rounded-full bg-amber-900/50 border border-amber-500/50 flex items-center justify-center text-[8px] font-bold text-amber-400"
            >
              △
            </span>
          )
        }
        return (
          <span
            key={i}
            className="w-4 h-4 rounded-full bg-red-900/50 border border-red-500/50 flex items-center justify-center text-[8px] font-bold text-red-400"
          >
            ✕
          </span>
        )
      })}
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────────
export default function ProblemsIndexPage() {
  const navigate = useNavigate()
  const { problems, stats, recentAttempts, fetchRecentAttempts, loadingProblems } = useProblemStore()

  // 全問題IDを渡して履歴を取得
  useEffect(() => {
    if (problems.length > 0) {
      fetchRecentAttempts(problems.map(p => p.id))
    }
  }, [problems, fetchRecentAttempts])

  // 科目ごとに章一覧をまとめる
  const subjectChapters = SUBJECT_CONFIGS.map(config => {
    const subjectProblems = problems.filter(p => p.subject === config.key as SubjectKey)

    const seen = new Set<string>()
    const chapters: {
      chapterKey: string
      chapterName: string
      problems: typeof subjectProblems
      answered: number
    }[] = []

    subjectProblems.forEach(p => {
      if (!seen.has(p.chapterKey)) {
        seen.add(p.chapterKey)
        const chProblems = subjectProblems.filter(q => q.chapterKey === p.chapterKey)
        const answered = chProblems.filter(q => stats[q.id]?.latestResult).length
        chapters.push({
          chapterKey: p.chapterKey,
          chapterName: p.chapterName,
          problems: chProblems,
          answered,
        })
      }
    })

    const totalProblems = subjectProblems.length
    const totalAnswered = subjectProblems.filter(p => stats[p.id]?.latestResult).length
    const progress = totalProblems > 0
      ? Math.round((totalAnswered / totalProblems) * 100)
      : 0

    return { config, chapters, totalProblems, totalAnswered, progress }
  })

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 md:p-6">
      <div className="max-w-3xl mx-auto">

        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#a78bfa]" strokeWidth={1.5} />
            問題集
          </h1>
          <p className="text-sm text-[#8888aa] mt-1">科目・章を選んで演習を開始</p>
        </div>

        {loadingProblems && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#7c4dff] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingProblems && problems.length === 0 && (
          <div className="bg-[#111125] rounded-2xl p-8 text-center border border-[#2a2a4a]">
            <BookOpen className="w-10 h-10 text-[#3a3a5c] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#8888aa] mb-2">まだ問題データがありません</p>
            <p className="text-xs text-[#5a5a7a] mb-4">インポートページから問題ファイルを取り込んでください</p>
            <button
              onClick={() => navigate('/import')}
              className="px-4 py-2 bg-[#7c4dff] hover:bg-[#6c3de8] text-white text-sm rounded-xl transition-colors"
            >
              インポートへ
            </button>
          </div>
        )}

        {/* 科目カード一覧 */}
        {!loadingProblems && subjectChapters.map(({ config, chapters, totalProblems, totalAnswered, progress }) => {
          if (totalProblems === 0) return null

          return (
            <div key={config.key} className="mb-8 bg-[#111125] rounded-2xl border border-[#2a2a4a] overflow-hidden">

              {/* 科目ヘッダー */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2a4a]">
                <div
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: config.accentHex }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{config.shortLabel}</p>
                  <p className="text-xs text-[#5a5a7a] truncate">{config.label}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-[#8888aa]">{totalAnswered} / {totalProblems}</p>
                  <p className="text-xs" style={{ color: config.accentHex }}>{progress}%</p>
                </div>
              </div>

              {/* 科目プログレスバー */}
              <div className="h-0.5 bg-[#2a2a4a]">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: config.accentHex }}
                />
              </div>

              {/* 章一覧 */}
              <div>
                {chapters.map(ch => {
                  const chProgress = ch.problems.length > 0
                    ? Math.round((ch.answered / ch.problems.length) * 100)
                    : 0

                  // ?chapter= 付きのパス
                  const chapterPath = `${config.path}?chapter=${ch.chapterKey}`

                  return (
                    <div key={ch.chapterKey} className="border-b border-[#1e1e38] last:border-b-0">

                      {/* 章ヘッダー行 */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-[#13132a]">
                        <div
                          className="w-1 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: config.accentHex + '80' }}
                        />
                        <p className="flex-1 text-sm font-medium text-[#c8c8e8] leading-snug">
                          {ch.chapterName}
                        </p>
                        <span className="text-xs text-[#5a5a7a] tabular-nums shrink-0">
                          {ch.answered}/{ch.problems.length}
                        </span>
                        {/* 問題を開くアイコンボタン */}
                        <button
                          onClick={() => navigate(chapterPath)}
                          title="この章の問題を開く"
                          className="shrink-0 p-1.5 rounded-lg text-[#5a5a7a] hover:text-white hover:bg-[#252540] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* 章プログレスバー */}
                      <div className="h-px bg-[#2a2a4a]">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${chProgress}%`, backgroundColor: config.accentHex + '60' }}
                        />
                      </div>

                      {/* 問題一覧 */}
                      <div className="divide-y divide-[#1a1a35]">
                        {ch.problems.map(p => {
                          const latestResult = stats[p.id]?.latestResult ?? null
                          const history = (recentAttempts[p.id] ?? []).map(a => a.result)

                          return (
                            <button
                              key={p.id}
                              onClick={() => navigate(chapterPath)}
                              className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[#1a1a3a] transition-colors text-left"
                            >
                              {/* 最新結果バッジ */}
                              <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                latestResult === 'correct'
                                  ? 'bg-green-900/30 border-green-500/40 text-green-400'
                                  : latestResult === 'partial'
                                    ? 'bg-amber-900/30 border-amber-500/40 text-amber-400'
                                    : latestResult === 'incorrect'
                                      ? 'bg-red-900/30 border-red-500/40 text-red-400'
                                      : 'border-[#3a3a5c] text-[#5a5a7a]'
                              }`}>
                                {latestResult === 'correct' ? '○'
                                  : latestResult === 'partial' ? '△'
                                  : latestResult === 'incorrect' ? '✕'
                                  : '−'}
                              </span>

                              <div className="flex-1 min-w-0">
                                {/* 問題番号 + 問題文冒頭 */}
                                <p className="text-xs font-medium text-[#a78bfa] mb-0.5">{p.questionNo}</p>
                                <p className="text-xs text-[#8888aa] leading-snug line-clamp-1">
                                  {p.questionText.replace(/\$[^$]*\$/g, '[数式]').slice(0, 60)}
                                </p>
                                {/* 回答履歴ドット */}
                                {history.length > 0 && (
                                  <div className="mt-1.5">
                                    <HistoryDots history={history} />
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}

      </div>
    </div>
  )
}
