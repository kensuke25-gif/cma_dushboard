import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Brain, LogOut } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const tabs = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/items', label: '項目', Icon: BookOpen, exact: false },
  { to: '/quiz', label: 'クイズ', Icon: Brain, exact: false },
]

export default function Layout() {
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const name = (user?.user_metadata?.full_name ?? user?.email ?? '') as string

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <header className="bg-[#111125] border-b border-[#2a2a4a]">
        {/* タイトル行 */}
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-white">証券アナリスト2次 学習ダッシュボード</h1>

          {/* ユーザー情報 + ログアウト */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8888aa] hidden sm:block truncate max-w-[160px]">{name}</span>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-8 h-8 rounded-full border border-[#3a3a5c] object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#252540] border border-[#3a3a5c] flex items-center justify-center text-xs text-[#8888aa]">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={signOut}
              title="ログアウト"
              className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
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
