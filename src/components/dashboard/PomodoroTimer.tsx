import { useState, useEffect, useRef, useCallback } from 'react'
import { PieChart, Pie, Cell } from 'recharts'

const MODES = {
  focus: { label: '集中', minutes: 25, ringColor: '#7c4dff', textColor: 'text-[#a78bfa]' },
  short: { label: '休憩', minutes: 5, ringColor: '#22c55e', textColor: 'text-green-400' },
  long: { label: '長休憩', minutes: 15, ringColor: '#3b82f6', textColor: 'text-blue-400' },
}

function playBeep(type: 'finish' | 'tick') {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'finish') {
      // 3回鳴らす
      const beeps = [0, 0.4, 0.8]
      beeps.forEach(offset => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g)
        g.connect(ctx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        g.gain.setValueAtTime(0.5, ctx.currentTime + offset)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.35)
      })
    } else {
      oscillator.frequency.value = 440
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.1)
    }
  } catch {
    // AudioContext非対応の場合は無視
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function sendNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.ico', silent: true })
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sets, setSets] = useState(0)
  const [notifGranted, setNotifGranted] = useState('Notification' in window && Notification.permission === 'granted')

  // バックグラウンド対応: 終了予定時刻を保持
  const endTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  // モード変更時にリセット
  useEffect(() => {
    setSeconds(MODES[mode].minutes * 60)
    setRunning(false)
    endTimeRef.current = null
  }, [mode])

  const handleFinish = useCallback(() => {
    setRunning(false)
    endTimeRef.current = null
    if (mode === 'focus') {
      setSets(n => n + 1)
      playBeep('finish')
      sendNotification('ポモドーロ完了！', '25分の集中お疲れ様でした。休憩しましょう。')
    } else {
      playBeep('finish')
      sendNotification('休憩終了', '次のセッションを始めましょう！')
    }
  }, [mode])

  // タイマーループ（timestamp基準）
  useEffect(() => {
    if (running) {
      // スタート時に終了予定時刻をセット
      if (endTimeRef.current === null) {
        endTimeRef.current = Date.now() + seconds * 1000
      }

      intervalRef.current = window.setInterval(() => {
        const remaining = Math.round((endTimeRef.current! - Date.now()) / 1000)
        if (remaining <= 0) {
          setSeconds(0)
          handleFinish()
        } else {
          setSeconds(remaining)
        }
      }, 500) // 500msで更新してズレを最小化
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      // 一時停止時は残り時間をリセットしてendTimeを破棄
      endTimeRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, handleFinish])

  const handleStart = async () => {
    if (!running && !notifGranted) {
      const granted = await requestNotificationPermission()
      setNotifGranted(granted)
    }
    // endTimeを現在の残り秒数から再計算
    endTimeRef.current = Date.now() + seconds * 1000
    setRunning(r => !r)
  }

  const handleReset = () => {
    setRunning(false)
    endTimeRef.current = null
    setSeconds(MODES[mode].minutes * 60)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const total = MODES[mode].minutes * 60
  const remainingPct = seconds / total

  const ringData = [
    { value: remainingPct * 100 },
    { value: (1 - remainingPct) * 100 },
  ]

  return (
    <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">ポモドーロタイマー</h2>
        {!notifGranted && (
          <button
            onClick={async () => {
              const granted = await requestNotificationPermission()
              setNotifGranted(granted)
            }}
            className="text-xs text-[#8888aa] hover:text-[#a78bfa] transition-colors"
            title="通知を許可する"
          >
            🔔 通知を許可
          </button>
        )}
      </div>

      {/* モード切替 */}
      <div className="flex gap-1 bg-[#111125] rounded-full p-1 mb-5 w-fit mx-auto">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs px-3 py-1 rounded-full transition-all ${
              mode === m
                ? 'bg-[#7c4dff] text-white font-medium'
                : 'text-[#8888aa] hover:text-[#c8c8e8]'
            }`}
          >
            {MODES[m].label}{MODES[m].minutes}分
          </button>
        ))}
      </div>

      {/* ドーナツリング */}
      <div className="relative w-48 h-48 mx-auto mb-4">
        <PieChart width={192} height={192} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={ringData}
            cx={96}
            cy={96}
            startAngle={90}
            endAngle={-270}
            innerRadius={72}
            outerRadius={86}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={false}
          >
            <Cell fill={MODES[mode].ringColor} />
            <Cell fill="#252540" />
          </Pie>
        </PieChart>
        {/* 中央テキスト */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-3xl font-bold tabular-nums ${MODES[mode].textColor}`}>
            {mm}:{ss}
          </span>
          <span className="text-xs text-[#8888aa] mt-1">{MODES[mode].label}</span>
        </div>
      </div>

      {/* セット数 */}
      <p className="text-xs text-[#8888aa] text-center mb-4">
        セット数：{sets} / 今日の累計 {sets * 25}分
      </p>

      {/* ボタン */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={handleStart}
          className="px-5 py-2 rounded-full bg-[#7c4dff] hover:bg-[#6c3dee] text-white text-sm font-medium transition-colors"
        >
          {running ? '一時停止' : 'スタート'}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-2 rounded-full border border-[#3a3a5c] text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#7c4dff] text-sm transition-colors"
        >
          リセット
        </button>
      </div>
    </div>
  )
}
