import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, CheckCircle, Circle } from 'lucide-react'
import { SUBJECT_CONFIGS } from '../types/problem'
import type { SubjectKey } from '../types/problem'
import { useProblemStore } from '../stores/problemStore'

export default function ProblemsIndexPage() {
  const navigate = useNavigate()
  const { problems, stats, loadingProblems } = useProblemStore()

  // 科目ごとに章一覧をまとめる
  const subjectChapters = SUBJECT_CONFIGS.map(config => {
    const subjectProblems = problems.filter(p => p.subject === config.key as SubjectKey)
    // chapter_key でユニークな章を抽出（displayOrder 順）
    const seen = new Set<string>()
    const chapters: { chapterKey: string; chapterName: string; count: number; answered: number; correct: number }[] = []

    subjectProblems.forEach(p => {
      if (!seen.has(p.chapterKey)) {
        seen.add(p.chapterKey)
        const chProblems = subjectProblems.filter(q => q.chapterKey === p.chapterKey)
        const answered = chProblems.filter(q => stats[q.id]?.latestResult).length
        const correct = chProblems.filter(q => stats[q.id]?.latestResult === 'correct').length
        chapters.push({
          chapterKey: p.chapterKey,
          chapterName: p.chapterName,
          count: chProblems.length,
          answered,
          correct,
        })
      }
    })

    const totalProblems = subjectProblems.length
    const totalAnswered = subjectProblems.filter(p => stats[p.id]?.latestResult).length
    const totalCorrect = subjectProblems.filter(p => stats[p.id]?.latestResult === 'correct').length

    return { config, chapters, totalProblems, totalAnswered, totalCorrect }
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
        {!loadingProblems && subjectChapters.map(({ config, chapters, totalProblems, totalAnswered }) => {
          if (totalProblems === 0) return null

          const progress = totalProblems > 0
            ? Math.round((totalAnswered / totalProblems) * 100)
            : 0

          return (
            <div key={config.key} className="mb-6 bg-[#111125] rounded-2xl border border-[#2a2a4a] overflow-hidden">

              {/* 科目ヘッダー */}
              <button
                onClick={() => navigate(config.path)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#1a1a3a] transition-colors text-left border-b border-[#2a2a4a]"
              >
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
                <ChevronRight className="w-4 h-4 text-[#5a5a7a] shrink-0" strokeWidth={1.5} />
              </button>

              {/* プログレスバー */}
              <div className="h-0.5 bg-[#2a2a4a]">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: config.accentHex }}
                />
              </div>

              {/* 章一覧 */}
              <div className="divide-y divide-[#1e1e38]">
                {chapters.map(ch => {
                  const chProgress = ch.count > 0
                    ? Math.round((ch.answered / ch.count) * 100)
                    : 0
                  const done = ch.answered === ch.count && ch.count > 0

                  return (
                    <button
                      key={ch.chapterKey}
                      onClick={() => navigate(config.path)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a3a] transition-colors text-left"
                    >
                      {done
                        ? <CheckCircle className="w-4 h-4 shrink-0 text-green-400" strokeWidth={1.5} />
                        : <Circle className="w-4 h-4 shrink-0 text-[#3a3a5c]" strokeWidth={1.5} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#c8c8e8] leading-snug">{ch.chapterName}</p>
                        {ch.answered > 0 && (
                          <div className="mt-1 h-0.5 bg-[#2a2a4a] rounded-full overflow-hidden w-32">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${chProgress}%`, backgroundColor: config.accentHex + '99' }}
                            />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[#5a5a7a] shrink-0 tabular-nums">
                        {ch.answered}/{ch.count}
                      </span>
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
}
