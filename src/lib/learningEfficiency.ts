// =============================================
// src/lib/learningEfficiency.ts
// 学習効率スコアエンジン
//
// 参考文献:
//   - Baddeley (1992) "Working memory" — 認知負荷と学習効率
//   - Pashler et al. (2007) "Organizing Instruction and Study to Improve
//     Student Learning" — 間隔・量と質のトレードオフ
//   - 変動係数 (CV) による回答速度の安定性評価:
//     CV = 標準偏差 / 平均  （低いほど安定した集中状態）
// =============================================

import type {
  EfficiencySessionInput,
  LearningEfficiencyScore,
  PomodoroSessionRecord,
} from '../types/learning'

// -----------------------------------------------
// 定数・基準値
// -----------------------------------------------

/** 1時間あたりの問題消化数の基準（この値で throughputScore が最大）*/
const THROUGHPUT_REFERENCE = 20  // 問/時間

/** 変動係数の上限（これ以上は「不安定」と判定）*/
const CV_UPPER_BOUND = 0.8

/** ポモドーロ完了率の計算ウィンドウ（日数）*/
const POMODORO_WINDOW_DAYS = 7

/** グレード閾値 */
const GRADE_THRESHOLDS = { S: 85, A: 70, B: 55, C: 40 } as const

// -----------------------------------------------
// 統計ユーティリティ
// -----------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * 変動係数 (Coefficient of Variation)
 * CV = stdDev / mean (低いほど安定、0〜1以上)
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  if (m === 0) return 0
  return stdDev(values) / m
}

// -----------------------------------------------
// サブスコア計算
// -----------------------------------------------

/**
 * 集中度スコア (0〜40)
 *
 * focusScore = ポモドーロ完了率スコア (0〜20) + 回答速度安定性スコア (0〜20)
 *
 * ポモドーロ完了率: completedSets / expectedSets（1セッション25分として）
 * 速度安定性: CV が低いほど高スコア
 */
function calcFocusScore(
  session: EfficiencySessionInput,
  pomodoroSets: number,          // セッション中のポモドーロ完了数（外部から渡す）
  expectedSets: number,          // セッション想定セット数（duration / 25min）
): number {
  // ポモドーロ完了率スコア (0〜20)
  const pomodoroRatio = expectedSets > 0
    ? Math.min(1, pomodoroSets / expectedSets)
    : 0.5  // ポモドーロ未使用の場合は中程度
  const pomodoroScore = pomodoroRatio * 20

  // 回答速度安定性スコア (0〜20)
  let stabilityScore = 10 // デフォルト（タイミングデータなしの場合）
  if (session.answerTimings && session.answerTimings.length >= 3) {
    const cv = coefficientOfVariation(session.answerTimings)
    // CV が 0 → 20点、CV が CV_UPPER_BOUND 以上 → 0点
    stabilityScore = Math.max(0, (1 - cv / CV_UPPER_BOUND)) * 20
  }

  return Math.min(40, pomodoroScore + stabilityScore)
}

/**
 * 消化効率スコア (0〜30)
 *
 * throughputScore = min(1, questionsPerHour / THROUGHPUT_REFERENCE) × 30
 * ただし極端に速い（品質低下の恐れ）場合はペナルティ
 */
function calcThroughputScore(session: EfficiencySessionInput): {
  score: number
  questionsPerHour: number
} {
  if (session.durationSeconds <= 0) return { score: 0, questionsPerHour: 0 }

  const hours = session.durationSeconds / 3600
  const questionsPerHour = session.totalQuestions / hours

  // 極端に速い場合のペナルティ（2倍以上の速度で精度も落ちているならペナルティ）
  const accuracy = session.totalQuestions > 0
    ? session.correctCount / session.totalQuestions
    : 0
  const tooFast = questionsPerHour > THROUGHPUT_REFERENCE * 2 && accuracy < 0.6

  const ratio = Math.min(1, questionsPerHour / THROUGHPUT_REFERENCE)
  const rawScore = ratio * 30

  return {
    score: Math.round(tooFast ? rawScore * 0.7 : rawScore),
    questionsPerHour: Math.round(questionsPerHour * 10) / 10,
  }
}

/**
 * 正答率スコア (0〜30)
 *
 * 単純な正答率に加え、セッション後半の正答率変化も考慮
 * （後半で下がっている = 疲労・集中力低下のサイン）
 */
function calcAccuracyScore(session: EfficiencySessionInput): {
  score: number
  sessionAccuracy: number
} {
  if (session.totalQuestions === 0) return { score: 0, sessionAccuracy: 0 }

  const accuracy = session.correctCount / session.totalQuestions
  const baseScore = accuracy * 25  // 0〜25

  // 後半疲労ペナルティ（タイミングデータがある場合のみ）
  let fatigueBonus = 5 // デフォルトで5点ボーナス
  if (session.answerTimings && session.answerTimings.length >= 6) {
    const timings = session.answerTimings
    const mid = Math.floor(timings.length / 2)
    const firstHalfMean = mean(timings.slice(0, mid))
    const secondHalfMean = mean(timings.slice(mid))

    // 後半が大幅に遅くなっている場合（疲労）はボーナスなし
    const slowdownRatio = secondHalfMean / Math.max(1, firstHalfMean)
    if (slowdownRatio > 1.5) {
      fatigueBonus = 0 // 後半50%以上遅くなった = 疲労ペナルティ
    } else if (slowdownRatio > 1.2) {
      fatigueBonus = 2
    }
  }

  return {
    score: Math.min(30, Math.round(baseScore + fatigueBonus)),
    sessionAccuracy: Math.round(accuracy * 1000) / 1000,
  }
}

// -----------------------------------------------
// グレード判定
// -----------------------------------------------

function calcGrade(score: number): LearningEfficiencyScore['grade'] {
  if (score >= GRADE_THRESHOLDS.S) return 'S'
  if (score >= GRADE_THRESHOLDS.A) return 'A'
  if (score >= GRADE_THRESHOLDS.B) return 'B'
  if (score >= GRADE_THRESHOLDS.C) return 'C'
  return 'D'
}

// -----------------------------------------------
// メイン関数
// -----------------------------------------------

/**
 * 学習効率スコアを算出する
 *
 * @param session クイズセッション情報
 * @param pomodoroSets セッション中の完了ポモドーロ数（0 なら未使用）
 * @returns LearningEfficiencyScore
 */
export function calcLearningEfficiency(
  session: EfficiencySessionInput,
  pomodoroSets: number = 0
): LearningEfficiencyScore {
  // セッション想定ポモドーロ数（25分/セット）
  const expectedSets = Math.floor(session.durationSeconds / (25 * 60))

  const focusScore    = Math.round(calcFocusScore(session, pomodoroSets, expectedSets))
  const { score: throughputScore, questionsPerHour } = calcThroughputScore(session)
  const { score: accuracyScore, sessionAccuracy }    = calcAccuracyScore(session)

  // 変動係数（速度安定性の数値）
  const answerTimeCV = session.answerTimings && session.answerTimings.length >= 2
    ? Math.round(coefficientOfVariation(session.answerTimings) * 100) / 100
    : 0

  const overallScore = Math.min(100, focusScore + throughputScore + accuracyScore)

  return {
    overallScore: Math.round(overallScore),
    components: {
      focusScore:      Math.round(focusScore),
      throughputScore: Math.round(throughputScore),
      accuracyScore:   Math.round(accuracyScore),
    },
    questionsPerHour,
    answerTimeCV,
    sessionAccuracy,
    grade: calcGrade(overallScore),
  }
}

// -----------------------------------------------
// ポモドーロ効率集計
// -----------------------------------------------

/**
 * 直近 N 日間のポモドーロ完了率を返す
 * @param sessions PomodoroSessionRecord[]
 * @param windowDays 集計ウィンドウ（日数）
 * @param currentDate 現在日時
 */
export function calcPomodoroCompletionRate(
  sessions: PomodoroSessionRecord[],
  windowDays: number = POMODORO_WINDOW_DAYS,
  currentDate: Date = new Date()
): number {
  const cutoff = new Date(currentDate.getTime() - windowDays * 86400000)
  const recent = sessions.filter(s => new Date(s.date) >= cutoff)

  if (recent.length === 0) return 0

  const totalActual   = recent.reduce((s, r) => s + r.completedFocusSets, 0)
  const totalExpected = recent.reduce((s, r) => s + Math.floor(r.totalMinutes / 25), 0)

  if (totalExpected === 0) return 0
  return Math.min(1, Math.round((totalActual / totalExpected) * 1000) / 1000)
}

/**
 * 複数セッションの効率スコアを集計して時系列データを返す（グラフ用）
 */
export function calcEfficiencyTimeSeries(
  sessions: (EfficiencySessionInput & { date: string; pomodoroSets?: number })[]
): { date: string; score: number; grade: LearningEfficiencyScore['grade'] }[] {
  return sessions.map(s => {
    const eff = calcLearningEfficiency(s, s.pomodoroSets ?? 0)
    return { date: s.date, score: eff.overallScore, grade: eff.grade }
  })
}

// -----------------------------------------------
// テストケース
// -----------------------------------------------

if (import.meta.env?.DEV) {
  const _testEfficiency = () => {
    // Case 1: 高効率セッション（速度安定、正答率高、ポモドーロ使用）
    const e1 = calcLearningEfficiency(
      {
        totalQuestions: 20,
        correctCount: 18,
        durationSeconds: 50 * 60, // 50分
        answerTimings: Array.from({ length: 20 }, () => 120 + Math.random() * 20), // ほぼ120秒/問
      },
      2 // ポモドーロ2セット完了
    )
    console.assert(e1.overallScore >= 70, 'Case1: 高効率セッションはA以上', e1)

    // Case 2: 低効率セッション（不正解多い、速度バラバラ）
    const e2 = calcLearningEfficiency(
      {
        totalQuestions: 20,
        correctCount: 5,
        durationSeconds: 30 * 60,
        answerTimings: [10, 300, 5, 400, 15, 350, 8, 200, 10, 250,
                        20, 180, 12, 320, 7, 150, 30, 280, 9, 220],
      },
      0
    )
    console.assert(e2.overallScore < 60, 'Case2: 低効率セッションはB以下', e2)

    // Case 3: 空のセッション
    const e3 = calcLearningEfficiency({
      totalQuestions: 0,
      correctCount: 0,
      durationSeconds: 0,
    })
    console.assert(e3.overallScore === 0, 'Case3: 空セッションはスコア0', e3)

    // Case 4: ポモドーロ未使用でもスコア計算できる
    const e4 = calcLearningEfficiency({
      totalQuestions: 10,
      correctCount: 7,
      durationSeconds: 25 * 60,
    })
    console.assert(e4.overallScore > 0, 'Case4: ポモドーロなしでもスコア計算OK', e4)

    console.log('[learningEfficiency] All test cases passed', { e1, e2, e3, e4 })
  }
  // _testEfficiency()
}
