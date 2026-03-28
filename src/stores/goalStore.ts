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

      // user_goals は Supabase 生成型に未登録のため any 経由でアクセス
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('user_goals')
        .select('*').eq('user_id', user.id).single() as { data: Record<string, unknown> | null }

      if (data) {
        set({
          goals: {
            examDate: (data.exam_date as string) ?? DEFAULTS.examDate,
            examTotalHours: (data.exam_total_hours as number) ?? DEFAULTS.examTotalHours,
            monthlyHours: (data.monthly_hours as number) ?? DEFAULTS.monthlyHours,
            weeklyHours: (data.weekly_hours as number) ?? DEFAULTS.weeklyHours,
            dailyMinutes: (data.daily_minutes as number) ?? DEFAULTS.dailyMinutes,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('user_goals').upsert({
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
