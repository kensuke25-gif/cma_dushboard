import { useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { usePomodoroStore, MODES, type PomodoroMode } from '../../stores/pomodoroStore'
import { SOUND_OPTIONS, getSoundSetting, setSoundSetting, playTimerEndSound, playStartSound, type SoundType } from '../../lib/sound'
import StudyRecordModal from './StudyRecordPanel'

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// ── 確認ポップアップ ──────────────────────────────────────────
type ConfirmDialogProps = {
  timerMinutes: number
  overtime: number
  totalMinutes: number
  onYes: () => void
  onNo: () => void
}

function ConfirmDialog({ timerMinutes, overtime, totalMinutes, onYes, onNo }: ConfirmDialogProps) {
  const overtimeMm = Math.floor(overtime / 60)
  const overtimeSs = overtime % 60
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onNo} />
      <div className="relative w-full max-w-sm bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-3">学習を記録しますか？</h3>
        <div className="text-sm text-[#8888aa] space-y-1 mb-4">
          <p>タイマー：<span className="text-[#c8c8e8]">{timerMinutes}分</span></p>
          <p>
            延長：<span className="text-amber-400">
              {overtimeMm > 0 ? `${overtimeMm}分` : ''}{overtimeSs}秒
            </span>
          </p>
          <p className="text-[#a78bfa] font-semibold text-base mt-2">合計 {totalMinutes}分</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onYes}
            className="flex-1 py-2.5 rounded-[20px] bg-[#7c4dff] hover:bg-[#6c3dee] text-white text-sm font-medium transition-colors"
          >
            はい（記録する）
          </button>
          <button
            onClick={onNo}
            className="flex-1 py-2.5 rounded-[20px] border border-[#3a3a5c] text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#5a5a7a] text-sm transition-colors"
          >
            いいえ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── メインコンポーネント ──────────────────────────────────────
export default function PomodoroTimer() {
  const {
    mode, seconds, running, sets,
    overtime, overtimeRunning,
    setMode, startToggle, stopOvertime, reset,
  } = usePomodoroStore()

  const [notifGranted, setNotifGranted] = useState(
    'Notification' in window && Notification.permission === 'granted'
  )
  const [soundType, setSoundType] = useState<SoundType>(getSoundSetting())
  const [showSoundMenu, setShowSoundMenu] = useState(false)

  // 確認ポップアップ用
  const [showConfirm, setShowConfirm] = useState(false)
  const [savedMode, setSavedMode] = useState<PomodoroMode>('focus')
  const [savedOvertime, setSavedOvertime] = useState(0)
  const [studyMinutes, setStudyMinutes] = useState(0)

  // 学習記録モーダル用
  const [showStudyRecord, setShowStudyRecord] = useState(false)
  const [modalKey, setModalKey] = useState(0)

  const handleStart = async () => {
    if (!running && !notifGranted) {
      const granted = await requestNotificationPermission()
      setNotifGranted(granted)
    }
    if (!running) playStartSound()
    startToggle()
  }

  // オーバータイム中に「ストップ」を押したとき
  const handleOvertimeStop = () => {
    const totalSec = MODES[mode].minutes * 60 + overtime
    const total = Math.max(1, Math.round(totalSec / 60))
    setSavedMode(mode)
    setSavedOvertime(overtime)
    setStudyMinutes(total)
    stopOvertime()
    setShowConfirm(true)
  }

  const handleConfirmYes = () => {
    setShowConfirm(false)
    setModalKey(k => k + 1)  // StudyRecordModal を強制再マウントして初期値を反映
    setShowStudyRecord(true)
  }

  const handleConfirmNo = () => {
    setShowConfirm(false)
  }

  const handleReset = () => {
    setShowConfirm(false)
    reset()
  }

  const handleSoundChange = (type: SoundType) => {
    setSoundType(type)
    setSoundSetting(type)
    setShowSoundMenu(false)
    playTimerEndSound(type)
  }

  // ── 表示値の計算 ──────────────────────────────────────────
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const total = MODES[mode].minutes * 60
  const remainingPct = total > 0 ? seconds / total : 0

  const overtimeMm = String(Math.floor(overtime / 60)).padStart(2, '0')
  const overtimeSs = String(overtime % 60).padStart(2, '0')
  const overtimePct = Math.min(overtime / total, 1)

  // オーバータイム中はリングが amber でカウントアップ
  const ringData = overtimeRunning
    ? [{ value: overtimePct * 100 }, { value: (1 - overtimePct) * 100 }]
    : [{ value: remainingPct * 100 }, { value: (1 - remainingPct) * 100 }]
  const ringFillColor = overtimeRunning ? '#f59e0b' : MODES[mode].ringColor

  const currentSound = SOUND_OPTIONS.find(o => o.value === soundType)?.label ?? 'ビープ音'

  return (
    <>
      <div className="bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-4 sm:p-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">ポモドーロタイマー</h2>
          <div className="flex items-center gap-2">
            {/* 通知音セレクター */}
            <div className="relative">
              <button
                onClick={() => setShowSoundMenu(v => !v)}
                className="flex items-center gap-1 text-xs text-[#8888aa] hover:text-[#a78bfa] transition-colors px-2 py-1 rounded-lg hover:bg-[#252540]"
                title="通知音を設定"
              >
                🔔 <span className="hidden sm:inline">{currentSound}</span>
              </button>
              {showSoundMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSoundMenu(false)} />
                  <div className="absolute right-0 top-7 z-50 bg-[#252540] border border-[#3a3a5c] rounded-xl shadow-xl overflow-hidden min-w-[110px]">
                    {SOUND_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleSoundChange(opt.value)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#1e1e3a] ${
                          soundType === opt.value ? 'text-[#a78bfa] font-medium' : 'text-[#c8c8e8]'
                        }`}
                      >
                        {soundType === opt.value && '✓ '}{opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 通知許可ボタン */}
            {!notifGranted && (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission()
                  setNotifGranted(granted)
                }}
                className="text-xs text-[#8888aa] hover:text-[#a78bfa] transition-colors"
                title="通知を許可する"
              >
                📵
              </button>
            )}
          </div>
        </div>

        {/* モード切替 */}
        <div className="flex gap-1 bg-[#111125] rounded-full p-1 mb-4 sm:mb-5 w-fit mx-auto">
          {(Object.keys(MODES) as Array<keyof typeof MODES>).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-2.5 sm:px-3 py-1 rounded-full transition-all whitespace-nowrap ${
                mode === m ? 'bg-[#7c4dff] text-white font-medium' : 'text-[#8888aa] hover:text-[#c8c8e8]'
              }`}
            >
              {MODES[m].label}{MODES[m].minutes}分
            </button>
          ))}
        </div>

        {/* ドーナツリング */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
          <PieChart width={176} height={176} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={ringData}
              cx={88} cy={88}
              startAngle={90} endAngle={-270}
              innerRadius={66} outerRadius={80}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={false}
            >
              <Cell fill={ringFillColor} />
              <Cell fill="#252540" />
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {overtimeRunning ? (
              <>
                <span className="text-3xl font-bold tabular-nums text-amber-400">
                  +{overtimeMm}:{overtimeSs}
                </span>
                <span className="text-xs text-amber-500 mt-1">延長中</span>
              </>
            ) : (
              <>
                <span className={`text-3xl font-bold tabular-nums ${MODES[mode].textColor}`}>
                  {mm}:{ss}
                </span>
                <span className="text-xs text-[#8888aa] mt-1">{MODES[mode].label}</span>
              </>
            )}
          </div>
        </div>

        {/* セット数 */}
        <p className="text-xs text-[#8888aa] text-center mb-3 sm:mb-4">
          セット数：{sets} / 今日の累計 {sets * 25}分
        </p>

        {/* ボタン */}
        <div className="flex gap-2 justify-center">
          {overtimeRunning ? (
            <button
              onClick={handleOvertimeStop}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium transition-colors"
            >
              ストップ
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-5 py-2 rounded-full bg-[#7c4dff] hover:bg-[#6c3dee] text-white text-sm font-medium transition-colors"
            >
              {running ? '一時停止' : 'スタート'}
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-full border border-[#3a3a5c] text-[#8888aa] hover:text-[#c8c8e8] hover:border-[#7c4dff] text-sm transition-colors"
          >
            リセット
          </button>
        </div>
      </div>

      {/* 学習記録確認ポップアップ */}
      {showConfirm && (
        <ConfirmDialog
          timerMinutes={MODES[savedMode].minutes}
          overtime={savedOvertime}
          totalMinutes={studyMinutes}
          onYes={handleConfirmYes}
          onNo={handleConfirmNo}
        />
      )}

      {/* 学習記録モーダル（defaultMinutes を渡して強制再マウント） */}
      <StudyRecordModal
        key={modalKey}
        isOpen={showStudyRecord}
        onClose={() => setShowStudyRecord(false)}
        defaultMinutes={studyMinutes}
      />
    </>
  )
}
