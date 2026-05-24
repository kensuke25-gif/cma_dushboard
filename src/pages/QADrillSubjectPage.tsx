import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { QA_DRILLS } from '../data/qaDrills'
import { useQADrillStore } from '../stores/qaDrillStore'

export default function QADrillSubjectPage() {
  const { subjectId } = useParams()
  const progress = useQADrillStore(s => s.progress)
  const initialize = useQADrillStore(s => s.initialize)

  useEffect(() => { initialize() }, [initialize])

  const subject = useMemo(() => QA_DRILLS.find(s => s.id === subjectId), [subjectId])

  if (!subject) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link to="/drills" className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white mb-4">
          <ChevronLeft className="w-3.5 h-3.5" />
          科目一覧へ戻る
        </Link>
        <p className="text-sm text-[#8888aa]">科目が見つかりませんでした。</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link to="/drills" className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white mb-4">
        <ChevronLeft className="w-3.5 h-3.5" />
        科目一覧へ戻る
      </Link>

      <div className="mb-6">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c4dff]/20 text-[#a78bfa] font-medium">科目</span>
        <h1 className="text-2xl font-bold text-white mt-2">{subject.name}</h1>
      </div>

      <ul className="space-y-2">
        {subject.units.map(unit => {
          const ids = unit.questions.map(q => q.id)
          const total = ids.length
          const ok = ids.filter(id => progress[id] === 'ok').length
          const ng = ids.filter(id => progress[id] === 'ng').length
          const pct = total > 0 ? Math.round((ok / total) * 100) : 0
          return (
            <li key={unit.id}>
              <Link
                to={`/drills/${subject.id}/${unit.id}`}
                className="block bg-[#111125] border border-[#2a2a4a] rounded-2xl p-4 hover:border-[#7c4dff]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252540] text-[#c8c8e8] shrink-0">{unit.id}</span>
                      <h2 className="text-sm font-semibold text-white truncate">{unit.name}</h2>
                    </div>
                    <div className="flex items-center gap-3 mt-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#252540] overflow-hidden">
                        <div className="h-full bg-[#7c4dff] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#8888aa] tabular-nums shrink-0">
                        全{total}問 ・ <span className="text-[#4ade80]">{ok}</span>/<span className="text-[#ff6b8a]">{ng}</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5a5a7a] shrink-0" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
