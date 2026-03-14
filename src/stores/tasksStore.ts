import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type Task = {
  id: string
  title: string
  subject: string
  minutes: number
  done: boolean
  created_at?: string
}

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

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) set({ tasks: data as Task[] })
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
    if (!error && data) set(state => ({ tasks: [...state.tasks, data as Task] }))
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const newDone = !task.done
    // 楽観的更新
    set(state => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, done: newDone } : t) }))
    await supabase.from('tasks').update({ done: newDone }).eq('id', id)
  },

  saveTasks: async (updatedTasks) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const currentIds = get().tasks.map(t => t.id)
    const updatedIds = updatedTasks.map(t => t.id)

    // 削除対象
    const toDelete = currentIds.filter(id => !updatedIds.includes(id))
    if (toDelete.length > 0) {
      await supabase.from('tasks').delete().in('id', toDelete)
    }

    // 新規追加（id が uuid 形式でないものは新規）
    const uuidPattern = /^[0-9a-f-]{36}$/i
    const toAdd = updatedTasks.filter(t => !uuidPattern.test(t.id))
    const toUpdate = updatedTasks.filter(t => uuidPattern.test(t.id))

    if (toAdd.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .insert(toAdd.map(({ id: _id, ...rest }) => ({ ...rest, user_id: user.id })))
        .select()
      if (data) {
        const addedTasks = data as Task[]
        set({ tasks: [...toUpdate, ...addedTasks] })
        return
      }
    }

    // 既存タスクの更新
    await Promise.all(
      toUpdate.map(t => supabase.from('tasks').update({
        title: t.title, subject: t.subject, minutes: t.minutes, done: t.done
      }).eq('id', t.id))
    )

    set({ tasks: updatedTasks.filter(t => uuidPattern.test(t.id)) })
    // 再フェッチで状態を正規化
    await get().fetchTasks()
  },

  deleteTask: async (id) => {
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
    await supabase.from('tasks').delete().eq('id', id)
  },
}))
