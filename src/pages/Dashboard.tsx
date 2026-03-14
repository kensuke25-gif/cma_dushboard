import { useEffect } from 'react'
import PomodoroTimer from '../components/dashboard/PomodoroTimer'
import TodayTasks from '../components/dashboard/TodayTasks'
import ProgressSection from '../components/dashboard/ProgressSection'
import RecentHistory from '../components/dashboard/RecentHistory'
import { useStudyStore } from '../stores/studyStore'

export default function Dashboard() {
  const fetchRecords = useStudyStore(s => s.fetchRecords)

  useEffect(() => { fetchRecords() }, [fetchRecords])

  return (
    <div className="bg-[#1a1a2e]">
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
