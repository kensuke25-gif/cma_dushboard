import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { SUBJECT_CONFIGS } from '../types/problem'
import type { SubjectKey } from '../types/problem'
import { useProblemStore } from '../stores/problemStore'

// ── 回答履歴ドット ─────────────────────────────────
type AttemptResult = 'correct' | 'partial' | 'incorrect'

function HistoryDots({ history }: { history: AttemptResult[] }) {
  const slots = Array.from({ length: 10 }, (_, i) => history[i] ?? null)
  return (
    <div className="flex items-center gap-0.5">
      {slots.map((r, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
            r === 'correct'
              ? 'bg-green-900/50 border-green-500/50 text-green-400'
              : r === 'partial'
                ? 'bg-amber-900/50 border-amber-500/50 text-amber-400'
                : r === 'incorrect'
                  ? 'bg-red-900/50 border-red-500/50 text-red-400'
                  : 'border-[#2a2a4a] text-[#3a3a5c]'
          }`}
        >
          {r === 'correct' ? '○' : r === 'partial' ? '△' : r === 'incorrect' ? '✕' : '−'}
        </span>
      ))}
    </div>
  )
}

// ── メインコンポーネント ─────────────────────────────
export default function ProblemsIndexPage() {
  const navigate = useNavigate()
  const { problems, stats, recentAttempts, fetchRecentAttempts, loadingProblems, deleteChapter } = useProblemStore()

  // 展開中の科目キーセット（デフォルト: 全て折りたたみ）
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  // 展開中の章キーセット（デフォルト: 全て折りたたみ）
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  // 削除確認中の章キー（null = 確認なし）
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)
  // 削除処理中フラグ
  const [deleting, setDeleting] = useState(false)

  const toggleSubject = (key: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleChapter = (key: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleDeleteChapter = async (chapterKey: string) => {
    setDeleting(true)
    await deleteChapter(chapterKey)
    setConfirmDeleteKey(null)
    setDeleting(false)
  }

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
        chapters.push({ chapterKey: p.chapterKey, chapterName: p.chapterName, problems: chProblems, answered })
      }
    })

    const totalProblems = subjectProblems.length
    const totalAnswered = subjectProblems.filter(p => stats[p.id]?.latestResult).length
    const progress = totalProblems > 0 ? Math.round((totalAnswered / totalProblems) * 100) : 0

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
          const isSubjectExpanded = expandedSubjects.has(config.key)

          return (
            <div key={config.key} className="mb-4 bg-[#111125] rounded-2xl border border-[#2a2a4a] overflow-hidden">

              {/* 科目ヘッダー（タップで章一覧を展開/格納） */}
              <button
                onClick={() => toggleSubject(config.key)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#161630] transition-colors"
              >
                <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: config.accentHex }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{config.shortLabel}</p>
                  <p className="text-xs text-[#5a5a7a] truncate">{config.label}</p>
                </div>
                <div className="shrink-0 text-right mr-2">
                  <p className="text-xs text-[#8888aa]">{totalAnswered} / {totalProblems}</p>
                  <p className="text-xs font-medium" style={{ color: config.accentHex }}>{progress}%</p>
                </div>
                {isSubjectExpanded
                  ? <ChevronUp className="w-4 h-4 text-[#5a5a7a] shrink-0" strokeWidth={1.5} />
                  : <ChevronDown className="w-4 h-4 text-[#5a5a7a] shrink-0" strokeWidth={1.5} />
                }
              </button>

              {/* 科目プログレスバー */}
              <div className="h-0.5 bg-[#2a2a4a]">
                <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: config.accentHex }} />
              </div>

              {/* 章一覧（展開時のみ） */}
              {isSubjectExpanded && <div className="divide-y divide-[#1e1e38]">
                {chapters.map(ch => {
                  const isExpanded = expandedChapters.has(ch.chapterKey)
                  const isConfirming = confirmDeleteKey === ch.chapterKey
                  const chapterPath = `${config.path}?chapter=${ch.chapterKey}`
                  const chProgress = ch.problems.length > 0
                    ? Math.round((ch.answered / ch.problems.length) * 100)
                    : 0

                  return (
                    <div key={ch.chapterKey}>

                      {/* 章ヘッダー行 */}
                      <div className="flex items-center gap-2 px-4 py-3">
                        {/* 章名（タップで展開トグル） */}
                        <button
                          onClick={() => toggleChapter(ch.chapterKey)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <div
                            className="w-1 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: config.accentHex + '80' }}
                          />
                          <span className="text-sm text-[#c8c8e8] leading-snug flex-1">{ch.chapterName}</span>
                        </button>

                        {/* 回答進捗 */}
                        <span className="text-xs text-[#5a5a7a] tabular-nums shrink-0">
                          {ch.answered}/{ch.problems.length}
                        </span>

                        {/* 問題集へジャンプ */}
                        <button
                          onClick={() => navigate(chapterPath)}
                          title="この章の問題を開く"
                          className="shrink-0 p-1.5 rounded-lg text-[#5a5a7a] hover:text-white hover:bg-[#252540] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>

                        {/* 削除ボタン */}
                        <button
                          onClick={() => setConfirmDeleteKey(isConfirming ? null : ch.chapterKey)}
                          title="この章を削除"
                          className="shrink-0 p-1.5 rounded-lg text-[#5a5a7a] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>

                        {/* 展開トグル */}
                        <button
                          onClick={() => toggleChapter(ch.chapterKey)}
                          title={isExpanded ? '折りたたむ' : '問題一覧を表示'}
                          className="shrink-0 p-1.5 rounded-lg text-[#5a5a7a] hover:text-white hover:bg-[#252540] transition-colors"
                        >
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                            : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                          }
                        </button>
                      </div>

                      {/* 削除確認バー */}
                      {isConfirming && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/40 border-t border-red-900/40">
                          <p className="flex-1 text-xs text-red-300">
                            「{ch.chapterName}」の問題と回答履歴を全て削除しますか？
                          </p>
                          <button
                            onClick={() => setConfirmDeleteKey(null)}
                            className="px-3 py-1 text-xs text-[#8888aa] hover:text-white rounded-lg hover:bg-[#252540] transition-colors"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(ch.chapterKey)}
                            disabled={deleting}
                            className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting ? '削除中…' : '削除する'}
                          </button>
                        </div>
                      )}

                      {/* 章プログレスバー */}
                      {ch.answered > 0 && (
                        <div className="h-px mx-4 bg-[#2a2a4a] rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${chProgress}%`, backgroundColor: config.accentHex + '70' }}
                          />
                        </div>
                      )}

                      {/* 問題一覧（展開時のみ） */}
                      {isExpanded && (
                        <div className="bg-[#0e0e20] border-t border-[#1e1e38] divide-y divide-[#1a1a35]">
                          {ch.problems.map(p => {
                            const latestResult = stats[p.id]?.latestResult ?? null
                            const history = (recentAttempts[p.id] ?? []).map(a => a.result)

                            return (
                              <button
                                key={p.id}
                                onClick={() => navigate(chapterPath)}
                                className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[#1a1a3a] transition-colors text-left"
                              >
                                <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  latestResult === 'correct'    ? 'bg-green-900/30 border-green-500/40 text-green-400'
                                  : latestResult === 'partial'  ? 'bg-amber-900/30 border-amber-500/40 text-amber-400'
                                  : latestResult === 'incorrect'? 'bg-red-900/30 border-red-500/40 text-red-400'
                                  : 'border-[#3a3a5c] text-[#5a5a7a]'
                                }`}>
                                  {latestResult === 'correct' ? '○'
                                    : latestResult === 'partial' ? '△'
                                    : latestResult === 'incorrect' ? '✕'
                                    : '−'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-[#a78bfa] mb-0.5">{p.questionNo}</p>
                                  <p className="text-xs text-[#8888aa] leading-snug line-clamp-1">
                                    {p.questionText.replace(/\$[^$]*\$/g, '[数式]').slice(0, 60)}
                                  </p>
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
                      )}

                    </div>
                  )
                })}
              </div>}

            </div>
          )
        })}

      </div>
    </div>
  )
}
