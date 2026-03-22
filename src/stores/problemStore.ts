// =============================================
// src/stores/problemStore.ts
// 問題演習 Zustand Store（Supabase連携版）
// localStorage の persist は廃止し Supabase に統一
// =============================================

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  Problem,
  ProblemAttempt,
  ProblemResult,
  ProblemStats,
  SubjectKey,
  SubjectStatsResult,
  ChapterStatsResult,
} from '../types/problem'

// -----------------------------------------------
// Store の型定義
// -----------------------------------------------

type ProblemStore = {

  // ---- 問題データ ----

  /** Supabase から取得した全問題 */
  problems: Problem[]

  /** 問題データ取得中フラグ */
  loadingProblems: boolean

  /** Supabase から problems テーブルを取得 */
  fetchProblems: () => Promise<void>

  // ---- 正誤統計 ----

  /**
   * ユーザーの正誤統計
   * key: problem_id / value: ProblemStats
   * Supabase の problem_latest_results ビューから取得
   */
  stats: Record<string, ProblemStats>

  /** 統計データ取得中フラグ */
  loadingStats: boolean

  /** Supabase から problem_latest_results ビューを取得 */
  fetchStats: () => Promise<void>

  // ---- 回答送信 ----

  /**
   * 回答を Supabase に送信する
   * 楽観的更新でローカルの stats も即座に反映する
   * @param problemId  問題ID
   * @param result     正誤結果（correct / partial / incorrect）
   * @param timeSpentSec  解答所要時間（秒）
   */
  submitResult: (
    problemId: string,
    result: NonNullable<ProblemResult>,
    timeSpentSec?: number
  ) => Promise<void>

  // ---- ユーティリティ ----

  /** 科目キーで問題を絞り込む */
  getProblemsBySubject: (subject: SubjectKey) => Problem[]

  /** 科目別の正誤集計を返す */
  getSubjectStats: (subject: SubjectKey) => SubjectStatsResult

  /** 科目内の章別正誤集計を返す */
  getChapterStats: (subject: SubjectKey) => ChapterStatsResult[]

  // ---- ストリーク ----

  /** 連続正解日数 */
  streak: number

  /** ストリークを Supabase から再計算して取得 */
  fetchStreak: () => Promise<void>

  // ---- 回答履歴 ----

  /**
   * 問題ごとの直近10件回答履歴
   * key: problem_id / value: ProblemAttempt[] (古い順)
   */
  recentAttempts: Record<string, ProblemAttempt[]>

  /**
   * 指定した問題IDリストの直近10件履歴を取得して recentAttempts に格納
   */
  fetchRecentAttempts: (problemIds: string[]) => Promise<void>

  // ---- 初期化 ----

  /**
   * ログイン直後に呼び出す一括初期化
   * fetchProblems / fetchStats / fetchStreak を並列実行
   */
  initialize: () => Promise<void>
}

// -----------------------------------------------
// Store の実装
// -----------------------------------------------

export const useProblemStore = create<ProblemStore>((set, get) => ({

  // =====================================
  // 問題データ
  // =====================================

  problems: [],
  loadingProblems: false,

  fetchProblems: async () => {
    set({ loadingProblems: true })
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .order('chapter_key', { ascending: true })
        .order('display_order', { ascending: true })

      if (error) {
        console.error('[problemStore] fetchProblems error:', error)
        return
      }

      if (data) {
        // Supabase の snake_case → TypeScript の camelCase に変換
        const mapped: Problem[] = data.map((r) => ({
          id:               r.id,
          subject:          r.subject as SubjectKey,
          chapterKey:       r.chapter_key,
          chapterName:      r.chapter_name,
          sectionName:      r.section_name ?? undefined,
          questionNo:       r.question_no,
          questionType:     r.question_type as 'descriptive',
          points:           r.points,
          questionText:     r.question_text,
          hintText:         r.hint_text ?? undefined,
          answerText:       r.answer_text,
          explanation:      r.explanation,
          relatedKnowledge: r.related_knowledge ?? undefined,
          tags:             r.tags ?? [],
          difficulty:       r.difficulty as 1 | 2 | 3,
          source:           r.source ?? undefined,
          displayOrder:     r.display_order,
        }))
        set({ problems: mapped })
      }
    } finally {
      set({ loadingProblems: false })
    }
  },

  // =====================================
  // 正誤統計
  // =====================================

  stats: {},
  loadingStats: false,

  fetchStats: async () => {
    set({ loadingStats: true })
    try {
      const { data, error } = await supabase
        .from('problem_latest_results')
        .select('*')

      if (error) {
        console.error('[problemStore] fetchStats error:', error)
        return
      }

      if (data) {
        const map: Record<string, ProblemStats> = {}
        data.forEach((r) => {
          map[r.problem_id] = {
            problemId:       r.problem_id,
            latestResult:    r.latest_result as NonNullable<ProblemResult>,
            attemptCount:    r.attempt_count,
            correctCount:    r.correct_count,
            partialCount:    r.partial_count,
            incorrectCount:  r.incorrect_count,
            lastAttemptedAt: r.last_attempted_at,
          }
        })
        set({ stats: map })
      }
    } finally {
      set({ loadingStats: false })
    }
  },

  // =====================================
  // 回答送信
  // =====================================

  submitResult: async (problemId, result, timeSpentSec) => {
    // ---- 楽観的更新（UIを即座に反映）----
    set((state) => {
      const prev = state.stats[problemId]
      const wasCorrect   = result === 'correct'
      const wasPartial   = result === 'partial'
      const wasIncorrect = result === 'incorrect'

      const updated: ProblemStats = {
        problemId,
        latestResult:    result,
        attemptCount:    (prev?.attemptCount   ?? 0) + 1,
        correctCount:    (prev?.correctCount   ?? 0) + (wasCorrect   ? 1 : 0),
        partialCount:    (prev?.partialCount   ?? 0) + (wasPartial   ? 1 : 0),
        incorrectCount:  (prev?.incorrectCount ?? 0) + (wasIncorrect ? 1 : 0),
        lastAttemptedAt: new Date().toISOString(),
      }

      return {
        stats: { ...state.stats, [problemId]: updated },
      }
    })

    // ---- Supabase に挿入 ----
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('[problemStore] submitResult: ユーザー未認証')
      return
    }

    const { error } = await supabase
      .from('problem_attempts')
      .insert({
        user_id:        user.id,
        problem_id:     problemId,
        result,
        time_spent_sec: timeSpentSec ?? null,
      })

    if (error) {
      console.error('[problemStore] submitResult error:', error)
      // 挿入失敗時はサーバーから再取得して整合性を保つ
      get().fetchStats()
      return
    }

    // ストリーク再計算（非同期・UIブロックなし）
    get().fetchStreak()
  },

  // =====================================
  // ユーティリティ
  // =====================================

  getProblemsBySubject: (subject) =>
    get().problems.filter((p) => p.subject === subject),

  getSubjectStats: (subject): SubjectStatsResult => {
    const problems = get().getProblemsBySubject(subject)
    const stats    = get().stats

    const answered  = problems.filter((p) => stats[p.id]?.latestResult)
    const correct   = answered.filter((p) => stats[p.id]?.latestResult === 'correct').length
    const partial   = answered.filter((p) => stats[p.id]?.latestResult === 'partial').length
    const incorrect = answered.filter((p) => stats[p.id]?.latestResult === 'incorrect').length
    const unanswered = problems.length - answered.length
    const accuracy  = answered.length > 0
      ? Math.round((correct / answered.length) * 100)
      : 0

    return {
      total:     problems.length,
      answered:  answered.length,
      correct,
      partial,
      incorrect,
      unanswered,
      accuracy,
    }
  },

  getChapterStats: (subject): ChapterStatsResult[] => {
    const problems = get().getProblemsBySubject(subject)
    const stats    = get().stats

    // chapter_key でユニークな章一覧を取得（表示順序を維持）
    const seen = new Set<string>()
    const chapters: string[] = []
    problems.forEach((p) => {
      if (!seen.has(p.chapterKey)) {
        seen.add(p.chapterKey)
        chapters.push(p.chapterKey)
      }
    })

    return chapters.map((ck) => {
      const ps       = problems.filter((p) => p.chapterKey === ck)
      const answered = ps.filter((p) => stats[p.id]?.latestResult)
      const correct  = answered.filter((p) => stats[p.id]?.latestResult === 'correct').length
      const accuracy = answered.length > 0
        ? Math.round((correct / answered.length) * 100)
        : 0

      return {
        chapterKey:  ck,
        chapterName: ps[0].chapterName,
        total:       ps.length,
        answered:    answered.length,
        correct,
        accuracy,
      }
    })
  },

  // =====================================
  // ストリーク
  // =====================================

  streak: 0,

  fetchStreak: async () => {
    // 直近200件の回答履歴を取得
    const { data, error } = await supabase
      .from('problem_attempts')
      .select('result, attempted_at')
      .order('attempted_at', { ascending: false })
      .limit(200)

    if (error || !data) {
      console.error('[problemStore] fetchStreak error:', error)
      return
    }

    // 日付ごとに「正解があったか」をマップ化
    // key: "YYYY-MM-DD" / value: true（正解あり）or false（回答あるが正解なし）
    const dayMap: Record<string, boolean> = {}

    data.forEach((r) => {
      const day = r.attempted_at.slice(0, 10)
      if (r.result === 'correct') {
        dayMap[day] = true
      } else if (dayMap[day] === undefined) {
        dayMap[day] = false
      }
    })

    // 今日から遡って連続して正解があった日数をカウント
    let streak = 0
    const today = new Date()

    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)

      if (dayMap[key] === true) {
        streak++
      } else if (i === 0) {
        // 今日まだ回答していない場合は昨日から遡る（streak継続扱い）
        continue
      } else {
        // 正解のない日が来たらストリーク終了
        break
      }
    }

    set({ streak })
  },

  // =====================================
  // 回答履歴
  // =====================================

  recentAttempts: {},

  fetchRecentAttempts: async (problemIds) => {
    if (problemIds.length === 0) return

    const { data, error } = await supabase
      .from('problem_attempts')
      .select('id, problem_id, result, attempted_at')
      .in('problem_id', problemIds)
      .order('attempted_at', { ascending: false })
      .limit(problemIds.length * 10)

    if (error) {
      console.error('[problemStore] fetchRecentAttempts error:', error)
      return
    }

    if (!data) return

    // problem_id ごとに最新10件を切り出し、古い順にソート
    const map: Record<string, ProblemAttempt[]> = {}
    data.forEach((r) => {
      if (!map[r.problem_id]) map[r.problem_id] = []
      if (map[r.problem_id].length < 10) {
        map[r.problem_id].push({
          id:           r.id,
          userId:       '',
          problemId:    r.problem_id,
          result:       r.result as NonNullable<ProblemResult>,
          attemptedAt:  r.attempted_at,
        })
      }
    })
    // 古い順（昇順）に並び替え
    Object.keys(map).forEach((pid) => {
      map[pid].sort((a, b) =>
        new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
      )
    })
    set({ recentAttempts: map })
  },

  // =====================================
  // 初期化
  // =====================================

  initialize: async () => {
    // 問題データ・統計・ストリークを並列取得
    await Promise.all([
      get().fetchProblems(),
      get().fetchStats(),
      get().fetchStreak(),
    ])
  },
}))
