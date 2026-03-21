// =============================================
// src/components/problems/StreakBanner.tsx
// 連続正解日数バナー（streak >= 3 のときのみ表示）
// =============================================

import { Flame } from 'lucide-react'
import { useProblemStore } from '../../stores/problemStore'

// ストリーク数に応じたスタイルを返す
function getStreakStyle(streak: number): {
  bg:      string
  border:  string
  text:    string
  flame:   string
  message: string
} {
  if (streak >= 30) {
    return {
      bg:      'bg-purple-900/20',
      border:  'border-purple-500/30',
      text:    'text-purple-300',
      flame:   '#c084fc',
      message: '伝説の学習者！圧倒的な継続力です 🏆',
    }
  }
  if (streak >= 14) {
    return {
      bg:      'bg-red-900/20',
      border:  'border-red-500/30',
      text:    'text-red-300',
      flame:   '#f87171',
      message: '2週間継続！合格への道を歩んでいます 🔥',
    }
  }
  if (streak >= 7) {
    return {
      bg:      'bg-orange-900/20',
      border:  'border-orange-500/30',
      text:    'text-orange-300',
      flame:   '#fb923c',
      message: '1週間継続！素晴らしいペースです ⚡',
    }
  }
  return {
    bg:      'bg-amber-900/20',
    border:  'border-amber-500/30',
    text:    'text-amber-300',
    flame:   '#fbbf24',
    message: '連続学習中！この調子で続けましょう',
  }
}

export default function StreakBanner() {
  const streak = useProblemStore((s) => s.streak)

  // streak が 3 未満の場合は非表示
  if (streak < 3) return null

  const style = getStreakStyle(streak)

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border
        ${style.bg} ${style.border}
        animate-in fade-in duration-500
      `}
    >
      {/* 炎アイコン（アニメーション） */}
      <div className="relative shrink-0">
        <Flame
          className="w-6 h-6 animate-pulse"
          style={{ color: style.flame }}
          strokeWidth={1.5}
        />
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${style.text}`}>
          {streak}日連続正解中！
        </p>
        <p className="text-xs text-[#8888aa] mt-0.5 truncate">
          {style.message}
        </p>
      </div>

      {/* ストリーク数バッジ */}
      <div
        className={`
          shrink-0 flex items-center justify-center
          w-10 h-10 rounded-xl border font-bold text-lg
          ${style.bg} ${style.border} ${style.text}
        `}
      >
        {streak}
      </div>
    </div>
  )
}
