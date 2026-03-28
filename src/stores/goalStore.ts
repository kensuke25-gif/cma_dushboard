import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface UserGoals {
  examDate: string       // "YYYY-MM-DD"
  examTotalHours: number
  monthlyHours: number
  weeklyHours: number
  dailyMinutes: number
}

const DEFAULTS: UserGoals = {
  examDate: '2026-06-07',
  examTotalHours: 500,
  monthlyHours: 40,
  weeklyHours: 10,
  dailyMinutes: 120,
}

interface GoalState {
  goals: UserGoals
  loading: boolean
  saving: boolean
  fetchGoals: () => Promise<void>
  saveGoals: (goals: UserGoals) => Promise<void>
}

export const useGoalStore = create<GoalState>((set) => ({
  goals: { ...DEFAULTS },
  loading: false,
  saving: false,

  fetchGoals: async () => {
    set({ loading: true })
    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) return

      const { data } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        set({
          goals: {
            examDate: data.exam_date ?? DEFAULTS.examDate,
            examTotalHours: data.exam_total_hours ?? DEFAULTS.examTotalHours,
            monthlyHours: data.monthly_hours ?? DEFAULTS.monthlyHours,
            weeklyHours: data.weekly_hours ?? DEFAULTS.weeklyHours,
            dailyMinutes: data.daily_minutes ?? DEFAULTS.dailyMinutes,
          },
        })
      }
    } catch (e) {
      console.error('[goalStore] fetchGoals error:', e)
    } finally {
      set({ loading: false })
    }
  },

  saveGoals: async (goals) => {
    set({ saving: true })
    try {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return

    await supabase.from('user_goals').upsert({
      user_id: user.id,
      exam_date: goals.examDate,
      exam_total_hours: goals.examTotalHours,
      monthly_hours: goals.monthlyHours,
      weekly_hours: goals.weeklyHours,
      daily_minutes: goals.dailyMinutes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    set({ goals })
    } catch (e) {
      console.error('[goalStore] saveGoals error:', e)
    } finally {
      set({ saving: false })
    }
  },
}))
