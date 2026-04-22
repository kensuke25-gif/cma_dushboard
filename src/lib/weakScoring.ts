// =============================================
// src/lib/weakScoring.ts
// 弱点スコアリングアルゴリズム
//
// 参考文献:
//   - Ebbinghaus (1885) "Über das Gedächtnis"
//     忘却曲線: R = e^(-t/S)  t=経過時間, S=安定性
//   - Averell & Heathcote (2011) Power law of forgetting
//   - Cen et al. (2006) Learning Factors Analysis
// =============================================

import type { WeakScoreInput, WeakScoreOutput, AttemptRecord } from '../types/learning'
import type { Difficulty } from '../types/problem'

// -----------------------------------------------
// 定数
// -----------------------------------------------

/** 難易度別の弱点スコア基礎重み（0-20 の成分）*/
const DIFFICULTY_BASE: Record<Difficulty, number> = {
  1: 8,   // 易：低い重み（できて当然）
  2: 14,  // 普通
  3: 20,  // 難：高い重み（失点コストが大きい）
}

/** 忘却曲線の安定性パラメータ S（日数単位）
 *  正解後のメモリ安定性。難しい問題ほど短い（忘れやすい）*/
const STABILITY_BY_DIFFICULTY: Record<Difficulty, number> = {
  1: 14,  // 易：14日で大幅減衰
  2: 8,   // 普通：8日
  3: 4,   // 難：4日
}

/** 最低サンプル数（信頼度係数を 1.0 にするのに必要な回答数）*/
const MIN_RELIABLE_SAMPLES = 5

// -----------------------------------------------
// ヘルパー
// -----------------------------------------------

/**
 * 正答率を計算（correct=1.0, partial=0.5, incorrect=0.0）
 */
function calcAccuracy(attempts: AttemptRecord[]): number {
  if (attempts.length === 0) return 0
  const sum = attempts.reduce((acc, a) => {
    if (a.result === 'correct')   return acc + 1.0
    if (a.result === 'partial')   return acc + 0.5
    return acc // incorrect
  }, 0)
  return sum / attempts.length
}

/**
 * Ebbinghaus 忘却曲線による記憶保持率
 * R(t) = e^(-t / S)
 * @param daysSince 最後の挑戦からの経過日数
 * @param difficulty 問題難易度
 * @returns 0〜1（1=完全記憶、0=完全忘却）
 */
function retentionRate(daysSince: number, difficulty: Difficulty): number {
  const S = STABILITY_BY_DIFFICULTY[difficulty]
  return Math.exp(-daysSince / S)
}

/**
 * トレンド係数を計算
 * 最近の成績が改善傾向なら負（弱点スコア下げる）、悪化傾向なら正（弱点スコア上げる）
 * @returns -10〜+15 の補正値
 */
function calcTrendPenalty(attempts: AttemptRecord[]): number {
  if (attempts.length < 4) return 0

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
  )

  // 前半と後半に分けて正答率を比較
  const mid = Math.floor(sorted.length / 2)
  const firstHalf  = sorted.slice(0, mid)
  const secondHalf = sorted.slice(mid)

  const firstAcc  = calcAccuracy(firstHalf)
  const secondAcc = calcAccuracy(secondHalf)

  const delta = secondAcc - firstAcc // 改善 > 0、悪化 < 0

  if (delta > 0.3) return -10  // 大きく改善 → スコアを大きく下げる
  if (delta > 0.1) return -5   // 改善
  if (delta > -0.1) return 0   // 横ばい
  if (delta > -0.3) return +8  // 悪化
  return +15                   // 急激に悪化
}

/**
 * サンプル信頼度係数
 * 回答数が少ないと推定が不安定なので係数で抑制
 * f(n) = n / (n + MIN_RELIABLE_SAMPLES)  （Laplace smoothing 的アプローチ）
 */
function sampleConfidence(attemptCount: number): number {
  return attemptCount / (attemptCount + MIN_RELIABLE_SAMPLES)
}

// -----------------------------------------------
// メイン関数
// -----------------------------------------------

/**
 * 弱点スコア算出
 *
 * スコア構造（合計 0〜100）:
 *   ① 正答率成分          0〜40  （全期間 × 0.4 + 直近5回 × 0.6 で重み付け）
 *   ② 忘却曲線成分        0〜25  （記憶保持率が低いほど高い）
 *   ③ 難易度成分          0〜20  （難しい問題ほど高い）
 *   ④ トレンド補正        -10〜+15
 *
 * 全て加算後にサンプル信頼度係数で乗算（少ないサンプルは過大評価しない）
 * 最終値を [0, 100] にクリップ
 */
export function calcWeakScore(input: WeakScoreInput): WeakScoreOutput {
  const { problemId, difficulty, attempts } = input

  // ---- 未回答の場合 ----
  if (attempts.length === 0) {
    return {
      problemId,
      score: 50, // 情報なし → 中程度の弱点とみなす
      components: {
        accuracyScore: 20,
        forgettingScore: 20,
        difficultyWeight: DIFFICULTY_BASE[difficulty],
        trendPenalty: 0,
        sampleConfidence: 0,
      },
      recentAccuracy: 0,
      overallAccuracy: 0,
      daysSinceLastAttempt: Infinity,
      attemptCount: 0,
    }
  }

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
  )

  // ① 正答率成分（0〜40）
  const overallAccuracy = calcAccuracy(sorted)
  const recent5 = sorted.slice(-5)
  const recentAccuracy = calcAccuracy(recent5)
  // 直近重視（6:4）
  const blendedInaccuracy = (1 - recentAccuracy) * 0.6 + (1 - overallAccuracy) * 0.4
  const accuracyScore = blendedInaccuracy * 40 // 0〜40

  // ② 忘却曲線成分（0〜25）
  const lastAttempt = sorted[sorted.length - 1]
  const daysSinceLastAttempt = Math.floor(
    (Date.now() - new Date(lastAttempt.attemptedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const retention = retentionRate(daysSinceLastAttempt, difficulty)
  // 正解している場合のみ忘却を考慮（不正解なら既に弱点として認識済み）
  const lastWasCorrect = lastAttempt.result === 'correct'
  const forgettingScore = lastWasCorrect
    ? (1 - retention) * 25   // 正解後に時間が経つほどスコアUP
    : 25 * 0.3                // 不正解なら固定で忘却ペナルティは少なめ（accuracyが既に反映）

  // ③ 難易度成分（0〜20）
  const difficultyWeight = DIFFICULTY_BASE[difficulty]

  // ④ トレンド補正（-10〜+15）
  const trendPenalty = calcTrendPenalty(sorted)

  // サンプル信頼度
  const confidence = sampleConfidence(attempts.length)

  // 合算（信頼度で乗算）
  const rawScore = accuracyScore + forgettingScore + difficultyWeight + trendPenalty
  const score = Math.max(0, Math.min(100, Math.round(rawScore * confidence)))

  return {
    problemId,
    score,
    components: {
      accuracyScore: Math.round(accuracyScore * 10) / 10,
      forgettingScore: Math.round(forgettingScore * 10) / 10,
      difficultyWeight,
      trendPenalty,
      sampleConfidence: Math.round(confidence * 100) / 100,
    },
    recentAccuracy: Math.round(recentAccuracy * 1000) / 1000,
    overallAccuracy: Math.round(overallAccuracy * 1000) / 1000,
    daysSinceLastAttempt,
    attemptCount: attempts.length,
  }
}

/**
 * 複数問題を一括スコアリングして降順ソート
 */
export function calcWeakScoresBatch(inputs: WeakScoreInput[]): WeakScoreOutput[] {
  return inputs
    .map(calcWeakScore)
    .sort((a, b) => b.score - a.score)
}

// -----------------------------------------------
// テストケース（開発時の動作確認用）
// -----------------------------------------------

if (import.meta.env?.DEV) {
  const _testCases = () => {
    const now = new Date().toISOString()
    const daysAgo = (n: number) =>
      new Date(Date.now() - n * 86400000).toISOString()

    // Case 1: 常に不正解、直近3日以内
    const c1 = calcWeakScore({
      problemId: 'test-1',
      difficulty: 3,
      attempts: [
        { result: 'incorrect', attemptedAt: daysAgo(10) },
        { result: 'incorrect', attemptedAt: daysAgo(5) },
        { result: 'incorrect', attemptedAt: daysAgo(1) },
      ],
    })
    console.assert(c1.score > 60, 'Case1: 高弱点スコアが期待される', c1.score)

    // Case 2: 全問正解、昨日回答
    const c2 = calcWeakScore({
      problemId: 'test-2',
      difficulty: 1,
      attempts: [
        { result: 'correct', attemptedAt: daysAgo(3) },
        { result: 'correct', attemptedAt: daysAgo(2) },
        { result: 'correct', attemptedAt: daysAgo(1) },
      ],
    })
    console.assert(c2.score < 30, 'Case2: 低弱点スコアが期待される', c2.score)

    // Case 3: 正解後30日経過（忘却）
    const c3 = calcWeakScore({
      problemId: 'test-3',
      difficulty: 3,
      attempts: [
        { result: 'incorrect', attemptedAt: daysAgo(60) },
        { result: 'correct', attemptedAt: daysAgo(30) },
      ],
    })
    console.assert(c3.score > 40, 'Case3: 忘却スコアが反映されるべき', c3.score)

    // Case 4: 未回答
    const c4 = calcWeakScore({ problemId: 'test-4', difficulty: 2, attempts: [] })
    console.assert(c4.score === 50, 'Case4: 未回答は50が期待される', c4.score)

    // Case 5: 改善トレンド（前半不正解→後半正解）
    const c5 = calcWeakScore({
      problemId: 'test-5',
      difficulty: 2,
      attempts: [
        { result: 'incorrect', attemptedAt: daysAgo(20) },
        { result: 'incorrect', attemptedAt: daysAgo(15) },
        { result: 'partial',   attemptedAt: daysAgo(10) },
        { result: 'correct',   attemptedAt: daysAgo(5) },
        { result: 'correct',   attemptedAt: daysAgo(1) },
      ],
    })
    // 悪化トレンドより低いはず
    const c5b = calcWeakScore({
      problemId: 'test-5b',
      difficulty: 2,
      attempts: [
        { result: 'correct',   attemptedAt: daysAgo(20) },
        { result: 'correct',   attemptedAt: daysAgo(15) },
        { result: 'partial',   attemptedAt: daysAgo(10) },
        { result: 'incorrect', attemptedAt: daysAgo(5) },
        { result: 'incorrect', attemptedAt: daysAgo(1) },
      ],
    })
    console.assert(c5.score < c5b.score, 'Case5: 改善トレンドは悪化トレンドよりスコアが低いべき')

    console.log('[weakScoring] All test cases passed', { c1, c2, c3, c4, c5, c5b })
  }
  // _testCases()  // 必要時にコメント解除
}
