import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type QuizSession = {
  id: string
  subject: string
  field: string | null
  is_weak_mode: boolean
  total_questions: number
  correct_count: number
  duration_seconds: number
  created_at: string
}

export type QuizQuestion = {
  id: string        // Supabase UUID
  subject: string
  field: string
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}

type RawQuestion = {
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}

type QuizAnswer = {
  question_key: string  // = question.id (UUID)
  selected_answer: number
  is_correct: boolean
}

type SaveSessionParams = {
  subject: string
  field: string | null
  is_weak_mode: boolean
  total_questions: number
  correct_count: number
  duration_seconds: number
  answers: QuizAnswer[]
}

interface QuizState {
  questions: QuizQuestion[]
  weakQuestionIds: Set<string>
  sessions: QuizSession[]
  loading: boolean
  fetchQuestions: (subject: string, field: string | null) => Promise<void>
  fetchWeakQuestions: () => Promise<void>
  fetchSessions: () => Promise<void>
  toggleWeakQuestion: (questionId: string) => Promise<void>
  saveSession: (params: SaveSessionParams) => Promise<void>
  getSubjects: () => Promise<string[]>
  getFields: (subject: string) => Promise<string[]>
  uploadQuestions: (subject: string, field: string, questions: RawQuestion[]) => Promise<void>
  countExisting: (subject: string, field: string) => Promise<number>
  deleteQuestion: (id: string) => Promise<void>
  deleteField: (subject: string, field: string) => Promise<void>
  addQuestion: (subject: string, field: string, q: RawQuestion) => Promise<QuizQuestion>
  fetchAnswerStats: (questionIds: string[]) => Promise<Record<string, { total: number; correct: number }>>
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  weakQuestionIds: new Set(),
  sessions: [],
  loading: false,

  getSubjects: async () => {
    const { data } = await supabase.from('quiz_questions').select('subject')
    return [...new Set((data ?? []).map((r: { subject: string }) => r.subject))]
  },

  getFields: async (subject) => {
    const { data } = await supabase
      .from('quiz_questions')
      .select('field')
      .eq('subject', subject)
    return [...new Set((data ?? []).map((r: { field: string }) => r.field))]
  },

  fetchQuestions: async (subject, field) => {
    set({ loading: true })
    let query = supabase.from('quiz_questions').select('*').eq('subject', subject)
    if (field) query = query.eq('field', field)
    const { data } = await query
    set({ questions: (data ?? []) as QuizQuestion[], loading: false })
  },

  fetchWeakQuestions: async () => {
    const { data, error } = await supabase
      .from('quiz_weak_questions')
      .select('question_key')
    if (!error && data) {
      set({ weakQuestionIds: new Set(data.map((r: { question_key: string }) => r.question_key)) })
    }
  },

  toggleWeakQuestion: async (questionId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isWeak = get().weakQuestionIds.has(questionId)
    // 楽観的更新
    set(state => {
      const next = new Set(state.weakQuestionIds)
      isWeak ? next.delete(questionId) : next.add(questionId)
      return { weakQuestionIds: next }
    })
    if (isWeak) {
      await supabase.from('quiz_weak_questions').delete()
        .eq('user_id', user.id).eq('question_key', questionId)
    } else {
      await supabase.from('quiz_weak_questions').insert({ user_id: user.id, question_key: questionId })
    }
  },

  saveSession: async ({ subject, field, is_weak_mode, total_questions, correct_count, duration_seconds, answers }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .insert({ user_id: user.id, subject, field, is_weak_mode, total_questions, correct_count, duration_seconds })
      .select()
      .single()
    if (error || !session) return
    if (answers.length > 0) {
      await supabase.from('quiz_answers').insert(
        answers.map(a => ({ session_id: session.id, ...a }))
      )
    }
  },

  fetchSessions: async () => {
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    set({ sessions: (data ?? []) as QuizSession[] })
  },

  countExisting: async (subject, field) => {
    const { count, error } = await supabase
      .from('quiz_questions')
      .select('id', { count: 'exact', head: true })
      .eq('subject', subject)
      .eq('field', field)
    if (error) throw new Error(error.message)
    return count ?? 0
  },

  deleteQuestion: async (id) => {
    await supabase.from('quiz_questions').delete().eq('id', id)
    set(state => ({ questions: state.questions.filter(q => q.id !== id) }))
  },

  deleteField: async (subject, field) => {
    await supabase.from('quiz_questions').delete()
      .eq('subject', subject).eq('field', field)
    set(state => ({
      questions: state.questions.filter(q => !(q.subject === subject && q.field === field)),
    }))
  },

  addQuestion: async (subject, field, q) => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({ subject, field, question: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation ?? null })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const added = data as QuizQuestion
    set(state => ({ questions: [...state.questions, added] }))
    return added
  },

  fetchAnswerStats: async (questionIds) => {
    if (questionIds.length === 0) return {}
    const { data } = await supabase
      .from('quiz_answers')
      .select('question_key, is_correct')
      .in('question_key', questionIds)
    const stats: Record<string, { total: number; correct: number }> = {}
    for (const row of (data ?? []) as { question_key: string; is_correct: boolean }[]) {
      if (!stats[row.question_key]) stats[row.question_key] = { total: 0, correct: 0 }
      stats[row.question_key].total++
      if (row.is_correct) stats[row.question_key].correct++
    }
    return stats
  },

  uploadQuestions: async (subject, field, rawQuestions) => {
    // 既存の同subject+fieldを削除してから再INSERT
    const { error: delError } = await supabase.from('quiz_questions')
      .delete().eq('subject', subject).eq('field', field)
    if (delError) throw new Error(delError.message)
    const { error: insError } = await supabase.from('quiz_questions').insert(
      rawQuestions.map(q => ({
        subject,
        field,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation ?? null,
      }))
    )
    if (insError) throw new Error(insError.message)
  },
}))
