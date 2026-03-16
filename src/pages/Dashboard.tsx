import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PomodoroTimer from '../components/dashboard/PomodoroTimer'
import TodayTasks from '../components/dashboard/TodayTasks'
import ProgressSection from '../components/dashboard/ProgressSection'
import RecentHistory from '../components/dashboard/RecentHistory'
import { useStudyStore } from '../stores/studyStore'

export default function Dashboard() {
  const fetchRecords = useStudyStore(s => s.fetchRecords)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchRecords()
    setRefreshing(false)
  }

  return (
    <div className="bg-[#1a1a2e]">
      {/* 更新ボタン */}
      <div className="max-w-7xl mx-auto px-6 pt-4 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="データを更新"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#252540] disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          更新
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
          <ProgressSection />
        </div>
        <div className="flex flex-col gap-6">
          <TodayTasks />
          <PomodoroTimer />
        </div>
        <div className="hidden lg:flex flex-col gap-6">
          <RecentHistory />
        </div>
      </div>
    </div>
  )
}
