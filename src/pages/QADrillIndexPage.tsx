import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Layers } from 'lucide-react'
import { QA_DRILLS } from '../data/qaDrills'
import { ACCOUNTING_QUIZ, ACCOUNTING_SEC_NAMES, accountingQid } from '../data/accountingQuiz'
import { useQADrillStore } from '../stores/qaDrillStore'

export default function QADrillIndexPage() {
  const progress = useQADrillStore(s => s.progress)
  const initialize = useQADrillStore(s => s.initialize)

  useEffect(() => { void initialize() }, [initialize])

  const cards = useMemo(() => QA_DRILLS.map(subject => {
    const ids = subject.units.flatMap(u => u.questions.map(q => q.id))
    const total = ids.length
    const ok = ids.filter(id => progress[id] === 'ok').length
    return { subject, total, ok, units: subject.units.length }
  }), [progress])

  const acct = useMemo(() => {
    const total = ACCOUNTING_QUIZ.length
    const ok = ACCOUNTING_QUIZ.filter(d => progress[accountingQid(d.n)] === 'ok').length
    const sections = Object.keys(ACCOUNTING_SEC_NAMES).length
    const pct = total > 0 ? Math.round((ok / total) * 100) : 0
    return { total, ok, sections, pct }
  }, [progress])

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">一問一答ドリル</h1>
        <p className="text-xs text-[#8888aa] mt-1">科目を選んで、収録済みの一問一答を反復演習しましょう。</p>
      </div>

      <ul className="space-y-3">
        <li>
          <Link
            to="/drills/accounting"
            className="block bg-[#111125] border border-[#2a2a4a] rounded-2xl p-5 hover:border-[#7c4dff]/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-[#c79a4a]/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#d6b35e]" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white truncate">会計制度</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#c79a4a]/20 text-[#d6b35e] font-medium shrink-0">専用レイアウト</span>
                  <ChevronRight className="w-4 h-4 text-[#5a5a7a] ml-auto shrink-0" />
                </div>
                <p className="text-xs text-[#8888aa] mt-1 line-clamp-2">
                  証券アナリスト2次 一問一答 — 連結・企業結合・減損・リース・退職給付・税効果ほか
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-1.5 rounded-full bg-[#252540] overflow-hidden">
                    <div className="h-full bg-[#c79a4a] rounded-full transition-all" style={{ width: `${acct.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#8888aa] tabular-nums shrink-0">
                    {acct.sections}単元・全{acct.total}問 ・ {acct.ok}/{acct.total}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </li>
        {cards.map(({ subject, total, ok, units }) => {
          const pct = total > 0 ? Math.round((ok / total) * 100) : 0
          return (
            <li key={subject.id}>
              <Link
                to={`/drills/${subject.id}`}
                className="block bg-[#111125] border border-[#2a2a4a] rounded-2xl p-5 hover:border-[#7c4dff]/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[#7c4dff]/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-[#a78bfa]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white truncate">{subject.name}</h2>
                      <ChevronRight className="w-4 h-4 text-[#5a5a7a] ml-auto shrink-0" />
                    </div>
                    {subject.description && (
                      <p className="text-xs text-[#8888aa] mt-1 line-clamp-2">{subject.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 h-1.5 rounded-full bg-[#252540] overflow-hidden">
                        <div className="h-full bg-[#7c4dff] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#8888aa] tabular-nums shrink-0">
                        {units}単元・全{total}問 ・ {ok}/{total}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
