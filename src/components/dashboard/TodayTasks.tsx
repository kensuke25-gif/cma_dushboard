import { useState } from 'react'
import { SUBJECTS, subjectBadgeColors } from './StudyRecordPanel'

type Task = {
  id: number
  title: string
  subject: string
  minutes: number
  done: boolean
}

type EditingTask = {
  id: number
  title: string
  subject: string
  minutes: string
  done: boolean
}

const initialTasks: Task[] = [
  { id: 1, title: '証券分析：株式評価モデル（DCF）復習', subject: '証券分析', minutes: 25, done: false },
  { id: 2, title: '財務諸表分析：ROE分解 問題演習10問', subject: '財務分析', minutes: 25, done: false },
  { id: 3, title: '市場分析：金利と債券価格の関係確認', subject: '市場分析', minutes: 25, done: false },
]

export default function TodayTasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTasks, setEditingTasks] = useState<EditingTask[]>([])

  const toggle = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const openEditModal = () => {
    setEditingTasks(tasks.map(t => ({ ...t, minutes: String(t.minutes) })))
    setIsEditOpen(true)
  }

  const handleEditChange = (id: number, field: keyof EditingTask, value: string) => {
    setEditingTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const handleDeleteEditing = (id: number) => {
    setEditingTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleAddNew = () => {
    setEditingTasks(prev => [...prev, {
      id: Date.now(), title: '', subject: SUBJECTS[0], minutes: '25', done: false
    }])
  }

  const handleSave = () => {
    setTasks(editingTasks
      .filter(t => t.title.trim())
      .map(t => ({ ...t, title: t.title.trim(), minutes: parseInt(t.minutes) || 25 }))
    )
    setIsEditOpen(false)
  }

  const done = tasks.filter(t => t.done).length

  return (
    <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">今日やること</h2>
        <button
          onClick={openEditModal}
          className="text-xs px-3 py-1 rounded-full bg-[#252540] hover:bg-[#2a2a4a] text-[#8888aa] hover:text-[#c8c8e8] transition-colors border border-[#3a3a5c]"
        >
          編集
        </button>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggle(task.id)}
              className="mt-1 w-4 h-4 accent-[#7c4dff] cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm ${task.done ? 'line-through text-[#8888aa]' : 'text-[#c8c8e8]'}`}>
                {task.title}
              </p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${subjectBadgeColors[task.subject] ?? 'bg-[#252540] text-[#8888aa]'}`}>
                  {task.subject}
                </span>
                <span className="text-xs text-[#8888aa]">{task.minutes}分</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-[#8888aa] mb-1">
          <span>今日の達成率</span>
          <span>{done}/{tasks.length} 完了</span>
        </div>
        <div className="h-1.5 bg-[#252540] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7c4dff] rounded-full transition-all"
            style={{ width: tasks.length > 0 ? `${(done / tasks.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* タスク管理モーダル */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">タスクを管理</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* タスクリスト */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-4">
              {editingTasks.map((task, index) => (
                <div key={task.id} className="bg-[#252540] rounded-[20px] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-[#8888aa] w-5 text-center">{index + 1}</span>
                    <select
                      value={task.subject}
                      onChange={e => handleEditChange(task.id, 'subject', e.target.value)}
                      className="flex-1 bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-2 py-1.5 text-xs text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => handleDeleteEditing(task.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-[#8888aa] hover:text-red-400 hover:bg-red-900/20 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={task.title}
                    onChange={e => handleEditChange(task.id, 'title', e.target.value)}
                    placeholder="タスクの内容を入力"
                    className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-3 py-2 text-sm text-[#c8c8e8] placeholder-[#8888aa] focus:outline-none focus:border-[#7c4dff] transition-colors mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={task.minutes}
                      onChange={e => handleEditChange(task.id, 'minutes', e.target.value)}
                      min="1"
                      className="w-20 bg-[#1e1e3a] border border-[#3a3a5c] rounded-xl px-3 py-2 text-sm text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
                    />
                    <span className="text-xs text-[#8888aa]">分</span>
                  </div>
                </div>
              ))}

              {/* タスク追加ボタン */}
              <button
                onClick={handleAddNew}
                className="w-full py-3 rounded-[20px] border border-dashed border-[#3a3a5c] text-xs text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#7c4dff] transition-colors"
              >
                + タスクを追加
              </button>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-[20px] bg-[#7c4dff] hover:bg-[#6c3dee] text-white text-sm font-medium transition-colors"
            >
              保存する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
