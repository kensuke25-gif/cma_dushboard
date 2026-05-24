// =============================================
// src/stores/learningAlgoStore.ts
// 弱点検出・学習最適化アルゴリズム Zustand Store
//
// このストアは「計算結果のキャッシュ + Supabase永続化」の役割を担う
// 重い計算（弱点スコア、SM-2カード更新）はクライアント側で実行し、
// 結果をSupabaseに保存して次回起動時に再利用する
// =============================================

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { calcWeakScore, calcWeakScoresBatch } from '../lib/weakScoring'
import { createSM2Card, updateSM2Card, getDueCards, getReviewForecast } from '../lib/sm2Scheduler'
import { calcPacePrediction } from '../lib/pacePrediction'
import { calcWeakPriorityRanking, calcSubjectPriority } from '../lib/weakPriority'
import { calcLearningEfficiency } from '../lib/learningEfficiency'
import type {
  WeakScoreOutput,
  SM2Card,
  PacePrediction,
  PaceStudyRecord,
  WeakPriorityEntry,
  LearningEfficiencyScore,
  EfficiencySessionInput,
} from '../types/learning'
import type { Difficulty, ProblemResult, SubjectKey } from '../types/problem'

// -----------------------------------------------
// 試験日定数
// -----------------------------------------------

export const CMA_EXAM_DATE = new Date('2026-06-07T09:00:00+09:00')

// -----------------------------------------------
// ストア型定義
// -----------------------------------------------

type LearningAlgoState = {

  // ---- 弱点スコア ----

  /** 問題ID → 弱点スコア のマップ */
  weakScores: Record<string, WeakScoreOutput>
  weakScoresLoading: boolean
  weakScoresLastCalcAt: string | null

  /**
   * 弱点スコアを一括計算してストアに格納する
   * Supabase の problem_attempts から全回答履歴を取得して計算
   */
  calcAllWeakScores: () => Promise<void>

  /** 単一問題のスコアを取得（キャッシュがなければ計算）*/
  getWeakScore: (problemId: string, difficulty: Difficulty) => WeakScoreOutput | null

  // ---- SM-2 スケジューリング ----

  /** 問題ID → SM2カード のマップ */
  sm2Cards: Record<string, SM2Card>
  sm2Loading: boolean

  /** Supabase から SM-2 カードを取得 */
  fetchSM2Cards: () => Promise<void>

  /**
   * 回答後に SM-2 カードを更新
   * - ローカルのストアを即座に更新（楽観的更新）
   * - Supabase に upsert
   */
  updateSM2AfterAnswer: (
    problemId: string,
    result: NonNullable<ProblemResult>,
    difficulty: Difficulty
  ) => Promise<void>

  /** 今日のレビュー対象カードリスト */
  getDueCards: () => SM2Card[]

  /** 今後14日のレビュー予測 */
  getReviewForecast: (daysAhead?: number) => { date: string; count: number }[]

  // ---- ペース予測 ----

  /** 最新のペース予測（null = 未計算）*/
  pacePrediction: PacePrediction | null

  /**
   * ペース予測を計算する
   * @param studyRecords studyStore.records と互換
   * @param targetHours 目標時間（goalStore.goals.examTotalHours）
   */
  calcPacePrediction: (studyRecords: PaceStudyRecord[], targetHours: number) => void

  // ---- 弱点優先度ランキング ----

  /** 最新の優先度ランキング */
  priorityRanking: WeakPriorityEntry[]
  priorityRankingLoading: boolean

  /**
   * 優先度ランキングを計算する
   * calcAllWeakScores の完了後に呼び出すこと
   */
  calcPriorityRanking: () => Promise<void>

  /** 科目別優先度サマリ */
  subjectPriority: ReturnType<typeof calcSubjectPriority>

  // ---- 学習効率スコア ----

  /**
   * セッションの学習効率スコアを計算する（永続化しない・表示用）
   */
  calcSessionEfficiency: (
    session: EfficiencySessionInput,
    pomodoroSets?: number
  ) => LearningEfficiencyScore

  // ---- 初期化 ----

  /**
   * ログイン後に呼び出す一括初期化
   * fetchSM2Cards を実行（スコア計算は重いので手動トリガー）
   */
  initialize: () => Promise<void>
}

// -----------------------------------------------
// Supabase テーブル名
// sm2_cards テーブルが必要（Supabaseで別途作成）
//   CREATE TABLE sm2_cards (
//     user_id      uuid REFERENCES auth.users NOT NULL,
//     problem_id   text NOT NULL,
//     repetitions  integer NOT NULL DEFAULT 0,
//     ease_factor  numeric(4,3) NOT NULL DEFAULT 2.5,
//     interval_days integer NOT NULL DEFAULT 0,
//     next_review_date date NOT NULL,
//     updated_at   timestamptz NOT NULL DEFAULT now(),
//     PRIMARY KEY (user_id, problem_id)
//   );
// -----------------------------------------------

const SM2_TABLE = 'sm2_cards'

// -----------------------------------------------
// ストア実装
// -----------------------------------------------

export const useLearningAlgoStore = create<LearningAlgoState>((set, get) => ({

  // =============================================
  // 弱点スコア
  // =============================================

  weakScores: {},
  weakScoresLoading: false,
  weakScoresLastCalcAt: null,

  calcAllWeakScores: async () => {
    set({ weakScoresLoading: true })
    try {
      // 全回答履歴を取得（Supabase RLS で自動フィルタリング）
      const { data: attempts, error } = await supabase
        .from('problem_attempts')
        .select('problem_id, result, attempted_at, time_spent_sec')
        .order('attempted_at', { ascending: true })

      if (error || !attempts) {
        console.error('[learningAlgoStore] calcAllWeakScores error:', error)
        return
      }

      // 問題IDごとに回答履歴をグループ化
      const grouped: Record<string, {
        result: NonNullable<ProblemResult>
        attemptedAt: string
        timeSpentSec?: number
      }[]> = {}

      attempts.forEach((r: {
        problem_id: string
        result: string
        attempted_at: string
        time_spent_sec: number | null
      }) => {
        if (!grouped[r.problem_id]) grouped[r.problem_id] = []
        grouped[r.problem_id].push({
          result: r.result as NonNullable<ProblemResult>,
          attemptedAt: r.attempted_at,
          timeSpentSec: r.time_spent_sec ?? undefined,
        })
      })

      // 問題メタ情報（難易度）を取得
      const { data: problems } = await supabase
        .from('problems')
        .select('id, difficulty')

      const difficultyMap: Record<string, Difficulty> = {}
      ;(problems ?? []).forEach((p: { id: string; difficulty: number }) => {
        difficultyMap[p.id] = p.difficulty as Difficulty
      })

      // 弱点スコアを一括計算
      const inputs = Object.entries(grouped).map(([problemId, attList]) => ({
        problemId,
        difficulty: difficultyMap[problemId] ?? 2,
        attempts: attList,
      }))

      const results = calcWeakScoresBatch(inputs)

      const map: Record<string, WeakScoreOutput> = {}
      results.forEach(r => { map[r.problemId] = r })

      set({
        weakScores: map,
        weakScoresLastCalcAt: new Date().toISOString(),
      })
    } finally {
      set({ weakScoresLoading: false })
    }
  },

  getWeakScore: (problemId, difficulty) => {
    const cached = get().weakScores[problemId]
    if (cached) return cached

    // キャッシュなし → 問題のみのスコア（試行ゼロ）を返す
    return calcWeakScore({ problemId, difficulty, attempts: [] })
  },

  // =============================================
  // SM-2 スケジューリング
  // =============================================

  sm2Cards: {},
  sm2Loading: false,

  fetchSM2Cards: async () => {
    set({ sm2Loading: true })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from(SM2_TABLE as any)
        .select('*')

      if (error || !data) {
        console.error('[learningAlgoStore] fetchSM2Cards error:', error)
        return
      }

      const map: Record<string, SM2Card> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(data as any[]).forEach((r: {
        problem_id: string
        repetitions: number
        ease_factor: number
        interval_days: number
        next_review_date: string
        updated_at: string
      }) => {
        map[r.problem_id] = {
          problemId:       r.problem_id,
          repetitions:     r.repetitions,
          easeFactor:      r.ease_factor,
          intervalDays:    r.interval_days,
          nextReviewDate:  r.next_review_date,
          updatedAt:       r.updated_at,
        }
      })

      set({ sm2Cards: map })
    } finally {
      set({ sm2Loading: false })
    }
  },

  updateSM2AfterAnswer: async (problemId, result, difficulty) => {
    const existingCard = get().sm2Cards[problemId]
    const currentDate = new Date()

    // カードが存在しなければ新規作成
    const card = existingCard ?? createSM2Card(problemId, difficulty, currentDate)

    const { updatedCard } = updateSM2Card({
      card,
      result,
      difficulty,
      examDate: CMA_EXAM_DATE,
      currentDate,
    })

    // ---- 楽観的更新 ----
    set(state => ({
      sm2Cards: { ...state.sm2Cards, [problemId]: updatedCard },
    }))

    // ---- Supabase に upsert ----
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from(SM2_TABLE as any)
      .upsert({
        user_id:          user.id,
        problem_id:       updatedCard.problemId,
        repetitions:      updatedCard.repetitions,
        ease_factor:      updatedCard.easeFactor,
        interval_days:    updatedCard.intervalDays,
        next_review_date: updatedCard.nextReviewDate,
        updated_at:       updatedCard.updatedAt,
      }, { onConflict: 'user_id,problem_id' })

    if (error) {
      console.error('[learningAlgoStore] updateSM2AfterAnswer error:', error)
      // 失敗時は Supabase から再取得して整合性を保つ
      get().fetchSM2Cards()
    }
  },

  getDueCards: () => {
    const cards = Object.values(get().sm2Cards)
    return getDueCards(cards, new Date())
  },

  getReviewForecast: (daysAhead = 14) => {
    const cards = Object.values(get().sm2Cards)
    return getReviewForecast(cards, daysAhead, new Date())
  },

  // =============================================
  // ペース予測
  // =============================================

  pacePrediction: null,

  calcPacePrediction: (studyRecords, targetHours) => {
    const prediction = calcPacePrediction({
      targetHours,
      examDate: CMA_EXAM_DATE,
      studyRecords,
      currentDate: new Date(),
    })
    set({ pacePrediction: prediction })
  },

  // =============================================
  // 弱点優先度ランキング
  // =============================================

  priorityRanking: [],
  priorityRankingLoading: false,
  subjectPriority: [],

  calcPriorityRanking: async () => {
    set({ priorityRankingLoading: true })
    try {
      const weakScores = get().weakScores

      // 問題メタ情報（subject, chapter_key, chapter_name）を取得
      const { data: problems } = await supabase
        .from('problems')
        .select('id, subject, chapter_key, chapter_name')

      if (!problems) return

      // 章メタを収集
      const chapterMap: Record<string, {
        subject: SubjectKey
        chapterKey: string
        chapterName: string
        totalProblems: number
        unansweredCount: number
      }> = {}

      problems.forEach((p: {
        id: string
        subject: string
        chapter_key: string
        chapter_name: string
      }) => {
        const ck = p.chapter_key
        if (!chapterMap[ck]) {
          chapterMap[ck] = {
            subject: p.subject as SubjectKey,
            chapterKey: ck,
            chapterName: p.chapter_name,
            totalProblems: 0,
            unansweredCount: 0,
          }
        }
        chapterMap[ck].totalProblems++
        if (!weakScores[p.id]) {
          chapterMap[ck].unansweredCount++
        }
      })

      // WeakScoreOutput に subject と chapterKey を付与
      const scoredWithMeta = problems
        .filter((p: { id: string }) => weakScores[p.id])
        .map((p: { id: string; subject: string; chapter_key: string }) => ({
          ...weakScores[p.id],
          subject: p.subject as SubjectKey,
          chapterKey: p.chapter_key,
        }))

      const ranking = calcWeakPriorityRanking(
        scoredWithMeta,
        Object.values(chapterMap),
        20 // 上位20チャプター
      )

      const subjectPriority = calcSubjectPriority(scoredWithMeta)

      set({ priorityRanking: ranking, subjectPriority })
    } finally {
      set({ priorityRankingLoading: false })
    }
  },

  // =============================================
  // 学習効率スコア
  // =============================================

  calcSessionEfficiency: (session, pomodoroSets = 0) => {
    return calcLearningEfficiency(session, pomodoroSets)
  },

  // =============================================
  // 初期化
  // =============================================

  initialize: async () => {
    await get().fetchSM2Cards()
    // 弱点スコアは重い計算なのでUI起動直後には実行しない
    // 明示的に calcAllWeakScores() を呼ぶか、Analytics画面で遅延実行する
  },
}))
