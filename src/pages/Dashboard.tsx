import { useState } from 'react'
import PomodoroTimer from '../components/dashboard/PomodoroTimer'
import TodayTasks from '../components/dashboard/TodayTasks'
import ProgressSection from '../components/dashboard/ProgressSection'
import RecentHistory from '../components/dashboard/RecentHistory'
import { type StudyRecord } from '../components/dashboard/StudyRecordPanel'

export default function Dashboard() {
  const [records, setRecords] = useState<StudyRecord[]>([])

  const handleSaveRecord = (record: StudyRecord) => {
    setRecords(prev => [record, ...prev])
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <header className="bg-[#111125] border-b border-[#2a2a4a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold text-white">証券アナリスト2次 学習ダッシュボード</h1>
          <span className="text-sm text-[#7c4dff] font-medium">試験まで残87日</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
          <ProgressSection records={records} onSaveRecord={handleSaveRecord} />
        </div>
        <div className="flex flex-col gap-6">
          <TodayTasks />
          <PomodoroTimer />
        </div>
        <div className="hidden lg:flex flex-col gap-6">
          <RecentHistory records={records} />
        </div>
      </main>
    </div>
  )
}
