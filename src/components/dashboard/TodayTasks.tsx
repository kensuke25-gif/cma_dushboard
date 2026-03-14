import { useState } from 'react'

const initialTasks = [
  { id: 1, title: '証券分析：株式評価モデル（DCF）復習', subject: '証券分析', minutes: 25, done: false },
  { id: 2, title: '財務諸表分析：ROE分解 問題演習10問', subject: '財務分析', minutes: 25, done: false },
  { id: 3, title: '市場分析：金利と債券価格の関係確認', subject: '市場分析', minutes: 25, done: false },
]

const subjectColors: Record<string, string> = {
  '証券分析': 'bg-blue-900/50 text-blue-300',
  '財務分析': 'bg-orange-900/50 text-orange-300',
  '市場分析': 'bg-violet-900/50 text-violet-300',
  '職業行為・倫理基準': 'bg-teal-900/50 text-teal-300',
}

export default function TodayTasks() {
  const [tasks, setTasks] = useState(initialTasks)

  const toggle = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const done = tasks.filter(t => t.done).length

  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">今日やること</h2>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggle(task.id)}
              className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm ${task.done ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>
                {task.title}
              </p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${subjectColors[task.subject] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {task.subject}
                </span>
                <span className="text-xs text-zinc-500">{task.minutes}分</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>今日の達成率</span>
          <span>{done}/{tasks.length} 完了</span>
        </div>
        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
