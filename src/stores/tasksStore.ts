import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type Task = {
  id: string
  title: string       // メモ（任意）
  subject: string
  task_type: string   // 問題演習 / 過去問演習 / クイズ / インプット
  minutes: number
  done: boolean
  created_at?: string
}

// DB に task_type カラムが存在しない場合のデフォルト
export const DEFAULT_TASK_TYPE = '問題演習'
export const TASK_TYPES = ['問題演習', '過去問演習', 'クイズ', 'インプット'] as const

type NewTask = Omit<Task, 'id' | 'created_at'>

interface TasksState {
  tasks: Task[]
  loading: boolean
  fetchTasks: () => Promise<void>
  addTask: (task: NewTask) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  saveTasks: (tasks: Task[]) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    id:        raw.id as string,
    title:     (raw.title as string) ?? '',
    subject:   (raw.subject as string) ?? '',
    task_type: (raw.task_type as string) ?? DEFAULT_TASK_TYPE,
    minutes:   (raw.minutes as number) ?? 25,
    done:      (raw.done as boolean) ?? false,
    created_at: raw.created_at as string | undefined,
  }
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) set({ tasks: (data as Record<string, unknown>[]).map(normalizeTask) })
    set({ loading: false })
  },

  addTask: async (task) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id })
      .select()
      .single()
    if (!error && data) set(state => ({ tasks: [...state.tasks, normalizeTask(data as Record<string, unknown>)] }))
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const newDone = !task.done
    set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, done: newDone } : t) }))
    await supabase.from('tasks').update({ done: newDone }).eq('id', id)
  },

  saveTasks: async (updatedTasks) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const currentIds = get().tasks.map(t => t.id)
    const updatedIds = updatedTasks.map(t => t.id)

    const toDelete = currentIds.filter(id => !updatedIds.includes(id))
    if (toDelete.length > 0) {
      await supabase.from('tasks').delete().in('id', toDelete)
    }

    const uuidPattern = /^[0-9a-f-]{36}$/i
    const toAdd    = updatedTasks.filter(t => !uuidPattern.test(t.id))
    const toUpdate = updatedTasks.filter(t =>  uuidPattern.test(t.id))

    if (toAdd.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .insert(toAdd.map(({ id: _id, ...rest }) => ({ ...rest, user_id: user.id })))
        .select()
      if (data) {
        const addedTasks = (data as Record<string, unknown>[]).map(normalizeTask)
        set({ tasks: [...toUpdate, ...addedTasks] })
        return
      }
    }

    await Promise.all(
      toUpdate.map(t => supabase.from('tasks').update({
        title: t.title, subject: t.subject, task_type: t.task_type, minutes: t.minutes, done: t.done
      }).eq('id', t.id))
    )

    set({ tasks: updatedTasks.filter(t => uuidPattern.test(t.id)) })
    await get().fetchTasks()
  },

  deleteTask: async (id) => {
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
    await supabase.from('tasks').delete().eq('id', id)
  },
}))
