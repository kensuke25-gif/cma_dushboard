import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PomodoroTimer from '../components/dashboard/PomodoroTimer'
import ProgressSection from '../components/dashboard/ProgressSection'
import RecentHistory from '../components/dashboard/RecentHistory'
import StreakBanner from '../components/problems/StreakBanner'
import GoalProgressPanel from '../components/dashboard/GoalProgressPanel'
import MemoPanel from '../components/dashboard/MemoPanel'
import WeaknessWidget from '../components/dashboard/WeaknessWidget'
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
    <div className="bg-[#1a1a2e] min-h-screen">
      {/* 更新ボタン */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 flex justify-end">
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

      {/* 学習目標パネル（フル幅） */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-4">
        <GoalProgressPanel />
      </div>

      {/* メインレイアウト
          - モバイル (< md): 1 列、全セクション縦積み
          - タブレット (md〜xl): 2 列、RecentHistory は下段フル幅
          - デスクトップ (xl+): 3 列横並び
      */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4
                      grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3
                      gap-4 sm:gap-5 xl:gap-6">
        {/* 列 1: 学習統計 */}
        <div className="flex flex-col gap-4 sm:gap-5">
          <StreakBanner />
          <WeaknessWidget />
          <ProgressSection />
        </div>

        {/* 列 2: ポモドーロ＋メモ */}
        <div className="flex flex-col gap-4 sm:gap-5">
          <PomodoroTimer />
          <MemoPanel />
        </div>

        {/* 列 3: 最近の記録
            タブレット: 2 列を占める（フル幅）
            デスクトップ: 通常の 1 列 */}
        <div className="md:col-span-2 xl:col-span-1 flex flex-col gap-4 sm:gap-5">
          <RecentHistory />
        </div>
      </div>
    </div>
  )
}
