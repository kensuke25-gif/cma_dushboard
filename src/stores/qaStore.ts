// Wireframe phase: localStorage-backed store. Swap to Supabase in next phase.
import { create } from 'zustand'

export type QAItem = {
  id: string
  question: string
  answer: string
  subject: string
  unit: string
  created_at: string
  updated_at: string
}

export type QAHistory = {
  id: string
  qa_id: string
  result: 'correct' | 'wrong'
  answered_at: string
}

const ITEMS_KEY = 'cma-qa-items'
const HIST_KEY = 'cma-qa-history'

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}
function save<T>(key: string, value: T[]) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface QAState {
  items: QAItem[]
  history: QAHistory[]
  initialize: () => void
  addItem: (input: Pick<QAItem, 'question' | 'answer' | 'subject' | 'unit'>) => QAItem
  updateItem: (id: string, patch: Partial<QAItem>) => void
  deleteItem: (id: string) => void
  recordAnswer: (qaId: string, result: 'correct' | 'wrong') => void
}

export const useQAStore = create<QAState>((set, get) => ({
  items: [],
  history: [],

  initialize: () => {
    set({ items: load<QAItem>(ITEMS_KEY), history: load<QAHistory>(HIST_KEY) })
  },

  addItem: (input) => {
    const now = new Date().toISOString()
    const item: QAItem = { id: uid(), ...input, created_at: now, updated_at: now }
    const items = [item, ...get().items]
    save(ITEMS_KEY, items)
    set({ items })
    return item
  },

  updateItem: (id, patch) => {
    const items = get().items.map(it =>
      it.id === id ? { ...it, ...patch, updated_at: new Date().toISOString() } : it
    )
    save(ITEMS_KEY, items)
    set({ items })
  },

  deleteItem: (id) => {
    const items = get().items.filter(it => it.id !== id)
    const history = get().history.filter(h => h.qa_id !== id)
    save(ITEMS_KEY, items)
    save(HIST_KEY, history)
    set({ items, history })
  },

  recordAnswer: (qaId, result) => {
    const entry: QAHistory = { id: uid(), qa_id: qaId, result, answered_at: new Date().toISOString() }
    const history = [entry, ...get().history]
    save(HIST_KEY, history)
    set({ history })
  },
}))
