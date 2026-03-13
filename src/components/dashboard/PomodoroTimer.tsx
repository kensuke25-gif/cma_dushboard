import { useState, useEffect, useRef } from 'react'

const MODES = {
  focus: { label: '集中', minutes: 25, color: 'text-orange-500' },
  short: { label: '休憩', minutes: 5, color: 'text-green-500' },
  long: { label: '長休憩', minutes: 15, color: 'text-blue-500' },
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sets, setSets] = useState(0)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    setSeconds(MODES[mode].minutes * 60)
    setRunning(false)
  }, [mode])

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setRunning(false)
            if (mode === 'focus') setSets(n => n + 1)
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const total = MODES[mode].minutes * 60
  const pct = ((total - seconds) / total) * 100

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">ポモドーロタイマー</h2>
      <div className="flex gap-2 mb-4">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${mode === m ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-500 border-gray-200'}`}
          >
            {MODES[m].label}{MODES[m].minutes}分
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-semibold tabular-nums ${MODES[mode].color}`}>
          {mm}:{ss}
        </div>
        <div className="flex-1">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">セット数：{sets} / 今日の累計 {sets * 25}分</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setRunning(r => !r)}
          className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-sm font-medium"
        >
          {running ? '一時停止' : 'スタート'}
        </button>
        <button
          onClick={() => { setRunning(false); setSeconds(MODES[mode].minutes * 60) }}
          className="px-4 py-1.5 rounded-full border border-gray-200 text-gray-500 text-sm"
        >
          リセット
        </button>
      </div>
    </div>
  )
}