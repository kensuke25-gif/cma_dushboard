import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { List, X } from 'lucide-react'
import { SUBJECT_CONFIGS } from '../types/problem'
import { useProblemStore } from '../stores/problemStore'
import ProblemCard from '../components/problems/ProblemCard'

export default function ProblemPage() {
  const { subject } = useParams<{ subject: string }>()
  const config = SUBJECT_CONFIGS.find(c => c.key === subject)

  const {
    loadingProblems,
    stats,
    submitResult,
    getSubjectStats,
    getProblemsBySubject,
  } = useProblemStore()
  const [activeChapter, setActiveChapter] = useState<string>('')
  const [showTocModal, setShowTocModal] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const filteredProblems = config ? getProblemsBySubject(config.key) : []

  // 章ごとにグルーピング
  const chapterKeys = [...new Set(filteredProblems.map(p => p.chapterKey))]
  const grouped = chapterKeys.map(key => ({
    chapterKey: key,
    chapterName: filteredProblems.find(p => p.chapterKey === key)!.chapterName,
    problems: filteredProblems.filter(p => p.chapterKey === key),
  }))

  // Intersection Observer でアクティブ章をハイライト
  useEffect(() => {
    if (grouped.length === 0) return

    observerRef.current?.disconnect()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChapter(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )
    observerRef.current = observer

    document.querySelectorAll('[data-chapter-section]').forEach((el) => {
      observer.observe(el)
    })

    if (grouped.length > 0 && !activeChapter) {
      setActiveChapter(grouped[0].chapterKey)
    }

    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped.length])

  // ハッシュアンカーへスクロール（ページロード時）
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [filteredProblems.length])

  function scrollToChapter(chapterKey: string) {
    const el = document.getElementById(chapterKey)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowTocModal(false)
    }
  }

  const subjectStats = config ? getSubjectStats(config.key) : null

  if (!config) {
    return (
      <div className="min-h-[calc(100vh-112px)] bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-[#8888aa]">科目が見つかりません</p>
      </div>
    )
  }

  // 目次サイドバーの中身（共通）
  function TocContent() {
    return (
      <div className="space-y-1">
        {grouped.map(({ chapterKey, chapterName, problems: ps }) => (
          <button
            key={chapterKey}
            onClick={() => scrollToChapter(chapterKey)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
              activeChapter === chapterKey
                ? 'bg-[#7c4dff]/20 text-[#a78bfa] font-medium'
                : 'text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#1a1a3a]'
            }`}
          >
            <span className="line-clamp-2 leading-snug">{chapterName}</span>
            <span className="mt-0.5 block text-[10px] text-[#5a5a7a]">{ps.length}問</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#1a1a2e]">

      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-[#111125] border-b border-[#2a2a4a] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate split:text-base">
              {config.shortLabel}
            </h1>
            {activeChapter && grouped.find(g => g.chapterKey === activeChapter) && (
              <p className="text-xs text-[#8888aa] truncate split:hidden">
                {grouped.find(g => g.chapterKey === activeChapter)!.chapterName}
              </p>
            )}
          </div>
          {subjectStats && subjectStats.total > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs px-2 py-1 rounded-lg bg-green-900/30 text-green-400 font-medium">
                正解 {subjectStats.correct}
              </span>
              <span className="text-xs px-2 py-1 rounded-lg bg-[#252540] text-[#8888aa]">
                未回答 {subjectStats.unanswered}
              </span>
              <span className="text-xs text-[#5a5a7a]">/{subjectStats.total}</span>
            </div>
          )}
        </div>
      </div>

      {/* メインレイアウト */}
      <div className="max-w-5xl mx-auto flex gap-6 px-4 py-6">

        {/* 目次サイドバー（split以上で表示） */}
        <aside className="hidden split:block w-56 shrink-0">
          <div className="sticky top-[64px]">
            <p className="text-xs font-medium text-[#9090bb] px-3 mb-2">目次</p>
            <TocContent />
          </div>
        </aside>

        {/* 問題エリア */}
        <main className="flex-1 min-w-0">
          {loadingProblems && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#7c4dff] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loadingProblems && filteredProblems.length === 0 ? (
            <div className="rounded-2xl border border-[#2a2a4a] bg-[#111125] py-16 text-center">
              <p className="text-sm text-[#8888aa]">この科目の問題データが登録されていません</p>
              <p className="text-xs text-[#5a5a7a] mt-1">管理者による問題データのアップロードをお待ちください</p>
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map(({ chapterKey, chapterName, problems: ps }) => (
                <section
                  key={chapterKey}
                  id={chapterKey}
                  data-chapter-section
                  style={{ scrollMarginTop: '80px' }}
                >
                  {/* 章ヘッダー */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#2a2a4a]">
                    <div className="w-1 h-4 rounded-full bg-[#7c4dff] shrink-0" />
                    <h2 className="text-sm font-semibold text-[#c8c8e8]">{chapterName}</h2>
                    <span className="text-xs text-[#5a5a7a]">{ps.length}問</span>
                  </div>

                  {/* 問題カード一覧 */}
                  <div className="space-y-4">
                    {ps.map(problem => (
                      <ProblemCard
                        key={problem.id}
                        problem={problem}
                        result={stats[problem.id]?.latestResult ?? null}
                        onSetResult={(r) => {
                          if (r !== null) submitResult(problem.id, r)
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* FABボタン（Split View時のみ表示） */}
      <button
        onClick={() => setShowTocModal(true)}
        className="fixed bottom-6 right-4 z-30 split:hidden flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1a1a30]/95 border border-[#7c4dff]/50 shadow-xl backdrop-blur-sm hover:border-[#7c4dff] hover:bg-[#252545] transition-colors"
      >
        <List className="w-4 h-4 text-[#a78bfa]" />
        <span className="text-sm font-medium text-[#c8c8e8]">目次</span>
      </button>

      {/* 目次モーダル（Split View時） */}
      {showTocModal && (
        <div className="fixed inset-0 z-50 split:hidden flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTocModal(false)}
          />
          <div className="relative bg-[#111125] border-t border-[#2a2a4a] rounded-t-2xl px-4 pt-4 pb-8 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">目次</p>
              <button
                onClick={() => setShowTocModal(false)}
                className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <TocContent />
          </div>
        </div>
      )}
    </div>
  )
}
