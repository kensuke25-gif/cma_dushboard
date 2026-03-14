import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/items', label: '項目', Icon: BookOpen, exact: false },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <header className="bg-[#111125] border-b border-[#2a2a4a]">
        {/* タイトル行 */}
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-white">証券アナリスト2次 学習ダッシュボード</h1>
          <span className="text-sm text-[#7c4dff] font-medium">試験まで残87日</span>
        </div>

        {/* タブ行 */}
        <nav className="max-w-7xl mx-auto px-6 flex gap-0">
          {tabs.map(({ to, label, Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-5 py-3 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#7c4dff] text-white'
                    : 'border-transparent text-[#8888aa] hover:text-[#c8c8e8]'
                }`
              }
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
