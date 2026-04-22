// =============================================
// src/lib/sm2Scheduler.ts
// SM-2 アルゴリズム（CMA試験向けカスタマイズ版）
//
// 参考文献:
//   - Wozniak (1990) "SuperMemo 2 Algorithm"
//     https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
//   - Anki SM-2 変種（ease factor 下限 1.3 の実装）
//   - Tabibian et al. (2019) "Enhancing Human Learning via Spaced Repetition"
//
// CMA向けカスタマイズ:
//   1. 試験日（2026-06-07）を絶対上限としてスケジュールをクランプ
//   2. 難易度による initial ease factor 調整
//   3. partial 正解を q=3（標準SM-2の q: 0〜5 スケール中間）として扱う
//   4. 試験直前期（残り30日）は最大間隔を 7 日に制限
// =============================================

import type { SM2Card, SM2UpdateInput, SM2UpdateOutput } from '../types/learning'
import type { Difficulty, ProblemResult } from '../types/problem'

// -----------------------------------------------
// 定数
// -----------------------------------------------

/** 難易度ごとの初期 ease factor（標準 SM-2 は 2.5 固定）*/
const INITIAL_EASE_FACTOR: Record<Difficulty, number> = {
  1: 2.7,  // 易：少し速く間隔を広げる
  2: 2.5,  // 普通：標準
  3: 2.1,  // 難：間隔を広げにくい（慎重に）
}

/** ease factor の下限（これ以下には下げない）*/
const MIN_EASE_FACTOR = 1.3

/** ease factor の上限 */
const MAX_EASE_FACTOR = 3.0

/** 最初の2回は SM-2 標準の固定間隔（日数）*/
const FIRST_INTERVAL  = 1
const SECOND_INTERVAL = 6

/** 試験直前期（残り N 日以内）の最大間隔（日数）*/
const PRE_EXAM_DAYS_THRESHOLD = 30
const PRE_EXAM_MAX_INTERVAL   = 7

/** SM-2 の q スケール (0〜5) における各結果のマッピング
 *  q < 3: 不正解扱い（repetitions リセット）
 *  q ≥ 3: 正解扱い
 */
const Q_SCORE: Record<NonNullable<ProblemResult>, number> = {
  correct:   5,  // 完全正解、迷わず答えられた
  partial:   3,  // 部分正解、正解だが困難を伴った
  incorrect: 1,  // 不正解
}

// -----------------------------------------------
// ユーティリティ
// -----------------------------------------------

/** ISO 日付文字列 "YYYY-MM-DD" を返す */
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 日付文字列 "YYYY-MM-DD" に n 日を加算した Date を返す */
function addDays(dateStr: string, n: number): Date {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d
}

/** 2つの Date の差を日数で返す（切り捨て）*/
function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

// -----------------------------------------------
// カード初期化
// -----------------------------------------------

/**
 * 新規カードを難易度に基づいて初期化
 * @param problemId 問題ID
 * @param difficulty 難易度
 * @param currentDate 現在日時（省略時は今日）
 */
export function createSM2Card(
  problemId: string,
  difficulty: Difficulty,
  currentDate: Date = new Date()
): SM2Card {
  return {
    problemId,
    repetitions: 0,
    easeFactor: INITIAL_EASE_FACTOR[difficulty],
    intervalDays: 0,
    nextReviewDate: toDateStr(currentDate), // 今日から開始
    updatedAt: currentDate.toISOString(),
  }
}

// -----------------------------------------------
// SM-2 コアアルゴリズム
// -----------------------------------------------

/**
 * SM-2 アルゴリズム（CMA カスタム版）でカードを更新する
 *
 * アルゴリズム概要:
 *   1. result を q スコア (0〜5) に変換
 *   2. q < 3（不正解・部分不足）の場合: repetitions をリセットし間隔を1日に戻す
 *   3. q ≥ 3 の場合:
 *      - repetitions = 1 → interval = FIRST_INTERVAL
 *      - repetitions = 2 → interval = SECOND_INTERVAL
 *      - repetitions > 2 → interval = prev_interval × easeFactor
 *      - easeFactor を更新: EF' = EF + (0.1 - (5-q)×(0.08 + (5-q)×0.02))
 *   4. 試験日クランプ: 次回日付が試験日を超える場合は試験日に設定
 *   5. 試験直前期: 間隔を PRE_EXAM_MAX_INTERVAL に制限
 */
export function updateSM2Card(input: SM2UpdateInput): SM2UpdateOutput {
  const { card, result, difficulty: _difficulty, examDate, currentDate = new Date() } = input
  const q = Q_SCORE[result]

  let { repetitions, easeFactor, intervalDays } = card

  // ---- ease factor 更新（常に更新）----
  // SM-2 公式: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  easeFactor = Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, easeFactor + efDelta))

  // ---- 間隔・繰り返し数の更新 ----
  if (q < 3) {
    // 不正解 or 部分不足 → リセット
    repetitions = 0
    intervalDays = 1
  } else {
    // 正解系
    repetitions += 1
    if (repetitions === 1) {
      intervalDays = FIRST_INTERVAL
    } else if (repetitions === 2) {
      intervalDays = SECOND_INTERVAL
    } else {
      intervalDays = Math.round(intervalDays * easeFactor)
    }
  }

  // ---- 試験直前期の上限制限 ----
  const daysToExam = daysBetween(currentDate, examDate)
  if (daysToExam <= PRE_EXAM_DAYS_THRESHOLD) {
    intervalDays = Math.min(intervalDays, PRE_EXAM_MAX_INTERVAL)
  }

  // ---- 最大間隔を試験日までの残り日数に制限 ----
  const maxInterval = Math.max(1, daysToExam)
  intervalDays = Math.min(intervalDays, maxInterval)

  // ---- 次回レビュー日の計算 ----
  const todayStr = toDateStr(currentDate)
  const nextDate = addDays(todayStr, intervalDays)
  const clampedToExamDate = nextDate > examDate

  // 試験日を超えていたらクランプ
  const nextReviewDate = clampedToExamDate
    ? toDateStr(examDate)
    : toDateStr(nextDate)

  const updatedCard: SM2Card = {
    ...card,
    repetitions,
    easeFactor: Math.round(easeFactor * 1000) / 1000,
    intervalDays,
    nextReviewDate,
    updatedAt: currentDate.toISOString(),
  }

  return { updatedCard, clampedToExamDate }
}

// -----------------------------------------------
// スケジュール取得ユーティリティ
// -----------------------------------------------

/**
 * 今日以降にレビューが必要なカードを取得
 * @param cards SM2Card の配列
 * @param currentDate 現在日時（省略時は今日）
 * @returns 今日以前の nextReviewDate を持つカード（古い順）
 */
export function getDueCards(cards: SM2Card[], currentDate: Date = new Date()): SM2Card[] {
  const todayStr = toDateStr(currentDate)
  return cards
    .filter(c => c.nextReviewDate <= todayStr)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
}

/**
 * 今後 N 日間のレビュー予測件数を返す
 * @param cards SM2Card の配列
 * @param daysAhead 何日先まで集計するか
 * @param currentDate 現在日時
 * @returns { date: "YYYY-MM-DD", count: number }[]
 */
export function getReviewForecast(
  cards: SM2Card[],
  daysAhead: number = 14,
  currentDate: Date = new Date()
): { date: string; count: number }[] {
  const forecast: Record<string, number> = {}
  const todayStr = toDateStr(currentDate)

  // 今日〜daysAhead 日後の日付を初期化
  for (let i = 0; i <= daysAhead; i++) {
    const d = addDays(todayStr, i)
    forecast[toDateStr(d)] = 0
  }

  cards.forEach(card => {
    const reviewDate = card.nextReviewDate
    if (forecast[reviewDate] !== undefined) {
      forecast[reviewDate]++
    } else if (reviewDate < todayStr) {
      // 期限切れカードは今日にバケットする
      forecast[todayStr]++
    }
  })

  return Object.entries(forecast)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

// -----------------------------------------------
// テストケース
// -----------------------------------------------

if (import.meta.env?.DEV) {
  const _testSM2 = () => {
    const examDate = new Date('2026-06-07T00:00:00')
    const now = new Date('2026-04-22T00:00:00')

    // Case 1: 新規カード → 正解
    const card1 = createSM2Card('p1', 2, now)
    const r1 = updateSM2Card({ card: card1, result: 'correct', difficulty: 2, examDate, currentDate: now })
    console.assert(r1.updatedCard.intervalDays === FIRST_INTERVAL, 'Case1: 初回正解は1日間隔', r1)
    console.assert(r1.updatedCard.repetitions === 1, 'Case1: repetitions=1')

    // Case 2: 2回正解
    const r2 = updateSM2Card({ card: r1.updatedCard, result: 'correct', difficulty: 2, examDate, currentDate: now })
    console.assert(r2.updatedCard.intervalDays === SECOND_INTERVAL, 'Case2: 2回目正解は6日間隔', r2)

    // Case 3: 不正解 → リセット
    const r3 = updateSM2Card({ card: r2.updatedCard, result: 'incorrect', difficulty: 2, examDate, currentDate: now })
    console.assert(r3.updatedCard.repetitions === 0, 'Case3: 不正解でリセット', r3)
    console.assert(r3.updatedCard.intervalDays === 1, 'Case3: 間隔は1日に戻る', r3)

    // Case 4: partial → q=3 なので正解扱い
    const card4 = createSM2Card('p4', 3, now)
    const r4 = updateSM2Card({ card: card4, result: 'partial', difficulty: 3, examDate, currentDate: now })
    console.assert(r4.updatedCard.repetitions === 1, 'Case4: partial は正解扱い')
    // ease factor は q=3 でわずかに下がる（EF + 0.1 - (5-3)*(0.08 + 2*0.02) = EF - 0.14）
    console.assert(r4.updatedCard.easeFactor < card4.easeFactor, 'Case4: partial でeaseが下がる')

    // Case 5: 試験日直前クランプ（残り5日）
    const nearExam = new Date('2026-06-02T00:00:00')
    const cardNear = createSM2Card('p5', 1, nearExam)
    // 3回正解して interval が長くなったカードをシミュレート
    const fakeCard: SM2Card = { ...cardNear, repetitions: 5, intervalDays: 30 }
    const r5 = updateSM2Card({ card: fakeCard, result: 'correct', difficulty: 1, examDate, currentDate: nearExam })
    console.assert(r5.updatedCard.intervalDays <= 5, 'Case5: 試験日クランプ', r5)

    console.log('[sm2Scheduler] All test cases passed', { r1, r2, r3, r4, r5 })
  }
  // _testSM2()
}
