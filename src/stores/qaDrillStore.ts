// 収録一問一答ドリルの進捗ストア（localStorage 永続）。
import { create } from 'zustand'
import { QA_DRILLS } from '../data/qaDrills'

export type DrillResult = 'ok' | 'ng'

const PROGRESS_KEY = 'cma-qa-drill-progress'

function load(): Record<string, DrillResult> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, DrillResult> } catch { return {} }
}
function save(value: Record<string, DrillResult>) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(value)) } catch {}
}

interface QADrillState {
  progress: Record<string, DrillResult>
  initialize: () => void
  setResult: (qid: string, result: DrillResult | null) => void
  resetSubject: (subjectId: string) => void
  resetAll: () => void
}

export const useQADrillStore = create<QADrillState>((set, get) => ({
  progress: {},

  initialize: () => {
    set({ progress: load() })
  },

  setResult: (qid, result) => {
    const progress = { ...get().progress }
    if (result === null) delete progress[qid]
    else progress[qid] = result
    save(progress)
    set({ progress })
  },

  resetSubject: (subjectId) => {
    const subject = QA_DRILLS.find(s => s.id === subjectId)
    if (!subject) return
    const ids = new Set(subject.units.flatMap(u => u.questions.map(q => q.id)))
    const progress = { ...get().progress }
    for (const id of ids) delete progress[id]
    save(progress)
    set({ progress })
  },

  resetAll: () => {
    save({})
    set({ progress: {} })
  },
}))
