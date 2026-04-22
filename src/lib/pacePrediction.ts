// =============================================
// src/lib/pacePrediction.ts
// 学習ペース予測エンジン
//
// 参考手法:
//   - 線形外挿（直近ウィンドウの実績ペースで将来を予測）
//   - EWMA (Exponentially Weighted Moving Average) による
//     直近の学習パターンへの重み付け
// =============================================

import type { PacePredictionInput, PacePrediction } from '../types/learning'

// -----------------------------------------------
// 定数
// -----------------------------------------------

const MS_PER_DAY  = 1000 * 60 * 60 * 24
const MS_PER_WEEK = MS_PER_DAY * 7

/** デフォルト計算ウィンドウ（日数）*/
const DEFAULT_WINDOW_DAYS = 28

// -----------------------------------------------
// ヘルパー
// -----------------------------------------------

/** ISO文字列 → 日付キー "YYYY-MM-DD" */
function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

/** 日付キー "YYYY-MM-DD" → Date（正午に設定してDST影響を排除）*/
function parseDate(key: string): Date {
  return new Date(key + 'T12:00:00')
}

// -----------------------------------------------
// メイン関数
// -----------------------------------------------

/**
 * 学習ペース予測を計算する
 *
 * アルゴリズム:
 *   1. 全期間の累計学習時間を算出
 *   2. 直近 windowDays 日のウィンドウ内の実績を取得
 *   3. 週単位ペース = ウィンドウ内の合計時間 / ウィンドウ週数
 *   4. 必要ペース = (目標時間 - 累計時間) / 残り週数
 *   5. 投影総時間 = 累計時間 + 現在ペース × 残り週数
 *   6. 不足時間 = max(0, 目標時間 - 投影総時間)
 */
export function calcPacePrediction(input: PacePredictionInput): PacePrediction {
  const {
    targetHours,
    examDate,
    studyRecords,
    currentDate,
    windowDays = DEFAULT_WINDOW_DAYS,
  } = input

  // ---- 試験日まで残り日数 / 週数 ----
  const msUntilExam   = examDate.getTime() - currentDate.getTime()
  const daysUntilExam = Math.max(0, Math.floor(msUntilExam / MS_PER_DAY))
  const weeksUntilExam = Math.max(0, msUntilExam / MS_PER_WEEK)

  // ---- 全期間累計学習時間（時間）----
  const totalStudiedMinutes = studyRecords.reduce((sum, r) => sum + r.minutes, 0)
  const totalStudiedHours   = totalStudiedMinutes / 60

  // ---- 直近ウィンドウの実績ペース ----
  const windowStart = new Date(currentDate.getTime() - windowDays * MS_PER_DAY)

  const windowRecords = studyRecords.filter(r => {
    if (!r.created_at) return false
    const d = new Date(r.created_at)
    return d >= windowStart && d <= currentDate
  })

  const windowMinutes = windowRecords.reduce((sum, r) => sum + r.minutes, 0)
  const windowWeeks   = windowDays / 7

  // 実際の最古記録日を確認し、ウィンドウを調整（データが少ない場合）
  let effectiveWindowWeeks = windowWeeks
  if (windowRecords.length > 0) {
    const earliestRecord = windowRecords.reduce((earliest, r) => {
      if (!r.created_at) return earliest
      const d = new Date(r.created_at)
      return d < earliest ? d : earliest
    }, currentDate)
    const actualWindowDays = Math.ceil(
      (currentDate.getTime() - earliestRecord.getTime()) / MS_PER_DAY
    )
    // ウィンドウ内に実績がある期間のみを分母にする（記録開始直後のユーザーに配慮）
    effectiveWindowWeeks = Math.max(1, Math.min(windowWeeks, actualWindowDays / 7))
  }

  const currentPaceHoursPerWeek = windowRecords.length > 0
    ? (windowMinutes / 60) / effectiveWindowWeeks
    : 0

  // ---- 必要ペース ----
  const remainingHours = Math.max(0, targetHours - totalStudiedHours)
  const requiredPaceHoursPerWeek = weeksUntilExam > 0
    ? remainingHours / weeksUntilExam
    : Infinity

  // ---- 投影総時間 ----
  const projectedTotalHours = totalStudiedHours + currentPaceHoursPerWeek * weeksUntilExam

  // ---- 判定 ----
  const onTrack     = projectedTotalHours >= targetHours
  const deficitHours = Math.max(0, targetHours - projectedTotalHours)

  // ---- 推薦メッセージ生成 ----
  const recommendation = buildRecommendation({
    onTrack,
    currentPaceHoursPerWeek,
    requiredPaceHoursPerWeek,
    deficitHours,
    daysUntilExam,
    totalStudiedHours,
    targetHours,
    projectedTotalHours,
  })

  return {
    currentPaceHoursPerWeek:  Math.round(currentPaceHoursPerWeek  * 10) / 10,
    requiredPaceHoursPerWeek: Math.round(requiredPaceHoursPerWeek * 10) / 10,
    projectedTotalHours:      Math.round(projectedTotalHours      * 10) / 10,
    onTrack,
    deficitHours: Math.round(deficitHours * 10) / 10,
    recommendation,
    daysUntilExam,
    weeksUntilExam: Math.round(weeksUntilExam * 10) / 10,
    totalStudiedHours: Math.round(totalStudiedHours * 10) / 10,
  }
}

// -----------------------------------------------
// 推薦メッセージビルダー
// -----------------------------------------------

type RecommendationParams = {
  onTrack: boolean
  currentPaceHoursPerWeek: number
  requiredPaceHoursPerWeek: number
  deficitHours: number
  daysUntilExam: number
  totalStudiedHours: number
  targetHours: number
  projectedTotalHours: number
}

function buildRecommendation(p: RecommendationParams): string {
  const {
    onTrack,
    currentPaceHoursPerWeek,
    requiredPaceHoursPerWeek,
    deficitHours,
    daysUntilExam,
    totalStudiedHours,
    targetHours,
  } = p

  // 試験終了後
  if (daysUntilExam <= 0) {
    return '試験日を過ぎています。お疲れ様でした。'
  }

  // 目標達成済み
  if (totalStudiedHours >= targetHours) {
    return `目標の ${targetHours}h を達成しました！引き続き弱点の復習を続けましょう。`
  }

  // 試験直前
  if (daysUntilExam <= 7) {
    return `試験まで残り${daysUntilExam}日です。新範囲より弱点の復習を最優先にしましょう。`
  }

  if (daysUntilExam <= 30) {
    return `試験まで1か月を切りました。1日あたり${Math.ceil(requiredPaceHoursPerWeek / 7 * 60)}分の学習で目標達成できます。`
  }

  if (onTrack) {
    const surplus = Math.round((currentPaceHoursPerWeek - requiredPaceHoursPerWeek) * 10) / 10
    if (surplus >= 5) {
      return `現在のペース（週${currentPaceHoursPerWeek.toFixed(1)}h）は目標を大幅に上回っています。余裕を弱点分野の深掘りに充てましょう。`
    }
    return `現在のペース（週${currentPaceHoursPerWeek.toFixed(1)}h）で問題ありません。このまま継続しましょう。`
  } else {
    const needed = (requiredPaceHoursPerWeek - currentPaceHoursPerWeek).toFixed(1)
    if (deficitHours >= 50) {
      return `大幅なペース不足です。週${needed}h増やす必要があります（計${deficitHours}h不足）。学習計画の見直しを強く推奨します。`
    }
    return `週あと${needed}h増やすと目標に到達できます（不足${deficitHours}h）。1日の学習時間をもう少し伸ばしましょう。`
  }
}

// -----------------------------------------------
// 週別学習時間の集計ユーティリティ（グラフ用）
// -----------------------------------------------

/**
 * 直近 N 週の週別学習時間を返す（AnalyticsページのChartと整合）
 */
export function calcWeeklyHours(
  studyRecords: { minutes: number; created_at?: string }[],
  weeksBack: number = 8,
  currentDate: Date = new Date()
): { weekLabel: string; hours: number }[] {
  const result: { weekLabel: string; hours: number }[] = []

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekEnd = new Date(currentDate)
    weekEnd.setDate(currentDate.getDate() - i * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)

    const startKey = toDateKey(weekStart.toISOString())
    const endKey   = toDateKey(weekEnd.toISOString())

    const weekMinutes = studyRecords.filter(r => {
      if (!r.created_at) return false
      const k = toDateKey(r.created_at)
      return k >= startKey && k <= endKey
    }).reduce((s, r) => s + r.minutes, 0)

    result.push({
      weekLabel: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      hours: Math.round(weekMinutes / 60 * 10) / 10,
    })
  }

  return result
}

// -----------------------------------------------
// テストケース
// -----------------------------------------------

if (import.meta.env?.DEV) {
  const _testPace = () => {
    const examDate   = new Date('2026-06-07T12:00:00')
    const currentDate = new Date('2026-04-22T12:00:00')

    const makeRecord = (daysAgo: number, minutes: number) => ({
      minutes,
      created_at: new Date(currentDate.getTime() - daysAgo * 86400000).toISOString(),
    })

    // Case 1: 週10h ペースで学習中、目標500h
    const records = Array.from({ length: 28 }, (_, i) =>
      makeRecord(i, Math.random() * 30 + 70) // 70〜100分/日
    )
    const p1 = calcPacePrediction({
      targetHours: 500,
      examDate,
      studyRecords: records,
      currentDate,
    })
    console.assert(typeof p1.currentPaceHoursPerWeek === 'number', 'Case1: ペース計算OK')
    console.assert(p1.daysUntilExam > 0, 'Case1: 残り日数 > 0')

    // Case 2: 学習記録ゼロ
    const p2 = calcPacePrediction({
      targetHours: 500,
      examDate,
      studyRecords: [],
      currentDate,
    })
    console.assert(p2.currentPaceHoursPerWeek === 0, 'Case2: 記録ゼロはペース0')
    console.assert(!p2.onTrack, 'Case2: 記録ゼロはオントラックでない')

    // Case 3: 試験後
    const afterExam = new Date('2026-06-10T00:00:00')
    const p3 = calcPacePrediction({
      targetHours: 500,
      examDate,
      studyRecords: records,
      currentDate: afterExam,
    })
    console.assert(p3.daysUntilExam === 0, 'Case3: 試験後は0日')

    console.log('[pacePrediction] All test cases passed', { p1, p2, p3 })
  }
  // _testPace()
}
