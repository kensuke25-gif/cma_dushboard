import { useState } from 'react'

const initialTasks = [
  { id: 1, title: '証券分析：株式評価モデル（DCF）復習', subject: '証券分析', minutes: 25, done: false },
  { id: 2, title: '財務諸表分析：ROE分解 問題演習10問', subject: '財務分析', minutes: 25, done: false },
  { id: 3, title: 'コーポレートファイナンス：WACC確認', subject: 'CF', minutes: 25, done: false },
]

const subjectColors: Record<string, string> = {
  '証券分析': 'bg-blue-100 text-blue-700',
  '財務分析': 'bg-orange-100 text-orange-700',
  'CF': 'bg-green-100 text-green-700',
  '経済': 'bg-red-100 text-red-700',
}

export default function TodayTasks() {
  const [tasks, setTasks] = useState(initialTasks)

  const toggle = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const done = tasks.filter(t => t.done).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">今日やること</h2>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggle(task.id)}
              className="mt-1 w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {task.title}
              </p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${subjectColors[task.subject]}`}>
                  {task.subject}
                </span>
                <span className="text-xs text-gray-400">{task.minutes}分</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>今日の達成率</span>
          <span>{done}/{tasks.length} 完了</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-400 rounded-full transition-all"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
