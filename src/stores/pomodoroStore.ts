import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MODES = {
  focus: { label: '集中', minutes: 25, ringColor: '#7c4dff', textColor: 'text-[#a78bfa]' },
  short: { label: '休憩', minutes: 5, ringColor: '#22c55e', textColor: 'text-green-400' },
  long: { label: '長休憩', minutes: 15, ringColor: '#3b82f6', textColor: 'text-blue-400' },
}
export type PomodoroMode = 'focus' | 'short' | 'long'

const todayStr = () => new Date().toISOString().slice(0, 10)

interface PomodoroState {
  mode: PomodoroMode
  seconds: number
  running: boolean
  sets: number
  setsDate: string            // セット数の基準日 "YYYY-MM-DD"
  endTime: number | null
  overtime: number            // タイマー終了後のストップウォッチ経過秒数
  overtimeRunning: boolean    // ストップウォッチ動作中フラグ
  overtimeStartTime: number | null  // ストップウォッチ開始時刻 (ms)
  setMode: (mode: PomodoroMode) => void
  startToggle: () => void
  stopOvertime: () => void
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
      setsDate: todayStr(),
      endTime: null,
      overtime: 0,
      overtimeRunning: false,
      overtimeStartTime: null,

      setMode: (mode) =>
        set({
          mode,
          seconds: MODES[mode].minutes * 60,
          running: false,
          endTime: null,
          overtime: 0,
          overtimeRunning: false,
          overtimeStartTime: null,
        }),

      startToggle: () => {
        const { running, seconds, overtimeRunning } = get()
        // オーバータイム中はスタートトグル無効（専用の stopOvertime を使う）
        if (overtimeRunning) return
        if (!running) {
          set({ running: true, endTime: Date.now() + seconds * 1000 })
        } else {
          set({ running: false, endTime: null })
        }
      },

      stopOvertime: () => {
        set({ overtimeRunning: false, overtimeStartTime: null })
      },

      reset: () => {
        const { mode } = get()
        set({
          running: false,
          seconds: MODES[mode].minutes * 60,
          endTime: null,
          overtime: 0,
          overtimeRunning: false,
          overtimeStartTime: null,
        })
      },

      tick: () => {
        const { endTime, running, mode, overtimeRunning, overtimeStartTime } = get()

        // 日付チェック: 日付が変わったらセット数をリセット
        const today = todayStr()
        if (get().setsDate !== today) {
          set({ sets: 0, setsDate: today })
        }

        // オーバータイム (ストップウォッチ) のカウントアップ
        if (overtimeRunning && overtimeStartTime !== null) {
          const elapsed = Math.round((Date.now() - overtimeStartTime) / 1000)
          set({ overtime: elapsed })
          return
        }

        if (!running || endTime === null) return
        const remaining = Math.round((endTime - Date.now()) / 1000)
        if (remaining <= 0) {
          if (mode === 'focus') {
            // 集中モード終了 → ストップウォッチ開始 & セット数カウント
            const now = todayStr()
            set(s => ({
              running: false,
              endTime: null,
              seconds: 0,
              overtimeRunning: true,
              overtimeStartTime: Date.now(),
              overtime: 0,
              sets: s.setsDate === now ? s.sets + 1 : 1,
              setsDate: now,
            }))
          } else {
            // 休憩モード終了 → 通常終了（ストップウォッチなし）
            set({ running: false, endTime: null, seconds: 0 })
          }
          _finishCallback?.(mode)
        } else {
          set({ seconds: remaining })
        }
      },
    }),
    {
      name: 'pomodoro-v1',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // アプリが閉じている間に終了時刻を過ぎていた場合はリセット
        if (state.running && state.endTime !== null && state.endTime < Date.now()) {
          state.running = false
          state.endTime = null
          state.seconds = 0
        }
        // オーバータイム中だった場合は経過秒数を再計算
        if (state.overtimeRunning && state.overtimeStartTime !== null) {
          state.overtime = Math.round((Date.now() - state.overtimeStartTime) / 1000)
        }
        // 日付が変わっていたらセット数をリセット
        const today = new Date().toISOString().slice(0, 10)
        if (state.setsDate !== today) {
          state.sets = 0
          state.setsDate = today
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
