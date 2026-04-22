// =============================================
// src/stores/analyticsStore.ts
// 弱点克服・学習分析 Zustand Store
// =============================================

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  calculateSM2,
  calculateWeaknessScore,
  calculatePacePrediction,
  RESULT_TO_QUALITY,
} from '../types/analytics'
import type {
  SRSState,
  StudySession,
  InsertStudySessionParams,
  PacePrediction,
  AIRecommendation,
  WeaknessSnapshot,
  WeaknessRankingItem,
  ProblemFullStats,
  CreateRecommendationParams,
  UserAction,
} from '../types/analytics'
import type { SubjectKey } from '../types/problem'

// 新テーブルは Database 型未登録のため any 経由でアクセス
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// -----------------------------------------------
// Store 型定義
// -----------------------------------------------

type AnalyticsStore = {

  // ---- SRS ----
  /** key = problem_id */
  srsMap:     Record<string, SRSState>
  loadingSRS: boolean
  /** problem_srs テーブルを全件取得してストアに格納 */
  fetchSRS: () => Promise<void>
  /**
   * 問題回答後に SM-2 を計算し problem_srs を UPSERT する
   * problemStore.submitResult() の末尾から呼び出す
   */
  updateSRS: (problemId: string, result: 'correct' | 'partial' | 'incorrect') => Promise<void>
  /** 今日復習すべき problem_id[] を next_review_date 昇順で返す */
  getDueProblems: () => string[]

  // ---- 弱点スナップショット ----
  weaknessSnapshots: WeaknessSnapshot[]
  loadingWeakness:   boolean
  /** 直近スナップショットを取得（granularity 未指定で全粒度）*/
  fetchLatestWeaknessSnapshots: (granularity?: WeaknessSnapshot['granularity']) => Promise<void>
  /** 計算済みスナップショットを一括 INSERT */
  saveWeaknessSnapshots: (
    snapshots: Omit<WeaknessSnapshot, 'id' | 'userId' | 'createdAt'>[]
  ) => Promise<void>
  /** 各 aggregateKey の最新 1 件を弱点スコア降順で返す */
  getWeaknessRanking: (subject?: SubjectKey, limit?: number) => WeaknessRankingItem[]
  /** problem_attempts から全問題の弱点スナップショットを計算して保存 */
  computeAndSaveWeaknessSnapshots: () => Promise<void>

  // ---- 学習セッション ----
  sessions:        StudySession[]
  loadingSessions: boolean
  fetchSessions:   (limit?: number) => Promise<void>
  insertSession:   (params: InsertStudySessionParams) => Promise<StudySession | null>

  // ---- ペース予測 ----
  pacePrediction:        PacePrediction | null
  loadingPace:           boolean
  fetchPacePrediction:   () => Promise<void>
  /** 最新実績データで予測を再計算して pace_predictions に UPSERT */
  refreshPacePrediction: (params: {
    totalStudiedMin:       number
    examTotalHours:        number
    examDate:              string
    subjectRemainingHours: Record<SubjectKey, number>
    subjectAccuracyPct:    Record<SubjectKey, number>
    topWeakProblemIds:     string[]
  }) => Promise<void>

  // ---- AI レコメンデーション ----
  recommendations:            AIRecommendation[]
  loadingRecommendations:     boolean
  /** 有効な未対応推奨を priority 昇順で取得 */
  fetchActiveRecommendations: () => Promise<void>
  createRecommendation:       (params: CreateRecommendationParams) => Promise<void>
  markRecommendationShown:    (id: string) => Promise<void>
  respondToRecommendation:    (id: string, action: UserAction) => Promise<void>
  /** ルールエンジン: 現在の状態から推奨を自動生成 */
  generateRecommendations: () => Promise<void>

  // ---- 拡張ビュー ----
  /** key = problem_id */
  fullStats:        Record<string, ProblemFullStats>
  loadingFullStats: boolean
  /** problem_full_stats VIEW を取得（fetchStats の上位互換として使用可） */
  fetchFullStats:   () => Promise<void>

  // ---- 初期化 ----
  initialize: () => Promise<void>
}

// -----------------------------------------------
// Store 実装
// -----------------------------------------------

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({

  // =====================================
  // SRS
  // =====================================

  srsMap:     {},
  loadingSRS: false,

  fetchSRS: async () => {
    set({ loadingSRS: true })
    try {
      const { data, error } = await db.from('problem_srs').select('*')
      if (error) {
        console.error('[analyticsStore] fetchSRS:', error)
        return
      }
      const map: Record<string, SRSState> = {}
      for (const r of data ?? []) {
        map[r.problem_id] = {
          userId:         r.user_id,
          problemId:      r.problem_id,
          easeFactor:     Number(r.ease_factor),
          repetitions:    r.repetitions,
          intervalDays:   r.interval_days,
          nextReviewDate: r.next_review_date,
          lastReviewedAt: r.last_reviewed_at,
        }
      }
      set({ srsMap: map })
    } finally {
      set({ loadingSRS: false })
    }
  },

  updateSRS: async (problemId, result) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return

    // 既存 SRS 状態取得（なければ初期値）
    const current: SRSState = get().srsMap[problemId] ?? {
      userId:         user.id,
      problemId,
      easeFactor:     2.5,
      repetitions:    0,
      intervalDays:   1,
      nextReviewDate: new Date().toISOString().slice(0, 10),
      lastReviewedAt: null,
    }

    const quality = RESULT_TO_QUALITY[result]
    const updated = calculateSM2(current, quality)

    // 楽観的更新
    set(state => ({
      srsMap: {
        ...state.srsMap,
        [problemId]: { ...current, ...updated },
      },
    }))

    const { error } = await db.from('problem_srs').upsert(
      {
        user_id:          user.id,
        problem_id:       problemId,
        ease_factor:      updated.easeFactor,
        repetitions:      updated.repetitions,
        interval_days:    updated.intervalDays,
        next_review_date: updated.nextReviewDate,
        last_reviewed_at: updated.lastReviewedAt,
      },
      { onConflict: 'user_id,problem_id' },
    )
    if (error) {
      console.error('[analyticsStore] updateSRS upsert error:', error)
      // ロールバック
      set(state => ({
        srsMap: { ...state.srsMap, [problemId]: current },
      }))
    }
  },

  getDueProblems: () => {
    const today = new Date().toISOString().slice(0, 10)
    return Object.values(get().srsMap)
      .filter(s => s.nextReviewDate <= today)
      .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
      .map(s => s.problemId)
  },

  // =====================================
  // 弱点スナップショット
  // =====================================

  weaknessSnapshots: [],
  loadingWeakness:   false,

  fetchLatestWeaknessSnapshots: async (granularity) => {
    set({ loadingWeakness: true })
    try {
      let query = db
        .from('weakness_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(500)
      if (granularity) query = query.eq('granularity', granularity)

      const { data, error } = await query
      if (error) {
        console.error('[analyticsStore] fetchWeakness:', error)
        return
      }
      set({
        weaknessSnapshots: (data ?? []).map((r: Record<string, unknown>) => ({
          id:             r.id as string,
          userId:         r.user_id as string,
          snapshotDate:   r.snapshot_date as string,
          granularity:    r.granularity as WeaknessSnapshot['granularity'],
          aggregateKey:   r.aggregate_key as string,
          subject:        r.subject as SubjectKey,
          weaknessScore:  Number(r.weakness_score),
          attemptCount:   r.attempt_count as number,
          correctCount:   r.correct_count as number,
          incorrectCount: r.incorrect_count as number,
          partialCount:   r.partial_count as number,
          avgTimeSec:     r.avg_time_sec != null ? Number(r.avg_time_sec) : null,
          createdAt:      r.created_at as string,
        })),
      })
    } finally {
      set({ loadingWeakness: false })
    }
  },

  saveWeaknessSnapshots: async (snapshots) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user || snapshots.length === 0) return

    const rows = snapshots.map(s => ({
      user_id:         user.id,
      snapshot_date:   s.snapshotDate,
      granularity:     s.granularity,
      aggregate_key:   s.aggregateKey,
      subject:         s.subject,
      weakness_score:  s.weaknessScore,
      attempt_count:   s.attemptCount,
      correct_count:   s.correctCount,
      incorrect_count: s.incorrectCount,
      partial_count:   s.partialCount,
      avg_time_sec:    s.avgTimeSec,
    }))

    const { error } = await db.from('weakness_snapshots').insert(rows)
    if (error) console.error('[analyticsStore] saveWeaknessSnapshots:', error)
  },

  getWeaknessRanking: (subject, limit = 10) => {
    const snaps = get().weaknessSnapshots

    // 各 aggregateKey の最新スナップショット 1 件を取得
    const latest = new Map<string, WeaknessSnapshot>()
    for (const s of snaps) {
      const key = `${s.granularity}:${s.aggregateKey}`
      const existing = latest.get(key)
      if (!existing || s.snapshotDate > existing.snapshotDate) {
        latest.set(key, s)
      }
    }

    return Array.from(latest.values())
      .filter(s => !subject || s.subject === subject)
      .sort((a, b) => b.weaknessScore - a.weaknessScore)
      .slice(0, limit)
      .map(s => ({
        aggregateKey:  s.aggregateKey,
        subject:       s.subject,
        granularity:   s.granularity,
        weaknessScore: s.weaknessScore,
        attemptCount:  s.attemptCount,
        correctCount:  s.correctCount,
        snapshotDate:  s.snapshotDate,
      }))
  },

  computeAndSaveWeaknessSnapshots: async () => {
    // problem_attempts と problems を結合して弱点スコアを計算
    const { data: attempts, error: aErr } = await supabase
      .from('problem_attempts')
      .select('problem_id, result, time_spent_sec, attempted_at')
      .order('attempted_at', { ascending: false })
      .limit(2000)

    const { data: problems, error: pErr } = await supabase
      .from('problems')
      .select('id, subject, chapter_key, difficulty')

    if (aErr || pErr || !attempts || !problems) {
      console.error('[analyticsStore] computeAndSave error:', aErr ?? pErr)
      return
    }

    const problemMap = new Map(
      (problems as Array<{ id: string; subject: string; chapter_key: string; difficulty: number }>)
        .map(p => [p.id, p])
    )
    const today = new Date()

    // 問題ごとに集計
    type AttemptRow = { problem_id: string; result: string; time_spent_sec: number | null; attempted_at: string }
    const byProblem = new Map<string, AttemptRow[]>()
    for (const a of attempts as AttemptRow[]) {
      if (!byProblem.has(a.problem_id)) byProblem.set(a.problem_id, [])
      byProblem.get(a.problem_id)!.push(a)
    }

    const snapshots: Omit<WeaknessSnapshot, 'id' | 'userId' | 'createdAt'>[] = []
    const todayStr = today.toISOString().slice(0, 10)

    // 章・科目の中間集計用
    type AggBuf = { attemptCount: number; correctCount: number; partialCount: number; incorrectCount: number; timeSums: number[] }
    const chapterBuf = new Map<string, AggBuf & { subject: SubjectKey }>()
    const subjectBuf = new Map<string, AggBuf>()

    for (const [problemId, rows] of byProblem) {
      const p = problemMap.get(problemId)
      if (!p) continue

      const correctCount   = rows.filter(r => r.result === 'correct').length
      const partialCount   = rows.filter(r => r.result === 'partial').length
      const incorrectCount = rows.filter(r => r.result === 'incorrect').length
      const attemptCount   = rows.length
      const lastAttempted  = new Date(rows[0].attempted_at)
      const daysSince      = Math.floor((today.getTime() - lastAttempted.getTime()) / 86_400_000)
      const timeSecs       = rows.map(r => r.time_spent_sec).filter((t): t is number => t != null)
      const avgTimeSec     = timeSecs.length > 0
        ? timeSecs.reduce((s, t) => s + t, 0) / timeSecs.length
        : null

      const weaknessScore = calculateWeaknessScore({
        attemptCount,
        correctCount,
        partialCount,
        incorrectCount,
        daysSinceLastAttempt: daysSince,
        difficulty: p.difficulty as 1 | 2 | 3,
      })

      snapshots.push({
        snapshotDate:   todayStr,
        granularity:    'problem',
        aggregateKey:   problemId,
        subject:        p.subject as SubjectKey,
        weaknessScore,
        attemptCount,
        correctCount,
        incorrectCount,
        partialCount,
        avgTimeSec,
      })

      // 章レベルに積算
      const ck = p.chapter_key
      if (!chapterBuf.has(ck)) chapterBuf.set(ck, { attemptCount: 0, correctCount: 0, partialCount: 0, incorrectCount: 0, timeSums: [], subject: p.subject as SubjectKey })
      const cb = chapterBuf.get(ck)!
      cb.attemptCount   += attemptCount
      cb.correctCount   += correctCount
      cb.partialCount   += partialCount
      cb.incorrectCount += incorrectCount
      if (avgTimeSec != null) cb.timeSums.push(avgTimeSec)

      // 科目レベルに積算
      if (!subjectBuf.has(p.subject)) subjectBuf.set(p.subject, { attemptCount: 0, correctCount: 0, partialCount: 0, incorrectCount: 0, timeSums: [] })
      const sb = subjectBuf.get(p.subject)!
      sb.attemptCount   += attemptCount
      sb.correctCount   += correctCount
      sb.partialCount   += partialCount
      sb.incorrectCount += incorrectCount
      if (avgTimeSec != null) sb.timeSums.push(avgTimeSec)
    }

    // 章レベルスナップショット
    for (const [chapterKey, buf] of chapterBuf) {
      const avgTimeSec = buf.timeSums.length > 0
        ? buf.timeSums.reduce((s, t) => s + t, 0) / buf.timeSums.length
        : null
      const weaknessScore = calculateWeaknessScore({
        attemptCount:         buf.attemptCount,
        correctCount:         buf.correctCount,
        partialCount:         buf.partialCount,
        incorrectCount:       buf.incorrectCount,
        daysSinceLastAttempt: 0,  // 章レベルは recency decay を適用しない
        difficulty:           2,
      })
      snapshots.push({
        snapshotDate:   todayStr,
        granularity:    'chapter',
        aggregateKey:   chapterKey,
        subject:        buf.subject,
        weaknessScore,
        attemptCount:   buf.attemptCount,
        correctCount:   buf.correctCount,
        incorrectCount: buf.incorrectCount,
        partialCount:   buf.partialCount,
        avgTimeSec,
      })
    }

    // 科目レベルスナップショット
    const subjectKeys: SubjectKey[] = ['securities', 'finance', 'market', 'ethics']
    for (const subjectKey of subjectKeys) {
      const buf = subjectBuf.get(subjectKey)
      if (!buf) continue
      const weaknessScore = calculateWeaknessScore({
        attemptCount:         buf.attemptCount,
        correctCount:         buf.correctCount,
        partialCount:         buf.partialCount,
        incorrectCount:       buf.incorrectCount,
        daysSinceLastAttempt: 0,
        difficulty:           2,
      })
      snapshots.push({
        snapshotDate:   todayStr,
        granularity:    'subject',
        aggregateKey:   subjectKey,
        subject:        subjectKey,
        weaknessScore,
        attemptCount:   buf.attemptCount,
        correctCount:   buf.correctCount,
        incorrectCount: buf.incorrectCount,
        partialCount:   buf.partialCount,
        avgTimeSec:     null,
      })
    }

    if (snapshots.length > 0) {
      await get().saveWeaknessSnapshots(snapshots)
      await get().fetchLatestWeaknessSnapshots()
    }
  },

  // =====================================
  // 学習セッション
  // =====================================

  sessions:        [],
  loadingSessions: false,

  fetchSessions: async (limit = 50) => {
    set({ loadingSessions: true })
    try {
      const { data, error } = await db
        .from('study_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) {
        console.error('[analyticsStore] fetchSessions:', error)
        return
      }
      const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
        id:                r.id as string,
        userId:            r.user_id as string,
        startedAt:         r.started_at as string,
        endedAt:           r.ended_at as string,
        sourceType:        r.source_type as 'pomodoro' | 'manual',
        timerMinutes:      r.timer_minutes as number | null,
        overtimeSeconds:   r.overtime_seconds as number,
        actualMinutes:     r.actual_minutes as number,
        studyRecordUuid:   r.study_record_uuid as string | null,
        subject:           r.subject as string | null,
        focusScore:        r.focus_score as number | null,
        wasCompleted:      r.was_completed as boolean,
        problemsAttempted: r.problems_attempted as number,
        problemsCorrect:   r.problems_correct as number,
        pomodoroSetNo:     r.pomodoro_set_no as number | null,
        createdAt:         r.created_at as string,
      }))
      set({ sessions: mapped })
    } finally {
      set({ loadingSessions: false })
    }
  },

  insertSession: async (params) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return null

    const { data, error } = await db
      .from('study_sessions')
      .insert({
        user_id:            user.id,
        started_at:         params.startedAt,
        ended_at:           params.endedAt,
        source_type:        params.sourceType,
        timer_minutes:      params.timerMinutes,
        overtime_seconds:   params.overtimeSeconds,
        actual_minutes:     params.actualMinutes,
        study_record_uuid:  params.studyRecordUuid,
        subject:            params.subject,
        focus_score:        params.focusScore,
        was_completed:      params.wasCompleted,
        problems_attempted: params.problemsAttempted,
        problems_correct:   params.problemsCorrect,
        pomodoro_set_no:    params.pomodoroSetNo,
      })
      .select()
      .single()

    if (error) {
      console.error('[analyticsStore] insertSession:', error)
      return null
    }

    const session = data as StudySession
    set(state => ({ sessions: [session, ...state.sessions] }))
    return session
  },

  // =====================================
  // ペース予測
  // =====================================

  pacePrediction:  null,
  loadingPace:     false,

  fetchPacePrediction: async () => {
    set({ loadingPace: true })
    try {
      const { data, error } = await db
        .from('pace_predictions')
        .select('*')
        .single()
      if (error || !data) return
      set({
        pacePrediction: {
          userId:                  data.user_id,
          calculatedAt:            data.calculated_at,
          totalStudiedHours:       Number(data.total_studied_hours),
          remainingHoursNeeded:    Number(data.remaining_hours_needed),
          currentDailyAvgMin:      Number(data.current_daily_avg_min),
          projectedCompletionDate: data.projected_completion_date,
          isOnTrack:               data.is_on_track,
          daysUntilExam:           data.days_until_exam,
          subjectRemainingHours:   data.subject_remaining_hours ?? {},
          subjectAccuracyPct:      data.subject_accuracy_pct ?? {},
          topWeakProblemIds:       data.top_weak_problem_ids ?? [],
          recommendedDailyMin:     data.recommended_daily_min,
        },
      })
    } finally {
      set({ loadingPace: false })
    }
  },

  refreshPacePrediction: async ({
    totalStudiedMin,
    examTotalHours,
    examDate,
    subjectRemainingHours,
    subjectAccuracyPct,
    topWeakProblemIds,
  }) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return

    // 過去14日の平均学習分を study_sessions から計算
    const { data: recentSessions } = await db
      .from('study_sessions')
      .select('actual_minutes')
      .gte('started_at', new Date(Date.now() - 14 * 86_400_000).toISOString())

    const recentTotalMin = (recentSessions ?? []).reduce(
      (s: number, r: { actual_minutes: number }) => s + r.actual_minutes,
      0,
    )
    const recentDailyAvgMin = recentTotalMin / 14

    const calc = calculatePacePrediction(
      totalStudiedMin,
      examTotalHours,
      examDate,
      recentDailyAvgMin,
    )

    const { error } = await db.from('pace_predictions').upsert(
      {
        user_id:                   user.id,
        calculated_at:             new Date().toISOString(),
        total_studied_hours:       calc.totalStudiedHours,
        remaining_hours_needed:    calc.remainingHoursNeeded,
        current_daily_avg_min:     calc.currentDailyAvgMin,
        projected_completion_date: calc.projectedCompletionDate,
        is_on_track:               calc.isOnTrack,
        days_until_exam:           calc.daysUntilExam,
        subject_remaining_hours:   subjectRemainingHours,
        subject_accuracy_pct:      subjectAccuracyPct,
        top_weak_problem_ids:      topWeakProblemIds,
        recommended_daily_min:     calc.recommendedDailyMin,
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      console.error('[analyticsStore] refreshPacePrediction upsert error:', error)
      return
    }

    set({
      pacePrediction: {
        userId:                  user.id,
        calculatedAt:            new Date().toISOString(),
        subjectRemainingHours,
        subjectAccuracyPct,
        topWeakProblemIds,
        ...calc,
      },
    })
  },

  // =====================================
  // AI レコメンデーション
  // =====================================

  recommendations:        [],
  loadingRecommendations: false,

  fetchActiveRecommendations: async () => {
    set({ loadingRecommendations: true })
    try {
      const now = new Date().toISOString()
      const { data, error } = await db
        .from('ai_recommendations')
        .select('*')
        .is('user_action', null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('priority', { ascending: true })
        .order('recommended_at', { ascending: false })
        .limit(20)
      if (error) {
        console.error('[analyticsStore] fetchActiveRecommendations:', error)
        return
      }
      const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
        id:            r.id as string,
        userId:        r.user_id as string,
        recommendedAt: r.recommended_at as string,
        actionType:    r.action_type as AIRecommendation['actionType'],
        subject:       r.subject as AIRecommendation['subject'],
        targetIds:     r.target_ids as string[],
        reasonText:    r.reason_text as string,
        priority:      r.priority as 1 | 2 | 3,
        wasShown:      r.was_shown as boolean,
        shownAt:       r.shown_at as string | null,
        userAction:    r.user_action as AIRecommendation['userAction'],
        actedAt:       r.acted_at as string | null,
        expiresAt:     r.expires_at as string | null,
        createdAt:     r.created_at as string,
      }))
      set({ recommendations: mapped })
    } finally {
      set({ loadingRecommendations: false })
    }
  },

  createRecommendation: async (params) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return

    const { data, error } = await db
      .from('ai_recommendations')
      .insert({
        user_id:      user.id,
        action_type:  params.actionType,
        subject:      params.subject,
        target_ids:   params.targetIds,
        reason_text:  params.reasonText,
        priority:     params.priority,
        expires_at:   params.expiresAt,
      })
      .select()
      .single()

    if (error) {
      console.error('[analyticsStore] createRecommendation:', error)
      return
    }
    set(state => ({
      recommendations: [data as AIRecommendation, ...state.recommendations],
    }))
  },

  markRecommendationShown: async (id) => {
    const now = new Date().toISOString()
    const { error } = await db
      .from('ai_recommendations')
      .update({ was_shown: true, shown_at: now })
      .eq('id', id)
    if (error) {
      console.error('[analyticsStore] markRecommendationShown:', error)
      return
    }
    set(state => ({
      recommendations: state.recommendations.map(r =>
        r.id === id ? { ...r, wasShown: true, shownAt: now } : r
      ),
    }))
  },

  respondToRecommendation: async (id, action) => {
    const now = new Date().toISOString()
    const { error } = await db
      .from('ai_recommendations')
      .update({ user_action: action, acted_at: now })
      .eq('id', id)
    if (error) {
      console.error('[analyticsStore] respondToRecommendation:', error)
      return
    }
    // 対応済みはリストから除去（UI非表示）
    set(state => ({
      recommendations: state.recommendations.filter(r => r.id !== id),
    }))
  },

  generateRecommendations: async () => {
    const { srsMap, weaknessSnapshots } = get()
    const today = new Date().toISOString().slice(0, 10)

    // ---- ルール 1: SRS 復習キュー ----
    const dueProblems = Object.values(srsMap)
      .filter(s => s.nextReviewDate <= today && s.easeFactor < 2.0)  // 習熟度が低いものを優先
      .sort((a, b) => a.easeFactor - b.easeFactor)
      .slice(0, 10)
      .map(s => s.problemId)

    if (dueProblems.length >= 3) {
      await get().createRecommendation({
        actionType:  'review_srs',
        subject:     null,
        targetIds:   dueProblems,
        reasonText:  `復習タイミングを迎えた問題が${dueProblems.length}件あります。忘却防止のため今日中に取り組みましょう。`,
        priority:    1,
        expiresAt:   new Date(Date.now() + 86_400_000).toISOString(),  // 翌日に失効
      })
    }

    // ---- ルール 2: 弱点スコア上位の問題 ----
    // 各問題の最新スナップショットを取得
    const latestByProblem = new Map<string, WeaknessSnapshot>()
    for (const s of weaknessSnapshots) {
      if (s.granularity !== 'problem') continue
      const existing = latestByProblem.get(s.aggregateKey)
      if (!existing || s.snapshotDate > existing.snapshotDate) {
        latestByProblem.set(s.aggregateKey, s)
      }
    }
    const criticalProblems = Array.from(latestByProblem.values())
      .filter(s => s.weaknessScore >= 60)
      .sort((a, b) => b.weaknessScore - a.weaknessScore)
      .slice(0, 5)

    if (criticalProblems.length >= 2) {
      const subjectCounts = new Map<string, number>()
      for (const p of criticalProblems) {
        subjectCounts.set(p.subject, (subjectCounts.get(p.subject) ?? 0) + 1)
      }
      const topSubject = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

      await get().createRecommendation({
        actionType: 'review_weak',
        subject:    topSubject as SubjectKey | null,
        targetIds:  criticalProblems.map(p => p.aggregateKey),
        reasonText: `弱点スコアが高い問題が${criticalProblems.length}件見つかりました（最高スコア: ${criticalProblems[0].weaknessScore}）。集中的に取り組みましょう。`,
        priority:   2,
        expiresAt:  new Date(Date.now() + 3 * 86_400_000).toISOString(),  // 3日後に失効
      })
    }
  },

  // =====================================
  // 拡張ビュー
  // =====================================

  fullStats:        {},
  loadingFullStats: false,

  fetchFullStats: async () => {
    set({ loadingFullStats: true })
    try {
      const { data, error } = await db
        .from('problem_full_stats')
        .select('*')
      if (error) {
        console.error('[analyticsStore] fetchFullStats:', error)
        return
      }
      const map: Record<string, ProblemFullStats> = {}
      for (const r of data ?? []) {
        map[r.problem_id] = {
          userId:              r.user_id,
          problemId:           r.problem_id,
          latestResult:        r.latest_result as ProblemFullStats['latestResult'],
          attemptCount:        r.attempt_count,
          correctCount:        r.correct_count,
          partialCount:        r.partial_count,
          incorrectCount:      r.incorrect_count,
          lastAttemptedAt:     r.last_attempted_at,
          avgTimeSec:          r.avg_time_sec != null ? Number(r.avg_time_sec) : null,
          srsNextReviewDate:   r.srs_next_review_date,
          srsEaseFactor:       r.srs_ease_factor != null ? Number(r.srs_ease_factor) : null,
          srsRepetitions:      r.srs_repetitions,
          srsIntervalDays:     r.srs_interval_days,
          isDueToday:          r.is_due_today,
          latestWeaknessScore: r.latest_weakness_score != null ? Number(r.latest_weakness_score) : null,
        }
      }
      set({ fullStats: map })
    } finally {
      set({ loadingFullStats: false })
    }
  },

  // =====================================
  // 初期化（ログイン直後に呼び出す）
  // =====================================

  initialize: async () => {
    await Promise.all([
      get().fetchSRS(),
      get().fetchLatestWeaknessSnapshots(),
      get().fetchActiveRecommendations(),
      get().fetchPacePrediction(),
    ])
  },
}))
