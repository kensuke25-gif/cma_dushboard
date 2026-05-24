import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type ItemMemo = {
  id: string
  user_id: string
  item_id: number
  title: string
  body: string
  created_at: string
  updated_at: string
}

interface ItemMemoState {
  // item_id -> memos[]
  memosByItem: Record<number, ItemMemo[]>
  loadingItems: Set<number>
  fetchItemMemos: (itemId: number) => Promise<void>
  addItemMemo: (itemId: number, title: string, body: string) => Promise<void>
  updateItemMemo: (id: string, itemId: number, title: string, body: string) => Promise<void>
  deleteItemMemo: (id: string, itemId: number) => Promise<void>
}

export const useItemMemoStore = create<ItemMemoState>((set, get) => ({
  memosByItem: {},
  loadingItems: new Set(),

  fetchItemMemos: async (itemId) => {
    const { loadingItems } = get()
    if (loadingItems.has(itemId)) return
    set(s => ({ loadingItems: new Set([...s.loadingItems, itemId]) }))
    const { data } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('item_memos' as any)
      .select('*')
      .eq('item_id', itemId)
      .order('updated_at', { ascending: false })
    set(s => ({
      memosByItem: { ...s.memosByItem, [itemId]: (data ?? []) as unknown as ItemMemo[] },
      loadingItems: new Set([...s.loadingItems].filter(id => id !== itemId)),
    }))
  },

  addItemMemo: async (itemId, title, body) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('item_memos' as any)
      .insert({ user_id: user.id, item_id: itemId, title, body })
      .select()
      .single()
    if (error) throw new Error(error.message)
    set(s => ({
      memosByItem: {
        ...s.memosByItem,
        [itemId]: [data as unknown as ItemMemo, ...(s.memosByItem[itemId] ?? [])],
      },
    }))
  },

  updateItemMemo: async (id, itemId, title, body) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('item_memos' as any)
      .update({ title, body, updated_at: now })
      .eq('id', id)
    if (error) throw new Error(error.message)
    set(s => ({
      memosByItem: {
        ...s.memosByItem,
        [itemId]: (s.memosByItem[itemId] ?? []).map(m =>
          m.id === id ? { ...m, title, body, updated_at: now } : m
        ),
      },
    }))
  },

  deleteItemMemo: async (id, itemId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('item_memos' as any).delete().eq('id', id)
    set(s => ({
      memosByItem: {
        ...s.memosByItem,
        [itemId]: (s.memosByItem[itemId] ?? []).filter(m => m.id !== id),
      },
    }))
  },
}))
