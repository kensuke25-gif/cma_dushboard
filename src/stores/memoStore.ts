import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type Memo = {
  id: string
  user_id: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

interface MemoState {
  memos: Memo[]
  loading: boolean
  fetchMemos: () => Promise<void>
  addMemo: (title: string, body: string) => Promise<void>
  updateMemo: (id: string, title: string, body: string) => Promise<void>
  deleteMemo: (id: string) => Promise<void>
}

export const useMemoStore = create<MemoState>((set) => ({
  memos: [],
  loading: false,

  fetchMemos: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('memos')
      .select('*')
      .order('updated_at', { ascending: false })
    set({ memos: (data ?? []) as Memo[], loading: false })
  },

  addMemo: async (title, body) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('memos')
      .insert({ user_id: user.id, title, body })
      .select()
      .single()
    if (error) throw new Error(error.message)
    set(state => ({ memos: [data as Memo, ...state.memos] }))
  },

  updateMemo: async (id, title, body) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('memos')
      .update({ title, body, updated_at: now })
      .eq('id', id)
    if (error) throw new Error(error.message)
    set(state => ({
      memos: state.memos.map(m =>
        m.id === id ? { ...m, title, body, updated_at: now } : m
      ),
    }))
  },

  deleteMemo: async (id) => {
    await supabase.from('memos').delete().eq('id', id)
    set(state => ({ memos: state.memos.filter(m => m.id !== id) }))
  },
}))
