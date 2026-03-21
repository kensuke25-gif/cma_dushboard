// =============================================
// src/components/problems/SubjectHeatmap.tsx
// 科目×章の正答率ヒートマップ
// =============================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, PlayCircle } from 'lucide-react'
import { useProblemStore } from '../../stores/problemStore'
import { SUBJECT_CONFIGS } from '../../types/problem'
import type { SubjectKey } from '../../types/problem'

// -----------------------------------------------
// 正答率に応じた色を返す
// -----------------------------------------------

type AccuracyColor = {
  bg:     string
  border: string
  text:   string
  label:  string
}

function getAccuracyColor(
  accuracy: number,
  answered: number
): AccuracyColor {
  if (answered === 0) {
    return {
      bg:     'bg-[#1e1e3a]',
      border: 'border-[#2a2a4a]',
      text:   'text-[#5a5a7a]',
      label:  '未回答',
    }
  }
  if (accuracy >= 70) {
    return {
      bg:     'bg-green-900/25',
      border: 'border-green-500/30',
      text:   'text-green-400',
      label:  '得意',
    }
  }
  if (accuracy >= 40) {
    return {
      bg:     'bg-amber-900/25',
      border: 'border-amber-500/30',
      text:   'text-amber-400',
      label:  '要復習',
    }
  }
  return {
    bg:     'bg-red-900/25',
    border: 'border-red-500/30',
    text:   'text-red-400',
    label:  '苦手',
  }
}

// -----------------------------------------------
// 凡例コンポーネント
// -----------------------------------------------

function Legend() {
  const items = [
    { bg: 'bg-[#1e1e3a]',      border: 'border-[#2a2a4a]',      text: '未回答'  },
    { bg: 'bg-red-900/25',     border: 'border-red-500/30',     text: '苦手 (0-39%)' },
    { bg: 'bg-amber-900/25',   border: 'border-amber-500/30',   text: '要復習 (40-69%)' },
    { bg: 'bg-green-900/25',   border: 'border-green-500/30',   text: '得意 (70-100%)' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <div key={item.text} className="flex items-center gap-1.5">
          <div
            className={`w-3 h-3 rounded-sm border ${item.bg} ${item.border}`}
          />
          <span className="text-[10px] text-[#5a5a7a]">{item.text}</span>
        </div>
      ))}
    </div>
  )
}

// -----------------------------------------------
// 1科目分のヒートマップ行
// -----------------------------------------------

type SubjectRowProps = {
  subjectKey:  string
  label:       string
  shortLabel:  string
  accentHex:   string
  accentBg:    string
}

function SubjectRow({
  subjectKey,
  label,
  shortLabel,
  accentHex,
}: SubjectRowProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const { getChapterStats, getSubjectStats } = useProblemStore()
  const chapters      = getChapterStats(subjectKey as SubjectKey)
  const subjectStats  = getSubjectStats(subjectKey as SubjectKey)

  // 問題がない科目は非表示
  if (chapters.length === 0) return null

  return (
    <div className="rounded-xl border border-[#2a2a4a] overflow-hidden">

      {/* 科目ヘッダー */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3
                   bg-[#111125] hover:bg-[#16162a] transition-colors"
      >
        {/* 科目カラーライン */}
        <div
          className="w-1 h-5 rounded-full shrink-0"
          style={{ backgroundColor: accentHex }}
        />

        {/* 科目名 */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {label}
          </p>
          <p className="text-[10px] text-[#8888aa] mt-0.5">
            {subjectStats.answered} / {subjectStats.total} 問回答済み
            {subjectStats.answered > 0 && (
              <span className="ml-2">
                正答率 {subjectStats.accuracy}%
              </span>
            )}
          </p>
        </div>

        {/* 科目全体の正答率バー */}
        {subjectStats.answered > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-20 h-1.5 bg-[#252540] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width:           `${subjectStats.accuracy}%`,
                  backgroundColor: accentHex,
                }}
              />
            </div>
            <span
              className="text-xs font-bold tabular-nums w-8 text-right"
              style={{ color: accentHex }}
            >
              {subjectStats.accuracy}%
            </span>
          </div>
        )}

        {/* 折りたたみアイコン */}
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-[#5a5a7a] shrink-0" strokeWidth={1.5} />
          : <ChevronUp   className="w-4 h-4 text-[#5a5a7a] shrink-0" strokeWidth={1.5} />
        }
      </button>

      {/* 章グリッド */}
      {!collapsed && (
        <div className="p-3 bg-[#0e0e1f]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {chapters.map((ch) => {
              const color = getAccuracyColor(ch.accuracy, ch.answered)
              return (
                <button
                  key={ch.chapterKey}
                  onClick={() =>
                    navigate(
                      `/quiz-mode/${subjectKey}/${ch.chapterKey}`
                    )
                  }
                  title={`${ch.chapterName} → 演習モードで解く`}
                  className={`
                    relative group
                    flex flex-col gap-1.5
                    p-3 rounded-xl border
                    text-left
                    transition-all duration-150
                    hover:scale-[1.02] hover:shadow-lg
                    ${color.bg} ${color.border}
                  `}
                >
                  {/* 章名 */}
                  <p className="text-[11px] font-medium text-[#c8c8e8]
                                leading-snug line-clamp-2 min-h-[2.5rem]">
                    {ch.chapterName}
                  </p>

                  {/* 正答率 */}
                  <div className="flex items-end justify-between gap-1">
                    <div className="flex-1">
                      {ch.answered > 0 ? (
                        <>
                          {/* 正答率バー */}
                          <div className="w-full h-1 bg-[#252540] rounded-full
                                          overflow-hidden mb-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width:           `${ch.accuracy}%`,
                                backgroundColor: accentHex,
                              }}
                            />
                          </div>
                          <p className={`text-xs font-bold tabular-nums ${color.text}`}>
                            {ch.accuracy}%
                          </p>
                          <p className="text-[9px] text-[#5a5a7a]">
                            {ch.correct}/{ch.answered}問
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-[#5a5a7a]">未回答</p>
                      )}
                    </div>

                    {/* ホバー時に演習アイコン表示 */}
                    <PlayCircle
                      className="w-4 h-4 shrink-0 opacity-0
                                 group-hover:opacity-100 transition-opacity"
                      style={{ color: accentHex }}
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* 難易度ラベル */}
                  <div
                    className={`
                      absolute top-2 right-2
                      text-[9px] px-1.5 py-0.5 rounded-full
                      border ${color.border} ${color.text}
                      opacity-70
                    `}
                  >
                    {color.label}
                  </div>

                </button>
              )
            })}
          </div>

          {/* 科目全体を演習するボタン */}
          <div className="mt-3 pt-3 border-t border-[#2a2a4a]">
            <button
              onClick={() => navigate(`/quiz-mode/${subjectKey}`)}
              className="w-full flex items-center justify-center gap-2
                         py-2 rounded-xl border border-[#2a2a4a]
                         text-xs text-[#8888aa]
                         hover:border-[#7c4dff]/40 hover:text-[#a78bfa]
                         hover:bg-[#7c4dff]/10 transition-all"
            >
              <PlayCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              {shortLabel} 全問を演習する（{subjectStats.total}問）
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// -----------------------------------------------
// メインコンポーネント
// -----------------------------------------------

export default function SubjectHeatmap() {
  return (
    <div className="space-y-3">

      {/* 凡例 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-[#8888aa]">
          セルをクリックすると演習モードで解けます
        </p>
        <Legend />
      </div>

      {/* 科目別ヒートマップ */}
      <div className="space-y-3">
        {SUBJECT_CONFIGS.map((cfg) => (
          <SubjectRow
            key={cfg.key}
            subjectKey={cfg.key}
            label={cfg.label}
            shortLabel={cfg.shortLabel}
            accentHex={cfg.accentHex}
            accentBg={cfg.accentBg}
          />
        ))}
      </div>

    </div>
  )
}
