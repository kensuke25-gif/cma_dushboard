// =============================================
// src/types/learning.ts
// 弱点検出・学習最適化アルゴリズム 共通型定義
// =============================================

import type { SubjectKey, ProblemResult, Difficulty } from './problem'

// -----------------------------------------------
// 弱点スコアリング
// -----------------------------------------------

/** 問題1件ぶんの回答履歴（アルゴリズム入力用）*/
export type AttemptRecord = {
  result: NonNullable<ProblemResult>
  attemptedAt: string   // ISO 8601
  timeSpentSec?: number
}

/** weakScore 算出に必要な問題メタ情報 */
export type WeakScoreInput = {
  problemId: string
  difficulty: Difficulty
  attempts: AttemptRecord[]
}

/** weakScore の出力 */
export type WeakScoreOutput = {
  problemId: string
  /** 弱点スコア 0（完全習得）〜 100（最高優先度の弱点）*/
  score: number
  /** 構成要素（デバッグ・UI表示用）*/
  components: {
    accuracyScore: number      // 正答率に基づく成分 (0-40)
    forgettingScore: number    // 忘却曲線に基づく成分 (0-25)
    difficultyWeight: number   // 難易度重み (0-20)
    trendPenalty: number       // 改善トレンドによる補正 (-10 〜 +15)
    sampleConfidence: number   // サンプル信頼度係数 (0-1)
  }
  recentAccuracy: number       // 直近5回の正答率 (0-1)
  overallAccuracy: number      // 全期間の正答率 (0-1)
  daysSinceLastAttempt: number
  attemptCount: number
}

// -----------------------------------------------
// SM-2 改良版スケジューリング
// -----------------------------------------------

/** SM-2 カードの永続データ（Supabase に保存）*/
export type SM2Card = {
  problemId: string
  /** 繰り返し回数（正解連続数）*/
  repetitions: number
  /** 易しさ係数 1.3〜3.0（初期値は難易度により決定）*/
  easeFactor: number
  /** 次回復習までの間隔（日数）*/
  intervalDays: number
  /** 次回復習予定日 ISO 8601 */
  nextReviewDate: string
  /** 最終更新日時 */
  updatedAt: string
}

/** SM-2 更新用の入力 */
export type SM2UpdateInput = {
  card: SM2Card
  result: NonNullable<ProblemResult>
  difficulty: Difficulty
  /** 試験日（上限スケジューリングに使用）*/
  examDate: Date
  currentDate?: Date
}

/** SM-2 更新後の出力 */
export type SM2UpdateOutput = {
  updatedCard: SM2Card
  /** 次回復習日が試験日を超えていた場合 true */
  clampedToExamDate: boolean
}

// -----------------------------------------------
// 学習ペース予測
// -----------------------------------------------

export type PacePredictionInput = {
  /** 目標総学習時間（時間）*/
  targetHours: number
  /** 試験日 */
  examDate: Date
  /** 過去の学習記録（studyStore の StudyRecord[]）*/
  studyRecords: PaceStudyRecord[]
  /** 現在日時 */
  currentDate: Date
  /** ペース計算の基準ウィンドウ（日数、デフォルト 28）*/
  windowDays?: number
}

/** ペース計算に必要な最小フィールド */
export type PaceStudyRecord = {
  minutes: number
  created_at?: string
}

export type PacePrediction = {
  /** 直近ウィンドウの実績ペース（時間/週）*/
  currentPaceHoursPerWeek: number
  /** 目標達成に必要なペース（時間/週）*/
  requiredPaceHoursPerWeek: number
  /** 現在のペースで試験日まで到達できる総時間（時間）*/
  projectedTotalHours: number
  /** 目標時間に対してオントラックか */
  onTrack: boolean
  /** 不足時間（onTrack が false のとき正値）*/
  deficitHours: number
  /** 日本語アドバイス */
  recommendation: string
  /** 試験日まで残り日数 */
  daysUntilExam: number
  /** 試験日まで残り週数 */
  weeksUntilExam: number
  /** 累計学習時間（時間）*/
  totalStudiedHours: number
}

// -----------------------------------------------
// 弱点優先度ランキング
// -----------------------------------------------

/** 科目ごとの出題比率設定（証券アナリスト2次試験に基づく）*/
export type SubjectWeight = {
  subject: SubjectKey
  /** 出題比率 0〜1（合計 = 1）*/
  examWeight: number
  /** 科目の平均難易度 */
  avgDifficulty: number
}

/** 分野レベルの学習優先度エントリ */
export type WeakPriorityEntry = {
  subject: SubjectKey
  chapterKey: string
  chapterName: string
  /** 弱点スコアの章平均 */
  avgWeakScore: number
  /** 出題比率反映後の重み付きスコア */
  priorityScore: number
  /** 過去の改善速度（score/week、大きいほど改善しやすい）*/
  improvementRate: number
  /** 学習リターン推定（改善しやすさ × 出題比率）*/
  learningReturn: number
  /** 未回答問題数 */
  unansweredCount: number
  /** 問題数 */
  totalProblems: number
  /** ランク 1 が最優先 */
  rank: number
}

// -----------------------------------------------
// 学習効率スコア
// -----------------------------------------------

/** ポモドーロセッション1件（効率計算用）*/
export type PomodoroSessionRecord = {
  /** 集中セット完了数 */
  completedFocusSets: number
  /** 開始〜終了のトータル分数 */
  totalMinutes: number
  date: string  // "YYYY-MM-DD"
}

/** クイズセッション1件（効率計算用）*/
export type EfficiencySessionInput = {
  totalQuestions: number
  correctCount: number
  durationSeconds: number
  answerTimings?: number[]  // 各問の回答時間（秒）
}

/** 学習効率スコアの出力 */
export type LearningEfficiencyScore = {
  /** セッション総合効率スコア 0-100 */
  overallScore: number
  components: {
    /** 集中度スコア (0-40): ポモドーロ完了率 × 回答速度安定性 */
    focusScore: number
    /** 消化効率スコア (0-30): 1時間あたりの問題消化数 */
    throughputScore: number
    /** 正答率スコア (0-30): セッション内の正答率推移 */
    accuracyScore: number
  }
  /** 1時間あたりの問題消化数 */
  questionsPerHour: number
  /** 回答時間の変動係数（低いほど安定）*/
  answerTimeCV: number
  /** セッション正答率 */
  sessionAccuracy: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}
