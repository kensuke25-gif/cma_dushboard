import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MODES = {
  focus: { label: '集中', minutes: 25, ringColor: '#7c4dff', textColor: 'text-[#a78bfa]' },
  short: { label: '休憩', minutes: 5, ringColor: '#22c55e', textColor: 'text-green-400' },
  long: { label: '長休憩', minutes: 15, ringColor: '#3b82f6', textColor: 'text-blue-400' },
}
export type PomodoroMode = 'focus' | 'short' | 'long'

interface PomodoroState {
  mode: PomodoroMode
  seconds: number
  running: boolean
  sets: number
  endTime: number | null
  setMode: (mode: PomodoroMode) => void
  startToggle: () => void
  reset: () => void
  tick: () => void
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: 'focus',
      seconds: 25 * 60,
      running: false,
      sets: 0,
      endTime: null,

      setMode: (mode) =>
        set({ mode, seconds: MODES[mode].minutes * 60, running: false, endTime: null }),

      startToggle: () => {
        const { running, seconds } = get()
        if (!running) {
          set({ running: true, endTime: Date.now() + seconds * 1000 })
        } else {
          set({ running: false, endTime: null })
        }
      },

      reset: () => {
        const { mode } = get()
        set({ running: false, seconds: MODES[mode].minutes * 60, endTime: null })
      },

      tick: () => {
        const { endTime, running, mode } = get()
        if (!running || endTime === null) return
        const remaining = Math.round((endTime - Date.now()) / 1000)
        if (remaining <= 0) {
          set({ running: false, endTime: null, seconds: 0 })
          if (mode === 'focus') set(s => ({ sets: s.sets + 1 }))
          _finishCallback?.(mode)
        } else {
          set({ seconds: remaining })
        }
      },
    }),
    {
      name: 'pomodoro-v1',
      onRehydrateStorage: () => (state) => {
        // アプリが閉じている間に終了時刻を過ぎていた場合はリセット
        if (state?.running && state.endTime !== null && state.endTime < Date.now()) {
          state.running = false
          state.endTime = null
          state.seconds = 0
        }
      },
    }
  )
)

// Layout からタイマー終了時のサイドエフェクト（音・通知）を登録する
let _finishCallback: ((mode: PomodoroMode) => void) | null = null
export function registerFinishCallback(fn: (mode: PomodoroMode) => void) {
  _finishCallback = fn
}
