import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type QuizQuestion = {
  id: string        // "{subject}:{field}:{index}" 形式
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

type IndexSubject = {
  name: string
  fields: string[]
}

type QuizAnswer = {
  question_key: string  // question.id と同値
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

// GitHub Pages の base path に対応（vite.config の base 設定を尊重）
const BASE_PATH = `${import.meta.env.BASE_URL}questions`.replace(/\/\//g, '/')

async function fetchIndex(): Promise<IndexSubject[]> {
  const res = await fetch(`${BASE_PATH}/index.json`)
  if (!res.ok) return []
  const data = await res.json()
  return (data.subjects ?? []) as IndexSubject[]
}

async function fetchFieldQuestions(subject: string, field: string): Promise<QuizQuestion[]> {
  const url = `${BASE_PATH}/${encodeURIComponent(subject)}/${encodeURIComponent(field)}.json`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return ((data.questions ?? []) as RawQuestion[]).map((q, i) => ({
    ...q,
    id: `${subject}:${field}:${i}`,
    subject,
    field,
  }))
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  weakQuestionIds: new Set(),
  loading: false,

  getSubjects: async () => {
    const subjects = await fetchIndex()
    return subjects.map(s => s.name)
  },

  getFields: async (subject) => {
    const subjects = await fetchIndex()
    return subjects.find(s => s.name === subject)?.fields ?? []
  },

  fetchQuestions: async (subject, field) => {
    set({ loading: true })
    try {
      if (field) {
        const questions = await fetchFieldQuestions(subject, field)
        set({ questions })
      } else {
        // 全分野をまとめてフェッチ
        const subjects = await fetchIndex()
        const fields = subjects.find(s => s.name === subject)?.fields ?? []
        const results = await Promise.all(fields.map(f => fetchFieldQuestions(subject, f)))
        set({ questions: results.flat() })
      }
    } catch {
      set({ questions: [] })
    }
    set({ loading: false })
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
}))
