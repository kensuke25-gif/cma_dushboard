import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Brain, BarChart2, FileQuestion, LogOut, Menu, X, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePomodoroStore, MODES, registerFinishCallback, type PomodoroMode } from '../stores/pomodoroStore'
import { playTimerEndSound } from '../lib/sound'

const tabs = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/items', label: '項目', Icon: BookOpen, exact: false },
  { to: '/quiz', label: 'クイズ', Icon: Brain, exact: false },
  { to: '/problems/market', label: '問題集', Icon: FileQuestion, exact: false },
  { to: '/analytics', label: 'レポート', Icon: BarChart2, exact: false },
]

// ---- 通知 ----

function sendNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.ico', silent: true })
}

// ----

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(() => {
    try { return localStorage.getItem('cma-sidebar-pinned') !== 'false' } catch { return true }
  })

  useEffect(() => {
    try { localStorage.setItem('cma-sidebar-pinned', String(sidebarPinned)) } catch {}
  }, [sidebarPinned])
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const { running, tick, mode, seconds } = usePomodoroStore()
  const location = useLocation()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const name = (user?.user_metadata?.full_name ?? user?.email ?? '') as string

  // タイマー終了時コールバックを登録（初回のみ）
  useEffect(() => {
    registerFinishCallback((finishedMode: PomodoroMode) => {
      playTimerEndSound()
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

  const sidebarTranslateClass = sidebarOpen
    ? 'translate-x-0'
    : sidebarPinned
      ? '-translate-x-full md:translate-x-0'
      : '-translate-x-full'

  return (
    <div className="min-h-screen bg-[#1a1a2e]">

      {/* ========== サイドバー ========== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[220px]
          bg-[#111125] border-r border-[#2a2a4a]
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarTranslateClass}
        `}
      >
        {/* iOSセーフエリア（ノッチ・Dynamic Island）のりしろ */}
        <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

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
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          className="absolute right-3 p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors md:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        {/* md+: サイドバー格納ボタン */}
        <button
          onClick={() => setSidebarPinned(false)}
          title="サイドバーを閉じる"
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          className="absolute right-3 p-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors hidden md:flex"
        >
          <ChevronLeft className="w-4 h-4" />
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

      {/* md+: サイドバーが閉じているときの再表示ボタン */}
      {!sidebarPinned && (
        <button
          onClick={() => setSidebarPinned(true)}
          title="サイドバーを開く"
          className="hidden md:flex fixed z-40 items-center justify-center p-2 rounded-lg bg-[#111125] border border-[#2a2a4a] text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 16px)', left: '12px' }}
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}

      {/* ========== メインエリア ========== */}
      <div className={`${sidebarPinned ? 'md:pl-[220px]' : ''} flex flex-col min-h-screen transition-[padding] duration-200`}>

        {/* モバイル用スティッキートップバー */}
        <header className="md:hidden sticky top-0 z-30 bg-[#111125] border-b border-[#2a2a4a]">
          {/* iOSセーフエリア（ノッチ・Dynamic Island）のりしろ */}
          <div style={{ height: 'env(safe-area-inset-top)' }} />
          {/* ナビゲーション行 */}
          <div className="px-4 h-14 flex items-center gap-3">
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
          </div>{/* /ナビゲーション行 */}
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* フローティングポモドーロタイマー（Dashboard以外で実行中に表示） */}
      {running && location.pathname !== '/' && (
        <NavLink
          to="/"
          title="Dashboardでタイマーを確認"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1a1a30]/95 border border-[#7c4dff]/50 shadow-xl backdrop-blur-sm hover:border-[#7c4dff] hover:bg-[#252545] transition-colors"
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: MODES[mode].ringColor }}
          />
          <span className={`text-sm font-bold tabular-nums ${MODES[mode].textColor}`}>
            {mm}:{ss}
          </span>
          <span className="text-xs text-[#8888aa]">{MODES[mode].label}</span>
        </NavLink>
      )}
    </div>
  )
}
