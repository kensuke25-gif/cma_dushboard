import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type StudyRecord = {
  id: string
  subject: string
  content: string
  minutes: number
  next_action: string
  recorded_at: string   // HH:MM
  date: string          // M/D
  created_at?: string
}

interface StudyState {
  records: StudyRecord[]
  weakItems: Set<number>
  loading: boolean
  fetchRecords: () => Promise<void>
  addRecord: (record: Omit<StudyRecord, 'id' | 'created_at'>) => Promise<void>
  updateRecord: (id: string, updates: Partial<Omit<StudyRecord, 'id' | 'created_at'>>) => Promise<void>
  fetchWeakItems: () => Promise<void>
  toggleWeakItem: (itemId: number) => Promise<void>
}

export const useStudyStore = create<StudyState>((set, get) => ({
  records: [],
  weakItems: new Set(),
  loading: false,

  fetchRecords: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('study_records')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) set({ records: data as StudyRecord[] })
    set({ loading: false })
  },

  addRecord: async (record) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('study_records')
      .insert({ ...record, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      set(state => ({ records: [data as StudyRecord, ...state.records] }))
    }
  },

  updateRecord: async (id, updates) => {
    const { error } = await supabase
      .from('study_records')
      .update(updates)
      .eq('id', id)
    if (!error) {
      set(state => ({
        records: state.records.map(r => r.id === id ? { ...r, ...updates } : r),
      }))
    }
  },

  fetchWeakItems: async () => {
    const { data, error } = await supabase
      .from('weak_items')
      .select('item_id')
    if (!error && data) {
      set({ weakItems: new Set(data.map((r: { item_id: number }) => r.item_id)) })
    }
  },

  toggleWeakItem: async (itemId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isWeak = get().weakItems.has(itemId)
    // 楽観的更新
    set(state => {
      const next = new Set(state.weakItems)
      isWeak ? next.delete(itemId) : next.add(itemId)
      return { weakItems: next }
    })

    if (isWeak) {
      await supabase.from('weak_items').delete()
        .eq('user_id', user.id).eq('item_id', itemId)
    } else {
      await supabase.from('weak_items').insert({ user_id: user.id, item_id: itemId })
    }
  },
}))
