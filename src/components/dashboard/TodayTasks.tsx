import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SUBJECTS, subjectBadgeColors } from './StudyRecordPanel'
import { useTasksStore, TASK_TYPES, DEFAULT_TASK_TYPE, type Task } from '../../stores/tasksStore'

type EditingTask = {
  id: string
  title: string
  subject: string
  task_type: string
  minutes: string
  done: boolean
}

const TASK_TYPE_COLORS: Record<string, string> = {
  '問題演習': 'bg-[#7c4dff]/20 text-[#a78bfa]',
  '過去問演習': 'bg-blue-900/30 text-blue-300',
  'クイズ': 'bg-teal-900/30 text-teal-300',
  'インプット': 'bg-orange-900/30 text-orange-300',
}

export default function TodayTasks() {
  const { tasks, loading, fetchTasks, toggleTask, saveTasks } = useTasksStore()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTasks, setEditingTasks] = useState<EditingTask[]>([])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const openEditModal = () => {
    setEditingTasks(tasks.map(t => ({ ...t, minutes: String(t.minutes) })))
    setIsEditOpen(true)
  }

  const handleEditChange = (id: string, field: keyof EditingTask, value: string) => {
    setEditingTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const handleDeleteEditing = (id: string) => {
    setEditingTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleAddNew = () => {
    setEditingTasks(prev => [...prev, {
      id: `new-${Date.now()}`,
      title: '',
      subject: SUBJECTS[0],
      task_type: DEFAULT_TASK_TYPE,
      minutes: '25',
      done: false,
    }])
  }

  const handleSave = async () => {
    const validTasks = editingTasks
      .filter(t => t.subject.trim())
      .map(t => ({ ...t, minutes: parseInt(t.minutes) || 25 } as Task))
    // saveTasks が新規(non-UUID id)・更新・削除をまとめて処理する
    await saveTasks(validTasks)
    setIsEditOpen(false)
  }

  const done = tasks.filter(t => t.done).length
  const totalMinutes = tasks.filter(t => !t.done).reduce((s, t) => s + t.minutes, 0)

  return (
    <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-4 sm:p-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">今日やること</h2>
          {tasks.length > 0 && (
            <p className="text-xs text-[#8888aa] mt-0.5">残り {totalMinutes}分</p>
          )}
        </div>
        <button
          onClick={openEditModal}
          className="text-xs px-3 py-1 rounded-full bg-[#252540] hover:bg-[#2a2a4a] text-[#8888aa] hover:text-[#c8c8e8] transition-colors border border-[#3a3a5c]"
        >
          編集
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-[#7c4dff] animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-[#8888aa] text-center py-6">
          タスクがありません。「編集」から追加してください。
        </p>
      ) : (
        /* ---- テーブル表示 ---- */
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[340px] text-xs">
            <thead>
              <tr className="border-b border-[#2a2a4a]">
                <th className="text-left pb-2 px-1 text-[#8888aa] font-medium w-6"></th>
                <th className="text-left pb-2 px-1 text-[#8888aa] font-medium">科目</th>
                <th className="text-left pb-2 px-1 text-[#8888aa] font-medium">内容</th>
                <th className="text-right pb-2 px-1 text-[#8888aa] font-medium w-10">分</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a4a]/50">
              {tasks.map(task => (
                <tr
                  key={task.id}
                  className={`transition-opacity ${task.done ? 'opacity-40' : ''}`}
                >
                  <td className="py-2 px-1">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                      className="w-4 h-4 accent-[#7c4dff] cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${subjectBadgeColors[task.subject] ?? 'bg-[#252540] text-[#8888aa]'}`}>
                      {task.subject}
                    </span>
                    {task.title && (
                      <p className={`text-[10px] mt-0.5 ${task.done ? 'line-through text-[#8888aa]' : 'text-[#8888aa]'}`}>
                        {task.title}
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-1">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${TASK_TYPE_COLORS[task.task_type] ?? 'bg-[#252540] text-[#8888aa]'}`}>
                      {task.task_type}
                    </span>
                  </td>
                  <td className="py-2 px-1 text-right text-[#8888aa] whitespace-nowrap">
                    {task.minutes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 進捗バー */}
      {tasks.length > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-[#8888aa] mb-1">
            <span>今日の達成率</span>
            <span>{done}/{tasks.length} 完了</span>
          </div>
          <div className="h-1.5 bg-[#252540] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7c4dff] rounded-full transition-all"
              style={{ width: `${(done / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ===== 編集モーダル ===== */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-[#1e1e3a] rounded-t-[24px] sm:rounded-[20px] border border-[#2a2a4a] p-5 shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col">

            {/* ドラッグハンドル（モバイル） */}
            <div className="sm:hidden w-10 h-1 bg-[#3a3a5c] rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">タスクを管理</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 列ヘッダー */}
            <div className="grid grid-cols-[1fr_1fr_52px_24px] gap-1.5 px-1 mb-1">
              <span className="text-[10px] text-[#8888aa]">科目</span>
              <span className="text-[10px] text-[#8888aa]">内容</span>
              <span className="text-[10px] text-[#8888aa] text-right">分</span>
              <span />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
              {editingTasks.map(task => (
                <div key={task.id} className="bg-[#252540] rounded-xl p-3 flex flex-col gap-2">
                  {/* Row 1: 科目 / 内容タイプ / 分 / 削除 */}
                  <div className="grid grid-cols-[1fr_1fr_52px_24px] gap-1.5 items-center">
                    <select
                      value={task.subject}
                      onChange={e => handleEditChange(task.id, 'subject', e.target.value)}
                      className="bg-[#1e1e3a] border border-[#3a3a5c] rounded-lg px-2 py-1.5 text-xs text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      value={task.task_type}
                      onChange={e => handleEditChange(task.id, 'task_type', e.target.value)}
                      className="bg-[#1e1e3a] border border-[#3a3a5c] rounded-lg px-2 py-1.5 text-xs text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] transition-colors"
                    >
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      type="number"
                      value={task.minutes}
                      onChange={e => handleEditChange(task.id, 'minutes', e.target.value)}
                      min="1"
                      className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-lg px-2 py-1.5 text-xs text-[#c8c8e8] focus:outline-none focus:border-[#7c4dff] text-right transition-colors"
                    />
                    <button
                      onClick={() => handleDeleteEditing(task.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-[#8888aa] hover:text-red-400 hover:bg-red-900/20 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Row 2: メモ（任意） */}
                  <input
                    type="text"
                    value={task.title}
                    onChange={e => handleEditChange(task.id, 'title', e.target.value)}
                    placeholder="メモ（任意）"
                    className="w-full bg-[#1e1e3a] border border-[#3a3a5c] rounded-lg px-3 py-1.5 text-xs text-[#c8c8e8] placeholder-[#8888aa]/60 focus:outline-none focus:border-[#7c4dff] transition-colors"
                  />
                </div>
              ))}
              <button
                onClick={handleAddNew}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#3a3a5c] text-xs text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#7c4dff] transition-colors"
              >
                + タスクを追加
              </button>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-[#7c4dff] hover:bg-[#6c3dee] text-white text-sm font-medium transition-colors"
            >
              保存する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
