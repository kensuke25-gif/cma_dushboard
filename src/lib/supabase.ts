import { createClient } from '@supabase/supabase-js'

// データベース型定義
export type Database = {
  public: {
    Tables: {
      // -----------------------------------------------
      // 既存テーブル
      // -----------------------------------------------
      study_records: {
        Row: {
          id: string
          user_id: string
          subject: string
          content: string
          minutes: number
          next_action: string
          recorded_at: string
          date: string
          created_at: string
        }
        Insert: {
          user_id: string
          subject: string
          content: string
          minutes: number
          next_action: string
          recorded_at: string
          date: string
        }
        Update: {
          user_id?: string
          subject?: string
          content?: string
          minutes?: number
          next_action?: string
          recorded_at?: string
          date?: string
        }
        Relationships: []
      }
      weak_items: {
        Row: {
          id: string
          user_id: string
          item_id: number
        }
        Insert: {
          user_id: string
          item_id: number
        }
        Update: {
          user_id?: string
          item_id?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          subject: string
          task_type: string
          minutes: number
          done: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          title: string
          subject: string
          task_type: string
          minutes: number
          done: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          title?: string
          subject?: string
          task_type?: string
          minutes?: number
          done?: boolean
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: string
          subject: string
          field: string
          question: string
          options: string[]
          correct_answer: number
          explanation: string | null
        }
        Insert: {
          subject: string
          field: string
          question: string
          options: string[]
          correct_answer: number
          explanation?: string | null
        }
        Update: {
          subject?: string
          field?: string
          question?: string
          options?: string[]
          correct_answer?: number
          explanation?: string | null
        }
        Relationships: []
      }
      quiz_weak_questions: {
        Row: {
          id: string
          user_id: string
          question_key: string
        }
        Insert: {
          user_id: string
          question_key: string
        }
        Update: {
          user_id?: string
          question_key?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          id: string
          user_id: string
          subject: string
          field: string | null
          is_weak_mode: boolean
          total_questions: number
          correct_count: number
          duration_seconds: number
          created_at: string
        }
        Insert: {
          user_id: string
          subject: string
          field: string | null
          is_weak_mode: boolean
          total_questions: number
          correct_count: number
          duration_seconds: number
        }
        Update: {
          user_id?: string
          subject?: string
          field?: string | null
          is_weak_mode?: boolean
          total_questions?: number
          correct_count?: number
          duration_seconds?: number
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          id: string
          session_id: string
          question_key: string
          selected_answer: number
          is_correct: boolean
        }
        Insert: {
          session_id: string
          question_key: string
          selected_answer: number
          is_correct: boolean
        }
        Update: {
          session_id?: string
          question_key?: string
          selected_answer?: number
          is_correct?: boolean
        }
        Relationships: []
      }
      item_links: {
        Row: {
          link_key: string
          url: string
          updated_at: string
        }
        Insert: {
          link_key: string
          url: string
          updated_at: string
        }
        Update: {
          link_key?: string
          url?: string
          updated_at?: string
        }
        Relationships: []
      }
      // -----------------------------------------------
      // 新規テーブル（STEP 2）
      // -----------------------------------------------
      problems: {
        Row: {
          id: string
          subject: 'securities' | 'finance' | 'market' | 'ethics'
          chapter_key: string
          chapter_name: string
          section_name: string | null
          question_no: string
          question_type: 'descriptive'
          points: number
          question_text: string
          hint_text: string | null
          answer_text: string
          explanation: string
          related_knowledge: string | null
          tags: string[]
          difficulty: 1 | 2 | 3
          source: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          subject: 'securities' | 'finance' | 'market' | 'ethics'
          chapter_key: string
          chapter_name: string
          section_name?: string | null
          question_no: string
          question_type?: 'descriptive'
          points?: number
          question_text: string
          hint_text?: string | null
          answer_text: string
          explanation: string
          related_knowledge?: string | null
          tags?: string[]
          difficulty?: 1 | 2 | 3
          source?: string | null
          display_order?: number
        }
        Update: {
          id?: string
          subject?: 'securities' | 'finance' | 'market' | 'ethics'
          chapter_key?: string
          chapter_name?: string
          section_name?: string | null
          question_no?: string
          question_type?: 'descriptive'
          points?: number
          question_text?: string
          hint_text?: string | null
          answer_text?: string
          explanation?: string
          related_knowledge?: string | null
          tags?: string[]
          difficulty?: 1 | 2 | 3
          source?: string | null
          display_order?: number
        }
        Relationships: []
      }
      problem_attempts: {
        Row: {
          id: string
          user_id: string
          problem_id: string
          result: 'correct' | 'partial' | 'incorrect'
          time_spent_sec: number | null
          attempted_at: string
        }
        Insert: {
          user_id: string
          problem_id: string
          result: 'correct' | 'partial' | 'incorrect'
          time_spent_sec?: number | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      import_logs: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_type: string
          total_count: number
          success_count: number
          error_count: number
          subject_breakdown: Record<string, number>
          imported_at: string
        }
        Insert: {
          user_id: string
          file_name: string
          file_type: string
          total_count: number
          success_count: number
          error_count: number
          subject_breakdown: Record<string, number>
        }
        Update: Record<string, never>
        Relationships: []
      }
      memos: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          body: string
        }
        Update: {
          title?: string
          body?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      problem_latest_results: {
        Row: {
          user_id: string
          problem_id: string
          latest_result: 'correct' | 'partial' | 'incorrect'
          attempt_count: number
          correct_count: number
          partial_count: number
          incorrect_count: number
          last_attempted_at: string
        }
        Relationships: []
      }
    }
    Functions: Record<never, never>
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
})
