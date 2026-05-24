import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Brain, BarChart2, FileQuestion, LogOut, Menu, X, ChevronLeft, Upload, Timer, StickyNote, Pause, Play, Square, ExternalLink, MessagesSquare, Layers } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePomodoroStore, MODES, registerFinishCallback, type PomodoroMode } from '../stores/pomodoroStore'
import { playTimerEndSound } from '../lib/sound'

const tabs = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { to: '/items', label: '項目', Icon: BookOpen, exact: false },
  { to: '/quiz', label: 'クイズ', Icon: Brain, exact: false },
  { to: '/problems', label: '問題集', Icon: FileQuestion, exact: false },
  { to: '/qa', label: '一問一答', Icon: MessagesSquare, exact: false },
  { to: '/drills', label: '一問一答ドリル', Icon: Layers, exact: false },
  { to: '/analytics', label: 'レポート', Icon: BarChart2, exact: false },
  { to: '/memo', label: 'メモ', Icon: StickyNote, exact: false },
  { to: '/import', label: 'インポート', Icon: Upload, exact: false },
]

// モバイルボトムナビゲーション用タブ
const bottomTabs = [
  { id: 'dashboard', to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'report',    to: '/analytics', label: 'Report', Icon: BarChart2 },
  { id: 'pomodoro',  to: '/pomodoro', label: 'Pomodoro', Icon: Timer },
  { id: 'quiz',      to: '/quiz', label: 'Quiz', Icon: Brain },
  { id: 'workbook',  to: '/problems', label: 'Workbook', Icon: FileQuestion },
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
  const [lastBottomTab, setLastBottomTab] = useState<string>('dashboard')

  useEffect(() => {
    try { localStorage.setItem('cma-sidebar-pinned', String(sidebarPinned)) } catch {}
  }, [sidebarPinned])
  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const { running, overtimeRunning, tick, mode, seconds, overtime, startToggle, stopOvertime } = usePomodoroStore()
  const location = useLocation()
  const navigate = useNavigate()

  // パス変更時にボトムタブのアクティブ状態を同期
  useEffect(() => {
    const p = location.pathname
    if (p === '/analytics')       setLastBottomTab('report')
    else if (p.startsWith('/quiz'))     setLastBottomTab('quiz')
    else if (p.startsWith('/problems')) setLastBottomTab('workbook')
    else if (p === '/pomodoro')         setLastBottomTab('pomodoro')
    else if (p === '/')                 setLastBottomTab('dashboard')
  }, [location.pathname])

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
  // overtimeRunning 中もインターバルを継続してストップウォッチをカウントアップ
  const stableTick = useCallback(tick, [tick])
  useEffect(() => {
    if (!running && !overtimeRunning) return
    const id = window.setInterval(stableTick, 500)
    return () => clearInterval(id)
  }, [running, overtimeRunning, stableTick])

  const displaySecs = overtimeRunning ? overtime : seconds
  const mm = String(Math.floor(displaySecs / 60)).padStart(2, '0')
  const ss = String(displaySecs % 60).padStart(2, '0')
  const isTimerActive = running || overtimeRunning || (seconds > 0 && seconds < MODES[mode].minutes * 60)

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

        {/* タイトル行：ホームリンク + 格納ボタン */}
        <div className="flex items-center border-b border-[#2a2a4a]">
          <NavLink
            to="/"
            end
            onClick={closeSidebar}
            className="flex-1 flex items-center gap-2 px-5 py-5 hover:bg-[#1a1a3a] transition-colors min-w-0"
          >
            <span className="text-sm font-bold text-white leading-tight">
              証券アナリスト2次<br />
              <span className="text-[#a78bfa] font-semibold text-xs">学習ダッシュボード</span>
            </span>
          </NavLink>

          {/* md+: サイドバー格納ボタン（インライン配置） */}
          <button
            onClick={() => setSidebarPinned(false)}
            title="サイドバーを閉じる"
            className="hidden md:flex shrink-0 p-2 mr-2 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* モバイル: ドロワーを閉じるボタン */}
          <button
            onClick={closeSidebar}
            className="flex md:hidden shrink-0 p-2 mr-2 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
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

        {/* ミニタイマー（動作中のみ表示） */}
        {isTimerActive && (
          <button
            onClick={() => overtimeRunning ? stopOvertime() : startToggle()}
            title={running ? '一時停止' : overtimeRunning ? '終了' : '再開'}
            className="mx-3 mb-3 p-3 rounded-xl bg-[#1e1e3a] border border-[#2a2a4a] hover:border-[#7c4dff]/50 transition-colors w-[calc(100%-24px)]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${running || overtimeRunning ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: MODES[mode].ringColor }}
              />
              <span className={`text-sm font-bold tabular-nums ${MODES[mode].textColor}`}>
                {overtimeRunning ? '+' : ''}{mm}:{ss}
              </span>
              <span className="text-xs text-[#8888aa] ml-auto">{MODES[mode].label}</span>
              {running ? (
                <Pause className="w-3 h-3 text-[#5a5a7a]" strokeWidth={2} />
              ) : overtimeRunning ? (
                <Square className="w-3 h-3 text-[#5a5a7a]" strokeWidth={2} />
              ) : (
                <Play className="w-3 h-3 text-[#5a5a7a]" strokeWidth={2} />
              )}
            </div>
          </button>
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
      <div className={`${sidebarPinned ? 'md:pl-[220px]' : ''} flex flex-col min-h-screen transition-[padding] duration-200`}>

        {/* スティッキートップバー（モバイル常時 / md+ はサイドバー格納時のみ表示） */}
        <header className={`${sidebarPinned ? 'md:hidden' : ''} sticky top-0 z-30 bg-[#111125] border-b border-[#2a2a4a]`}>
          {/* iOSセーフエリア（ノッチ・Dynamic Island）のりしろ */}
          <div style={{ height: 'env(safe-area-inset-top)' }} />
          {/* ナビゲーション行 */}
          <div className="px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => {
              if (window.matchMedia('(min-width: 768px)').matches) {
                setSidebarPinned(true)
              } else {
                setSidebarOpen(true)
              }
            }}
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
          {isTimerActive && (
            <button
              onClick={() => overtimeRunning ? stopOvertime() : startToggle()}
              title={running ? '一時停止' : overtimeRunning ? '終了' : '再開'}
              className={`text-xs font-bold tabular-nums shrink-0 ${MODES[mode].textColor} hover:opacity-70 transition-opacity`}
            >
              {overtimeRunning ? '+' : ''}{mm}:{ss}
            </button>
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

        <main className="flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ========== モバイルボトムナビゲーション ========== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111125] border-t border-[#2a2a4a] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomTabs.map(({ id, to, label, Icon }) => {
          const isActive = lastBottomTab === id

          return (
            <button
              key={id}
              onClick={() => {
                setLastBottomTab(id)
                navigate(to)
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                isActive ? 'text-[#a78bfa]' : 'text-[#8888aa]'
              }`}
            >
              <Icon
                className="w-5 h-5 shrink-0"
                strokeWidth={1.5}
                style={id === 'pomodoro' && running ? { color: MODES[mode].ringColor } : undefined}
              />
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {id === 'pomodoro' && running && (
                <span
                  className="text-[9px] font-bold tabular-nums leading-none"
                  style={{ color: MODES[mode].ringColor }}
                >
                  {mm}:{ss}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* フローティングポモドーロタイマー（Dashboard・Pomodoro以外で動作中に表示） */}
      {isTimerActive && location.pathname !== '/' && location.pathname !== '/pomodoro' && (
        <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-40 flex items-center gap-1 rounded-full bg-[#1a1a30]/95 border border-[#7c4dff]/50 shadow-xl backdrop-blur-sm overflow-hidden">
          {/* 停止/再開ボタン */}
          <button
            onClick={() => overtimeRunning ? stopOvertime() : startToggle()}
            title={running ? '一時停止' : overtimeRunning ? '終了' : '再開'}
            className="flex items-center gap-2 pl-4 pr-2 py-2.5 hover:bg-[#252545] transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${running || overtimeRunning ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: MODES[mode].ringColor }}
            />
            <span className={`text-sm font-bold tabular-nums ${MODES[mode].textColor}`}>
              {overtimeRunning ? '+' : ''}{mm}:{ss}
            </span>
            <span className="text-xs text-[#8888aa]">{MODES[mode].label}</span>
            {running ? (
              <Pause className="w-3 h-3 text-[#8888aa]" strokeWidth={2} />
            ) : overtimeRunning ? (
              <Square className="w-3 h-3 text-[#8888aa]" strokeWidth={2} />
            ) : (
              <Play className="w-3 h-3 text-[#8888aa]" strokeWidth={2} />
            )}
          </button>
          {/* Dashboardへのリンク */}
          <NavLink
            to="/"
            title="Dashboardでタイマーを確認"
            className="pr-3 py-2.5 text-[#5a5a7a] hover:text-[#8888aa] transition-colors"
          >
            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          </NavLink>
        </div>
      )}
    </div>
  )
}
