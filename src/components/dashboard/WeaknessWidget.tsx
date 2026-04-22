import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, PlayCircle } from 'lucide-react'
import { useProblemStore } from '../../stores/problemStore'
import { SUBJECT_CONFIGS } from '../../types/problem'
import type { Problem } from '../../types/problem'

// 1問の弱点度スコア（0-100）— シンプルな合算で算出
// - 最新が不正解なら +40、部分正解なら +20
// - 不正解回数 × 6、部分正解回数 × 3
// - 最終挑戦から日数経過 × 0.8
function weaknessScoreFor(stats: {
  latestResult: 'correct' | 'partial' | 'incorrect'
  incorrectCount: number
  partialCount: number
  lastAttemptedAt: string
}): number {
  let score = 0
  if (stats.latestResult === 'incorrect') score += 40
  else if (stats.latestResult === 'partial') score += 20
  score += stats.incorrectCount * 6
  score += stats.partialCount * 3
  const daysSince = (Date.now() - new Date(stats.lastAttemptedAt).getTime()) / 86400000
  score += Math.min(30, Math.round(daysSince * 0.8))
  return Math.min(100, Math.round(score))
}

export default function WeaknessWidget() {
  const navigate = useNavigate()
  const { problems, stats, fetchRecentAttempts } = useProblemStore()

  // 弱点問題（最新が partial / incorrect のもの）を弱点スコア降順で並べる
  const weakProblems = useMemo(() => {
    return problems
      .map((p) => {
        const s = stats[p.id]
        if (!s) return null
        if (s.latestResult !== 'incorrect' && s.latestResult !== 'partial') return null
        return {
          problem: p,
          score: weaknessScoreFor(s),
          latestResult: s.latestResult,
        }
      })
      .filter((x): x is { problem: Problem; score: number; latestResult: 'partial' | 'incorrect' } => x !== null)
      .sort((a, b) => b.score - a.score)
  }, [problems, stats])

  // 今日の克服推奨（最も弱い3問）
  const todaysPicks = weakProblems.slice(0, 3)

  // 科目別の弱点問題数サマリー
  const subjectSummary = useMemo(() => {
    return SUBJECT_CONFIGS.map((cfg) => {
      const count = weakProblems.filter((w) => w.problem.subject === cfg.key).length
      return { ...cfg, count }
    }).filter((s) => s.count > 0)
  }, [weakProblems])

  // ウィジェット表示時に対象問題の履歴を prefetch（演習開始時の応答性向上）
  useEffect(() => {
    if (todaysPicks.length > 0) {
      fetchRecentAttempts(todaysPicks.map((x) => x.problem.id))
    }
  }, [todaysPicks, fetchRecentAttempts])

  // まだ弱点がない or 未回答データのみ
  if (weakProblems.length === 0) {
    return (
      <div className="bg-[#1e1e3a] rounded-[20px] p-4 sm:p-5 border border-[#2a2a4a]">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-[#5a5a7a]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">今日の弱点克服</h2>
        </div>
        <p className="text-xs text-[#8888aa] leading-relaxed">
          現在、不正解・部分正解の問題はありません。
          問題を解いて弱点を検出するとここに表示されます。
        </p>
      </div>
    )
  }

  function handleStart(problem: Problem) {
    const cfg = SUBJECT_CONFIGS.find((c) => c.key === problem.subject)
    if (!cfg) return
    navigate(`${cfg.path}?chapter=${problem.chapterKey}&problem=${problem.id}`)
  }

  return (
    <div className="bg-[#1e1e3a] rounded-[20px] p-4 sm:p-5 border border-[#2a2a4a] space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">今日の弱点克服</h2>
        </div>
        <span className="text-[10px] text-[#8888aa]">
          克服待ち <span className="text-orange-400 font-bold">{weakProblems.length}</span> 問
        </span>
      </div>

      {/* 科目別サマリーチップ */}
      {subjectSummary.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {subjectSummary.map((s) => (
            <span
              key={s.key}
              className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: s.accentBg,
                borderColor: s.accentHex + '55',
                color: s.accentHex,
              }}
            >
              {s.shortLabel} {s.count}問
            </span>
          ))}
        </div>
      )}

      {/* 推奨3問リスト */}
      <div className="space-y-1.5">
        {todaysPicks.map(({ problem, score, latestResult }) => {
          const cfg = SUBJECT_CONFIGS.find((c) => c.key === problem.subject)
          const scoreColor = score >= 60 ? 'text-red-400' : score >= 30 ? 'text-amber-400' : 'text-[#8888aa]'
          return (
            <button
              key={problem.id}
              onClick={() => handleStart(problem)}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl
                         bg-[#111125] border border-[#2a2a4a]
                         hover:border-orange-500/40 hover:bg-[#1a1a3a] transition-all text-left group"
            >
              {/* 最新結果バッジ */}
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  latestResult === 'partial'
                    ? 'bg-amber-900/30 border-amber-500/40 text-amber-400'
                    : 'bg-red-900/30 border-red-500/40 text-red-400'
                }`}
              >
                {latestResult === 'partial' ? '△' : '×'}
              </span>

              {/* 科目・問題番号・問題文 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {cfg && (
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: cfg.accentHex }}
                    >
                      {cfg.shortLabel}
                    </span>
                  )}
                  <span className="text-[10px] text-[#3a3a5c]">·</span>
                  <span className="text-[10px] font-medium text-[#a78bfa]">{problem.questionNo}</span>
                </div>
                <p className="text-xs text-[#c8c8e8] leading-snug line-clamp-1">
                  {problem.questionText.replace(/\$[^$]*\$/g, '[数式]').slice(0, 40)}
                </p>
              </div>

              {/* 弱点スコア */}
              <span className={`text-[10px] font-bold tabular-nums shrink-0 ${scoreColor}`}>
                {score}
              </span>

              {/* 演習アイコン */}
              <PlayCircle
                className="w-4 h-4 text-[#5a5a7a] group-hover:text-orange-400 transition-colors shrink-0"
                strokeWidth={1.5}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
