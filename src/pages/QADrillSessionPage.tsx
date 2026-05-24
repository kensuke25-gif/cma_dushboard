import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, X, Shuffle, ChevronsDownUp, ChevronsUpDown, RotateCcw } from 'lucide-react'
import { QA_DRILLS } from '../data/qaDrills'
import { useQADrillStore } from '../stores/qaDrillStore'
import MathText from '../components/MathText'
import type { DrillQuestion } from '../types/qaDrill'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QADrillSessionPage() {
  const { subjectId, unitId } = useParams()
  const progress = useQADrillStore(s => s.progress)
  const initialize = useQADrillStore(s => s.initialize)
  const setResult = useQADrillStore(s => s.setResult)

  useEffect(() => { initialize() }, [initialize])

  const subject = useMemo(() => QA_DRILLS.find(s => s.id === subjectId), [subjectId])
  const unit = useMemo(() => subject?.units.find(u => u.id === unitId), [subject, unitId])

  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [wrongOnly, setWrongOnly] = useState(false)
  const [order, setOrder] = useState<DrillQuestion[]>([])

  useEffect(() => {
    setOrder(unit ? unit.questions : [])
    setOpenIds(new Set())
    setWrongOnly(false)
  }, [unit])

  if (!subject || !unit) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link to="/drills" className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white mb-4">
          <ChevronLeft className="w-3.5 h-3.5" />
          科目一覧へ戻る
        </Link>
        <p className="text-sm text-[#8888aa]">単元が見つかりませんでした。</p>
      </div>
    )
  }

  const total = unit.questions.length
  const okCount = unit.questions.filter(q => progress[q.id] === 'ok').length
  const ngCount = unit.questions.filter(q => progress[q.id] === 'ng').length
  const done = okCount + ngCount
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const visible = wrongOnly ? order.filter(q => progress[q.id] === 'ng') : order

  const toggleOpen = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const grade = (id: string, result: 'ok' | 'ng') => {
    setResult(id, progress[id] === result ? null : result)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link to={`/drills/${subject.id}`} className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white mb-4">
        <ChevronLeft className="w-3.5 h-3.5" />
        {subject.name}の単元一覧へ
      </Link>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252540] text-[#c8c8e8]">{unit.id}</span>
          <h1 className="text-xl font-bold text-white">{unit.name}</h1>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 rounded-full bg-[#252540] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#a78bfa] to-[#7c4dff] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-[#8888aa] tabular-nums shrink-0">{done} / {total}</span>
      </div>

      {/* ツールバー */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setWrongOnly(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            wrongOnly
              ? 'bg-[#3a1a2a] border-[#ff6b8a] text-[#ff6b8a]'
              : 'bg-[#111125] border-[#2a2a4a] text-[#8888aa] hover:text-white'
          }`}
        >
          ✗ 間違いのみ
        </button>
        <button
          onClick={() => setOpenIds(new Set(visible.map(q => q.id)))}
          className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:text-white transition-colors inline-flex items-center gap-1"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" /> すべて開く
        </button>
        <button
          onClick={() => setOpenIds(new Set())}
          className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:text-white transition-colors inline-flex items-center gap-1"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" /> すべて閉じる
        </button>
        <button
          onClick={() => setOrder(prev => shuffleArray(prev))}
          className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:text-white transition-colors inline-flex items-center gap-1"
        >
          <Shuffle className="w-3.5 h-3.5" /> シャッフル
        </button>
        <button
          onClick={() => {
            if (confirm('この単元の記録をリセットしますか？')) {
              unit.questions.forEach(q => setResult(q.id, null))
            }
          }}
          className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a4a] bg-[#111125] text-[#8888aa] hover:text-[#ff6b8a] transition-colors inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" /> 記録をリセット
        </button>
      </div>

      {/* 問題カード */}
      {visible.length === 0 ? (
        <div className="bg-[#111125] border border-dashed border-[#2a2a4a] rounded-2xl p-10 text-center">
          <p className="text-sm text-[#8888aa]">
            {wrongOnly ? '「要復習」の問題はありません。' : '問題がありません。'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((q, idx) => {
            const isOpen = openIds.has(q.id)
            const result = progress[q.id]
            return (
              <li
                key={q.id}
                className={`bg-[#111125] border rounded-2xl overflow-hidden transition-colors ${
                  result === 'ok' ? 'border-[#4ade80]/40' : result === 'ng' ? 'border-[#ff6b8a]/40' : 'border-[#2a2a4a]'
                }`}
              >
                <button
                  onClick={() => toggleOpen(q.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#161630] transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      result === 'ok' ? 'bg-[#4ade80]' : result === 'ng' ? 'bg-[#ff6b8a]' : 'bg-[#3a3a5c]'
                    }`}
                  />
                  <span className="text-[#a78bfa] font-semibold text-sm tabular-nums shrink-0 pt-0.5">{idx + 1}</span>
                  <span className="flex-1 text-sm text-white leading-relaxed">
                    <MathText text={q.q} />
                  </span>
                  <ChevronRight className={`w-4 h-4 text-[#5a5a7a] mt-1 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-[#2a2a4a] bg-[#0f0f22]">
                    <div className="text-[10px] tracking-wider uppercase text-[#a78bfa] font-semibold mt-4 mb-2">Answer</div>
                    <div className="text-sm text-[#e8e8f8] leading-relaxed">
                      <MathText text={q.a} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dashed border-[#2a2a4a]">
                      <button
                        onClick={() => grade(q.id, 'ng')}
                        className={`py-2.5 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                          result === 'ng'
                            ? 'bg-[#3a1a2a] border-[#ff6b8a] text-[#ff6b8a]'
                            : 'bg-[#111125] border-[#2a2a4a] text-[#8888aa] hover:border-[#ff6b8a]/60 hover:text-[#ff6b8a]'
                        }`}
                      >
                        <X className="w-4 h-4" /> 復習する
                      </button>
                      <button
                        onClick={() => grade(q.id, 'ok')}
                        className={`py-2.5 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                          result === 'ok'
                            ? 'bg-[#1a3a2a] border-[#4ade80] text-[#4ade80]'
                            : 'bg-[#111125] border-[#2a2a4a] text-[#8888aa] hover:border-[#4ade80]/60 hover:text-[#4ade80]'
                        }`}
                      >
                        <Check className="w-4 h-4" /> できた
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* サマリー */}
      <div className="bg-[#111125] border border-[#2a2a4a] rounded-2xl p-5 mt-8">
        <div className="text-sm font-semibold text-white text-center mb-3">到達度</div>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#4ade80] tabular-nums">{okCount}</div>
            <div className="text-[10px] text-[#8888aa] tracking-wide">正解</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#ff6b8a] tabular-nums">{ngCount}</div>
            <div className="text-[10px] text-[#8888aa] tracking-wide">要復習</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white tabular-nums">{total - done}</div>
            <div className="text-[10px] text-[#8888aa] tracking-wide">未着手</div>
          </div>
        </div>
      </div>
    </div>
  )
}
