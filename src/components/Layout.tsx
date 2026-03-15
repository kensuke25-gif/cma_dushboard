import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Brain, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePomodoroStore, MODES, registerFinishCallback, type PomodoroMode } from '../stores/pomodoroStore'

const tabs = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/items', label: '項目', Icon: BookOpen, exact: false },
  { to: '/quiz', label: 'クイズ', Icon: Brain, exact: false },
]

// ---- 音・通知（PomodoroTimer から移動） ----

function playBeep() {
  try {
    const ctx = new AudioContext()
    const beeps = [0, 0.4, 0.8]
    beeps.forEach(offset => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      g.gain.setValueAtTime(0.5, ctx.currentTime + offset)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.35)
    })
  } catch { /* AudioContext 非対応は無視 */ }
}

function sendNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.ico', silent: true })
}

// ----

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const { running, tick, mode, seconds } = usePomodoroStore()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const name = (user?.user_metadata?.full_name ?? user?.email ?? '') as string

  // タイマー終了時コールバックを登録（初回のみ）
  useEffect(() => {
    registerFinishCallback((finishedMode: PomodoroMode) => {
      playBeep()
      if (finishedMode === 'focus') {
        sendNotification('ポモドーロ完了！', '25分の集中お疲れ様でした。休憩しましょう。')
      } else {
        sendNotification('休憩終了', '次のセッションを始めましょう！')
      }
    })
  }, [])

  // グローバルタイマーインターバル — ページ移動中も動き続ける
  const stableTick = useCallback(tick, [tick])
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(stableTick, 500)
    return () => clearInterval(id)
  }, [running, stableTick])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-[#1a1a2e]">

      {/* ========== サイドバー ========== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[220px]
          bg-[#111125] border-r border-[#2a2a4a]
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* タイトル（ホームへのリンク） */}
        <NavLink
          to="/"
          end
          onClick={closeSidebar}
          className="flex items-center gap-2 px-5 py-5 border-b border-[#2a2a4a] hover:bg-[#1a1a3a] transition-colors"
        >
          <span className="text-sm font-bold text-white leading-tight">
            証券アナリスト2次<br />
            <span className="text-[#a78bfa] font-semibold text-xs">学習ダッシュボード</span>
          </span>
        </NavLink>

        {/* モバイル: 閉じるボタン */}
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors md:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ナビゲーション */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {tabs.map(({ to, label, Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-[#7c4dff]/20 text-white'
                    : 'text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#1a1a3a]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="w-5 h-5 shrink-0"
                    strokeWidth={1.5}
                    style={isActive ? { color: '#a78bfa' } : undefined}
                  />
                  <span className="text-sm font-medium">{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7c4dff]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ミニタイマー（実行中のみ表示） */}
        {running && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-[#1e1e3a] border border-[#2a2a4a]">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: MODES[mode].ringColor }}
              />
              <span className={`text-sm font-bold tabular-nums ${MODES[mode].textColor}`}>
                {mm}:{ss}
              </span>
              <span className="text-xs text-[#8888aa] ml-auto">{MODES[mode].label}</span>
            </div>
          </div>
        )}

        {/* ユーザー情報 + ログアウト */}
        <div className="border-t border-[#2a2a4a] px-4 py-3 flex items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-7 h-7 rounded-full border border-[#3a3a5c] object-cover shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#252540] border border-[#3a3a5c] flex items-center justify-center text-xs text-[#8888aa] shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-[#8888aa] flex-1 truncate">{name}</span>
          <button
            onClick={signOut}
            title="ログアウト"
            className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* モバイル: オーバーレイ背景 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ========== メインエリア ========== */}
      <div className="md:pl-[220px] flex flex-col min-h-screen">

        {/* モバイル用スティッキートップバー */}
        <header className="md:hidden sticky top-0 z-30 bg-[#111125] border-b border-[#2a2a4a] px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <NavLink
            to="/"
            end
            className="flex-1 text-sm font-semibold text-white truncate"
          >
            証券アナリスト2次
          </NavLink>

          {/* ミニタイマーバッジ */}
          {running && (
            <span className={`text-xs font-bold tabular-nums shrink-0 ${MODES[mode].textColor}`}>
              {mm}:{ss}
            </span>
          )}

          {/* ユーザーアバター */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-7 h-7 rounded-full border border-[#3a3a5c] object-cover shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#252540] border border-[#3a3a5c] flex items-center justify-center text-xs text-[#8888aa] shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <button
            onClick={signOut}
            title="ログアウト"
            className="p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
