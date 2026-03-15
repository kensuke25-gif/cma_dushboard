import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type QuizQuestion = {
  id: string
  subject: string
  field: string
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}

type QuizAnswer = {
  question_id: string
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
  loading: boolean
  fetchQuestions: (subject: string, field: string | null) => Promise<void>
  fetchWeakQuestions: () => Promise<void>
  toggleWeakQuestion: (questionId: string) => Promise<void>
  saveSession: (params: SaveSessionParams) => Promise<void>
  getSubjects: () => Promise<string[]>
  getFields: (subject: string) => Promise<string[]>
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  weakQuestionIds: new Set(),
  loading: false,

  getSubjects: async () => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('subject')
    if (error || !data) return []
    return [...new Set(data.map((r: { subject: string }) => r.subject))]
  },

  getFields: async (subject: string) => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('field')
      .eq('subject', subject)
    if (error || !data) return []
    return [...new Set(data.map((r: { field: string }) => r.field))]
  },

  fetchQuestions: async (subject, field) => {
    set({ loading: true })
    let query = supabase
      .from('quiz_questions')
      .select('*')
      .eq('subject', subject)
    if (field) query = query.eq('field', field)
    const { data, error } = await query
    if (!error && data) set({ questions: data as QuizQuestion[] })
    set({ loading: false })
  },

  fetchWeakQuestions: async () => {
    const { data, error } = await supabase
      .from('quiz_weak_questions')
      .select('question_id')
    if (!error && data) {
      set({ weakQuestionIds: new Set(data.map((r: { question_id: string }) => r.question_id)) })
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
        .eq('user_id', user.id).eq('question_id', questionId)
    } else {
      await supabase.from('quiz_weak_questions').insert({ user_id: user.id, question_id: questionId })
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
}))
