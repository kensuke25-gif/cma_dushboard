import PomodoroTimer from '../components/dashboard/PomodoroTimer'
import TodayTasks from '../components/dashboard/TodayTasks'
import ProgressSection from '../components/dashboard/ProgressSection'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold text-white">証券アナリスト2次 学習ダッシュボード</h1>
          <span className="text-sm text-orange-400 font-medium">試験まで残87日</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <ProgressSection />
        </div>
        <div className="flex flex-col gap-6">
          <TodayTasks />
          <PomodoroTimer />
        </div>
      </main>
    </div>
  )
}
