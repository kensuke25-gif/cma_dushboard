// =============================================
// src/types/analytics.ts
// 弱点克服・学習分析機能 型定義
// =============================================

import type { SubjectKey } from './problem'

// -----------------------------------------------
// SM-2 アルゴリズム
// -----------------------------------------------

/** SM-2 回答品質スコア */
export type SM2Quality = 1 | 3 | 5
// 1 = 不正解(incorrect) / 3 = 部分正解(partial) / 5 = 正解(correct)

/** ProblemResult → SM2Quality のマッピング */
export const RESULT_TO_QUALITY: Record<'correct' | 'partial' | 'incorrect', SM2Quality> = {
  correct:   5,
  partial:   3,
  incorrect: 1,
}

/**
 * SM-2 次回スケジュール計算（純粋関数・副作用なし）
 *
 * @param current  現在の SRS 状態
 * @param quality  回答品質 (1/3/5)
 * @returns        更新後の SRS フィールド（userId / problemId は変更なし）
 */
export function calculateSM2(
  current: Pick<SRSState, 'easeFactor' | 'repetitions' | 'intervalDays'>,
  quality: SM2Quality,
): Pick<SRSState, 'easeFactor' | 'repetitions' | 'intervalDays' | 'nextReviewDate' | 'lastReviewedAt'> {
  let { easeFactor, repetitions, intervalDays } = current

  // ease_factor 更新（SM-2 公式）
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  )

  if (quality >= 3) {
    // 正解 or 部分正解 → 間隔を延ばす
    if (repetitions === 0)      intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else                        intervalDays = Math.round(intervalDays * easeFactor)
    repetitions += 1
  } else {
    // 不正解 → リセット
    repetitions  = 0
    intervalDays = 1
  }

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)

  return {
    easeFactor:     Math.round(easeFactor * 100) / 100,
    repetitions,
    intervalDays,
    nextReviewDate: nextReviewDate.toISOString().slice(0, 10),
    lastReviewedAt: new Date().toISOString(),
  }
}

// -----------------------------------------------
// SRS 状態型
// -----------------------------------------------

/** problem_srs / quiz_srs テーブルの共通構造 */
export type SRSState = {
  userId:         string
  problemId:      string  // quiz_srs では question_id として使用
  easeFactor:     number  // 1.3 〜（初期値 2.5）
  repetitions:    number  // 連続正解数（不正解でリセット）
  intervalDays:   number  // 次回復習までの日数
  nextReviewDate: string  // 'YYYY-MM-DD'
  lastReviewedAt: string | null
}

// -----------------------------------------------
// 弱点スコアリング
// -----------------------------------------------

/** weakness_snapshots テーブル 1 行 */
export type WeaknessSnapshot = {
  id:             string
  userId:         string
  snapshotDate:   string  // 'YYYY-MM-DD'
  granularity:    'problem' | 'chapter' | 'subject'
  aggregateKey:   string
  subject:        SubjectKey
  weaknessScore:  number  // 0-100
  attemptCount:   number
  correctCount:   number
  incorrectCount: number
  partialCount:   number
  avgTimeSec:     number | null
  createdAt:      string
}

/**
 * 弱点スコア計算（純粋関数）
 *
 * 計算式:
 *   base_score        = (incorrect*2 + partial*1) / attempt_count
 *   recency_weight    = exp(-0.1 * days_since_last)   ← 時間経過で減衰
 *   difficulty_factor = 1.0 + (difficulty-2) * 0.15   ← 難問ほど高く
 *   correction        = correct_ratio > 0.7 ? 0.5 : 1.0
 *   score             = min(100, base * recency * difficulty * correction * 100)
 */
export function calculateWeaknessScore(params: {
  attemptCount:         number
  correctCount:         number
  partialCount:         number
  incorrectCount:       number
  daysSinceLastAttempt: number
  difficulty:           1 | 2 | 3
}): number {
  const { attemptCount, correctCount, partialCount, incorrectCount,
          daysSinceLastAttempt, difficulty } = params
  if (attemptCount === 0) return 0

  const baseScore       = (incorrectCount * 2.0 + partialCount * 1.0) / attemptCount
  const recencyWeight   = Math.exp(-0.1 * daysSinceLastAttempt)
  const difficultyFactor = 1.0 + (difficulty - 2) * 0.15
  const correctRatio    = correctCount / attemptCount
  const correction      = correctRatio > 0.7 ? 0.5 : 1.0

  return Math.min(100, Math.round(baseScore * recencyWeight * difficultyFactor * correction * 100 * 10) / 10)
}

/** 弱点深刻度ランキング 1 件 */
export type WeaknessRankingItem = {
  aggregateKey:  string
  subject:       SubjectKey
  granularity:   'problem' | 'chapter' | 'subject'
  weaknessScore: number
  attemptCount:  number
  correctCount:  number
  chapterName?:  string
  questionNo?:   string
  difficulty?:   1 | 2 | 3
  snapshotDate:  string
}

// -----------------------------------------------
// 学習セッション
// -----------------------------------------------

/** study_sessions テーブル 1 行 */
export type StudySession = {
  id:               string
  userId:           string
  startedAt:        string
  endedAt:          string
  sourceType:       'pomodoro' | 'manual'
  timerMinutes:     number | null
  overtimeSeconds:  number
  actualMinutes:    number
  studyRecordUuid:  string | null  // study_records.uuid_id への FK
  subject:          string | null
  focusScore:       number | null
  wasCompleted:     boolean
  problemsAttempted: number
  problemsCorrect:  number
  pomodoroSetNo:    number | null
  createdAt:        string
}

/** ポモドーロ完了時に INSERT するパラメータ */
export type InsertStudySessionParams = Omit<StudySession, 'id' | 'userId' | 'createdAt'>

// -----------------------------------------------
// ペース予測
// -----------------------------------------------

/** pace_predictions テーブル 1 行 */
export type PacePrediction = {
  userId:                  string
  calculatedAt:            string
  totalStudiedHours:       number
  remainingHoursNeeded:    number
  currentDailyAvgMin:      number
  projectedCompletionDate: string | null  // null = 間に合う or 目標達成済み
  isOnTrack:               boolean
  daysUntilExam:           number | null
  subjectRemainingHours:   Record<SubjectKey, number>
  subjectAccuracyPct:      Record<SubjectKey, number>
  topWeakProblemIds:       string[]
  recommendedDailyMin:     number | null
}

/**
 * ペース予測計算（純粋関数）
 *
 * @param totalStudiedMin    累計学習分数
 * @param examTotalHours     目標総学習時間（時間）
 * @param examDate           試験日 'YYYY-MM-DD'
 * @param recentDailyAvgMin  過去14日間の1日平均学習分数
 * @param today              基準日（テスト用。省略時は現在日）
 */
export function calculatePacePrediction(
  totalStudiedMin:    number,
  examTotalHours:     number,
  examDate:           string,
  recentDailyAvgMin:  number,
  today:              Date = new Date(),
): Pick<PacePrediction,
  'totalStudiedHours' | 'remainingHoursNeeded' | 'currentDailyAvgMin'
  | 'projectedCompletionDate' | 'isOnTrack' | 'daysUntilExam'
  | 'recommendedDailyMin'
> {
  const examMs        = new Date(examDate).getTime()
  const todayMs       = today.getTime()
  const daysUntilExam = Math.max(0, Math.ceil((examMs - todayMs) / 86_400_000))

  const totalStudiedHours    = totalStudiedMin / 60
  const remainingHoursNeeded = Math.max(0, examTotalHours - totalStudiedHours)

  const recommendedDailyMin = daysUntilExam > 0
    ? Math.ceil((remainingHoursNeeded * 60) / daysUntilExam)
    : null

  let projectedCompletionDate: string | null = null
  let isOnTrack = false

  if (remainingHoursNeeded <= 0) {
    isOnTrack = true
  } else if (recentDailyAvgMin > 0) {
    const daysNeeded = Math.ceil((remainingHoursNeeded * 60) / recentDailyAvgMin)
    const projected  = new Date(today)
    projected.setDate(today.getDate() + daysNeeded)
    projectedCompletionDate = projected.toISOString().slice(0, 10)
    isOnTrack = projectedCompletionDate <= examDate
  }

  return {
    totalStudiedHours:       Math.round(totalStudiedHours * 100) / 100,
    remainingHoursNeeded:    Math.round(remainingHoursNeeded * 100) / 100,
    currentDailyAvgMin:      Math.round(recentDailyAvgMin * 100) / 100,
    projectedCompletionDate,
    isOnTrack,
    daysUntilExam:           daysUntilExam > 0 ? daysUntilExam : null,
    recommendedDailyMin,
  }
}

// -----------------------------------------------
// AI レコメンデーション
// -----------------------------------------------

export type RecommendationActionType =
  | 'review_srs'
  | 'review_weak'
  | 'study_subject'
  | 'take_quiz'
  | 'set_goal'
  | 'rest'

export type UserAction = 'followed' | 'dismissed' | 'snoozed'

/** ai_recommendations テーブル 1 行 */
export type AIRecommendation = {
  id:            string
  userId:        string
  recommendedAt: string
  actionType:    RecommendationActionType
  subject:       SubjectKey | null
  targetIds:     string[]
  reasonText:    string
  priority:      1 | 2 | 3
  wasShown:      boolean
  shownAt:       string | null
  userAction:    UserAction | null
  actedAt:       string | null
  expiresAt:     string | null
  createdAt:     string
}

/** 新規レコメンデーション生成パラメータ */
export type CreateRecommendationParams = Pick<
  AIRecommendation,
  'actionType' | 'subject' | 'targetIds' | 'reasonText' | 'priority' | 'expiresAt'
>

// -----------------------------------------------
// 拡張ビュー型
// -----------------------------------------------

/** problem_full_stats VIEW 1 行 */
export type ProblemFullStats = {
  userId:              string
  problemId:           string
  latestResult:        'correct' | 'partial' | 'incorrect'
  attemptCount:        number
  correctCount:        number
  partialCount:        number
  incorrectCount:      number
  lastAttemptedAt:     string
  avgTimeSec:          number | null
  // SRS フィールド（null = SRS 未登録）
  srsNextReviewDate:   string | null   // 'YYYY-MM-DD'
  srsEaseFactor:       number | null
  srsRepetitions:      number | null
  srsIntervalDays:     number | null
  isDueToday:          boolean
  latestWeaknessScore: number | null   // 0-100
}

/** subject_weakness_ranking VIEW 1 行 */
export type SubjectWeaknessRankingRow = {
  userId:        string
  subject:       SubjectKey
  granularity:   'problem' | 'chapter' | 'subject'
  aggregateKey:  string
  weaknessScore: number
  attemptCount:  number
  correctCount:  number
  incorrectCount: number
  snapshotDate:  string
  // problems テーブル結合フィールド（granularity='problem' 時のみ）
  chapterName:   string | null
  sectionName:   string | null
  questionNo:    string | null
  difficulty:    1 | 2 | 3 | null
}
