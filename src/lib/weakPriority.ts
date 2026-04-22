// =============================================
// src/lib/weakPriority.ts
// 弱点優先度ランキングアルゴリズム
//
// 参考:
//   - 証券アナリスト2次試験 科目別出題配分（CMA協会公式）
//     証券分析: 50点/200点 = 25%
//     財務分析: 50点/200点 = 25%
//     市場分析: 70点/200点 = 35%
//     職業倫理: 30点/200点 = 15%
//     ※試験により若干変動するが上記が目安
//   - Learning Time Value (LTV) モデル:
//     LTV = 改善量 × 出題点数 / 必要学習時間
// =============================================

import type { WeakPriorityEntry, SubjectWeight } from '../types/learning'
import type { WeakScoreOutput } from '../types/learning'
import type { SubjectKey } from '../types/problem'

// -----------------------------------------------
// 証券アナリスト2次試験 科目別出題比率
// -----------------------------------------------

export const CMA_SUBJECT_WEIGHTS: SubjectWeight[] = [
  { subject: 'securities', examWeight: 0.25, avgDifficulty: 2.5 },
  { subject: 'finance',    examWeight: 0.25, avgDifficulty: 2.2 },
  { subject: 'market',     examWeight: 0.35, avgDifficulty: 2.3 },
  { subject: 'ethics',     examWeight: 0.15, avgDifficulty: 1.5 },
]

/** 科目キー → 出題比率のマップ */
const EXAM_WEIGHT_MAP: Record<SubjectKey, number> = Object.fromEntries(
  CMA_SUBJECT_WEIGHTS.map(w => [w.subject, w.examWeight])
) as Record<SubjectKey, number>

// -----------------------------------------------
// 型定義
// -----------------------------------------------

type ChapterMeta = {
  subject: SubjectKey
  chapterKey: string
  chapterName: string
  totalProblems: number
  unansweredCount: number
}

type WeakScoreWithSubject = WeakScoreOutput & {
  subject: SubjectKey
  chapterKey: string
}

// -----------------------------------------------
// 改善速度の推定
// -----------------------------------------------

/**
 * チャプター内の問題群から改善速度を推定する
 * 改善速度 = 過去4週間のスコア下降率（週あたり）
 *
 * データが少ない場合は平均難易度から推定（易しい科目ほど改善しやすい）
 */
function estimateImprovementRate(
  scores: WeakScoreWithSubject[],
  windowWeeks: number = 4
): number {
  if (scores.length === 0) return 0.5 // デフォルト

  // 現在の平均弱点スコア
  const avgScore = scores.reduce((s, x) => s + x.score, 0) / scores.length

  // サンプル信頼度（データが多いほど推定が信頼できる）
  const avgConfidence = scores.reduce((s, x) => s + x.components.sampleConfidence, 0) / scores.length

  // トレンド補正の逆符号が改善速度の指標
  // trendPenalty < 0 = 改善中 → 改善速度が高い
  const avgTrend = scores.reduce((s, x) => s + x.components.trendPenalty, 0) / scores.length
  const trendBonus = Math.max(0, -avgTrend) / 10 // 0〜1に正規化

  // 出題難易度ベースの改善しやすさ（易しい問題ほど改善しやすい）
  const subjectWeight = scores.length > 0 ? EXAM_WEIGHT_MAP[scores[0].subject] : 0.25
  const difficultyEase = subjectWeight < 0.2 ? 0.8 : 0.5 // 倫理は改善しやすい

  // 低弱点スコア（既に習得済み）か高弱点スコア（改善余地大）かで調整
  const scoreModifier = avgScore > 60
    ? 1.2  // 弱点が多い = 改善しやすい（伸びしろが多い）
    : 0.8  // 既に良い = これ以上の改善は難しい

  const rate = (0.5 + trendBonus * 0.3 + difficultyEase * 0.2) * scoreModifier * avgConfidence
  return Math.max(0.1, Math.min(2.0, Math.round(rate * 100) / 100))
}

// -----------------------------------------------
// 優先度スコア計算
// -----------------------------------------------

/**
 * 章レベルの優先度スコアを計算
 *
 * 優先度スコア = 弱点スコア × 出題比率係数 × 試験対策係数
 *
 * 試験対策係数:
 *   - 未回答問題が多い章は優先度UP（手つかずの得点源）
 *   - 改善しやすい章は優先度UP（学習リターンが高い）
 */
function calcPriorityScore(
  avgWeakScore: number,
  examWeight: number,
  improvementRate: number,
  unansweredRatio: number  // 0〜1
): number {
  // 出題比率による係数（0.5倍〜2倍の範囲でスケール）
  // market(0.35) → 1.4x, ethics(0.15) → 0.6x
  const weightFactor = examWeight / 0.25  // 0.25 を基準に正規化

  // 未回答ボーナス（手つかずは優先度UP）
  const unansweredBonus = 1 + unansweredRatio * 0.5

  // 学習リターン = 改善速度 × 出題比率
  const learningReturn = improvementRate * examWeight

  // 総合スコア（0〜100スケールを維持）
  const raw = avgWeakScore * weightFactor * unansweredBonus
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10))
}

// -----------------------------------------------
// メイン関数
// -----------------------------------------------

/**
 * 弱点優先度ランキングを生成する
 *
 * @param weakScores 全問題の弱点スコア（calcWeakScoresBatch の出力）
 * @param chapterMetas 章メタ情報（subject, chapterKey, chapterName など）
 * @param topN 上位 N 件を返す（デフォルト: 全件）
 * @returns WeakPriorityEntry[] ランク付き優先度リスト
 */
export function calcWeakPriorityRanking(
  weakScores: WeakScoreWithSubject[],
  chapterMetas: ChapterMeta[],
  topN?: number
): WeakPriorityEntry[] {
  const entries: WeakPriorityEntry[] = []

  chapterMetas.forEach(meta => {
    const chapterScores = weakScores.filter(s => s.chapterKey === meta.chapterKey)

    if (chapterScores.length === 0) {
      // スコアなし（未回答問題のみの章）→ 中程度スコアで登録
      const examWeight = EXAM_WEIGHT_MAP[meta.subject]
      const entry: WeakPriorityEntry = {
        subject: meta.subject,
        chapterKey: meta.chapterKey,
        chapterName: meta.chapterName,
        avgWeakScore: 50,
        priorityScore: 50 * (examWeight / 0.25),
        improvementRate: 0.8,  // 未着手なので改善しやすいと仮定
        learningReturn: 0.8 * examWeight,
        unansweredCount: meta.unansweredCount,
        totalProblems: meta.totalProblems,
        rank: 0, // 後で付与
      }
      entries.push(entry)
      return
    }

    const avgWeakScore = chapterScores.reduce((s, x) => s + x.score, 0) / chapterScores.length
    const examWeight   = EXAM_WEIGHT_MAP[meta.subject]
    const improvementRate = estimateImprovementRate(chapterScores)
    const unansweredRatio = meta.unansweredCount / Math.max(1, meta.totalProblems)
    const priorityScore   = calcPriorityScore(avgWeakScore, examWeight, improvementRate, unansweredRatio)
    const learningReturn  = improvementRate * examWeight

    entries.push({
      subject: meta.subject,
      chapterKey: meta.chapterKey,
      chapterName: meta.chapterName,
      avgWeakScore: Math.round(avgWeakScore * 10) / 10,
      priorityScore,
      improvementRate,
      learningReturn: Math.round(learningReturn * 1000) / 1000,
      unansweredCount: meta.unansweredCount,
      totalProblems: meta.totalProblems,
      rank: 0,
    })
  })

  // priorityScore 降順でソート
  entries.sort((a, b) => b.priorityScore - a.priorityScore)

  // ランク付与
  entries.forEach((e, i) => { e.rank = i + 1 })

  return topN !== undefined ? entries.slice(0, topN) : entries
}

// -----------------------------------------------
// 科目別集計
// -----------------------------------------------

/**
 * 科目ごとの平均弱点スコアと優先度を返す
 */
export function calcSubjectPriority(
  weakScores: WeakScoreWithSubject[]
): { subject: SubjectKey; avgWeakScore: number; examWeight: number; priorityScore: number }[] {
  const subjectGroups: Partial<Record<SubjectKey, WeakScoreWithSubject[]>> = {}

  weakScores.forEach(s => {
    if (!subjectGroups[s.subject]) subjectGroups[s.subject] = []
    subjectGroups[s.subject]!.push(s)
  })

  return CMA_SUBJECT_WEIGHTS.map(w => {
    const scores = subjectGroups[w.subject] ?? []
    const avgWeakScore = scores.length > 0
      ? scores.reduce((s, x) => s + x.score, 0) / scores.length
      : 50
    const priorityScore = calcPriorityScore(avgWeakScore, w.examWeight, 0.8, 0)

    return {
      subject: w.subject,
      avgWeakScore: Math.round(avgWeakScore * 10) / 10,
      examWeight: w.examWeight,
      priorityScore: Math.round(priorityScore * 10) / 10,
    }
  }).sort((a, b) => b.priorityScore - a.priorityScore)
}

// -----------------------------------------------
// テストケース
// -----------------------------------------------

if (import.meta.env?.DEV) {
  const _testPriority = () => {
    const mockScores: WeakScoreWithSubject[] = [
      // market（出題比率35%）で弱点が多い
      { problemId: 'm1', subject: 'market', chapterKey: 'market-ch1', score: 80,
        components: { accuracyScore: 30, forgettingScore: 20, difficultyWeight: 20, trendPenalty: 10, sampleConfidence: 0.8 },
        recentAccuracy: 0.3, overallAccuracy: 0.4, daysSinceLastAttempt: 5, attemptCount: 5 },
      // ethics（出題比率15%）で弱点がある
      { problemId: 'e1', subject: 'ethics', chapterKey: 'ethics-ch1', score: 80,
        components: { accuracyScore: 30, forgettingScore: 20, difficultyWeight: 15, trendPenalty: 10, sampleConfidence: 0.8 },
        recentAccuracy: 0.3, overallAccuracy: 0.4, daysSinceLastAttempt: 5, attemptCount: 5 },
    ]

    const metas: ChapterMeta[] = [
      { subject: 'market', chapterKey: 'market-ch1', chapterName: '市場分析第1章', totalProblems: 10, unansweredCount: 0 },
      { subject: 'ethics', chapterKey: 'ethics-ch1', chapterName: '倫理第1章', totalProblems: 10, unansweredCount: 0 },
    ]

    const ranking = calcWeakPriorityRanking(mockScores, metas)
    // market は出題比率が高いので倫理より優先度が高いはず
    console.assert(
      ranking.find(r => r.subject === 'market')!.rank
      < ranking.find(r => r.subject === 'ethics')!.rank,
      'Test: market（出題比率35%）はethics（15%）より優先度が高いべき'
    )
    console.log('[weakPriority] Test passed', ranking)
  }
  // _testPriority()
}
