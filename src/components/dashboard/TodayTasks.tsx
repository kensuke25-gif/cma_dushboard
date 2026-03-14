import { useState } from 'react'
import { SUBJECTS } from './StudyRecordPanel'

type Task = {
  id: number
  title: string
  subject: string
  minutes: number
  done: boolean
}

const initialTasks: Task[] = [
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
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newSubject, setNewSubject] = useState<string>(SUBJECTS[0])
  const [newTitle, setNewTitle] = useState('')
  const [newMinutes, setNewMinutes] = useState('')

  const toggle = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return
    setTasks(prev => [...prev, {
      id: Date.now(),
      title: newTitle.trim(),
      subject: newSubject,
      minutes: parseInt(newMinutes) || 25,
      done: false,
    }])
    setNewTitle('')
    setNewMinutes('')
    setIsAddOpen(false)
  }

  const done = tasks.filter(t => t.done).length

  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">今日やること</h2>
        <button
          onClick={() => setIsAddOpen(true)}
          className="text-xs px-3 py-1 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors border border-zinc-600"
        >
          + 登録
        </button>
      </div>

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
            style={{ width: tasks.length > 0 ? `${(done / tasks.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* タスク追加モーダル */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-800 rounded-2xl border border-zinc-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">タスクを登録</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">科目</label>
                <select
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">内容</label>
                <textarea
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="例：DCFモデルの復習・問題演習10問"
                  rows={2}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">時間（分）</label>
                <input
                  type="number"
                  value={newMinutes}
                  onChange={e => setNewMinutes(e.target.value)}
                  placeholder="例：25"
                  min="1"
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors mt-1"
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
