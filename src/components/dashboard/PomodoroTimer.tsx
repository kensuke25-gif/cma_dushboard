import { useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell } from 'recharts'

const MODES = {
  focus: { label: '集中', minutes: 25, ringColor: '#f97316', textColor: 'text-orange-400' },
  short: { label: '休憩', minutes: 5, ringColor: '#22c55e', textColor: 'text-green-400' },
  long: { label: '長休憩', minutes: 15, ringColor: '#3b82f6', textColor: 'text-blue-400' },
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
  const remainingPct = seconds / total

  const ringData = [
    { value: remainingPct * 100 },
    { value: (1 - remainingPct) * 100 },
  ]

  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">ポモドーロタイマー</h2>

      {/* モード切替 */}
      <div className="flex gap-2 mb-5">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              mode === m
                ? 'bg-orange-500 text-white border-orange-500'
                : 'text-zinc-500 border-zinc-600 hover:border-zinc-400'
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
            <Cell fill="#3f3f46" />
          </Pie>
        </PieChart>
        {/* 中央テキスト */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-3xl font-bold tabular-nums ${MODES[mode].textColor}`}>
            {mm}:{ss}
          </span>
          <span className="text-xs text-zinc-500 mt-1">{MODES[mode].label}</span>
        </div>
      </div>

      {/* セット数 */}
      <p className="text-xs text-zinc-500 text-center mb-4">
        セット数：{sets} / 今日の累計 {sets * 25}分
      </p>

      {/* ボタン */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setRunning(r => !r)}
          className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
        >
          {running ? '一時停止' : 'スタート'}
        </button>
        <button
          onClick={() => { setRunning(false); setSeconds(MODES[mode].minutes * 60) }}
          className="px-5 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-sm transition-colors"
        >
          リセット
        </button>
      </div>
    </div>
  )
}
