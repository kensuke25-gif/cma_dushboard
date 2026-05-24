// 収録一問一答ドリルの進捗ストア。
// Supabase（qa_drill_progress）と連動しデバイス間で共有。localStorage はオフライン用キャッシュ。
import { create } from 'zustand'
import { QA_DRILLS } from '../data/qaDrills'
import { supabase } from '../lib/supabase'

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
  synced: boolean
  initialize: () => Promise<void>
  setResult: (qid: string, result: DrillResult | null) => void
  resetSubject: (subjectId: string) => void
  resetAll: () => void
}

export const useQADrillStore = create<QADrillState>((set, get) => ({
  progress: {},
  synced: false,

  // localStorage を即時反映しつつ、ログイン済みなら Supabase の記録で上書き同期する。
  initialize: async () => {
    set({ progress: load() })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('qa_drill_progress')
      .select('qid, result')
    if (error || !data) return
    const remote: Record<string, DrillResult> = {}
    for (const row of data) remote[row.qid] = row.result
    save(remote)
    set({ progress: remote, synced: true })
  },

  setResult: (qid, result) => {
    const progress = { ...get().progress }
    if (result === null) delete progress[qid]
    else progress[qid] = result
    save(progress)
    set({ progress })

    // Supabase へ非同期反映（ログイン時のみ）
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      if (result === null) {
        await supabase.from('qa_drill_progress').delete().eq('user_id', user.id).eq('qid', qid)
      } else {
        await supabase.from('qa_drill_progress').upsert(
          { user_id: user.id, qid, result, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,qid' },
        )
      }
    })()
  },

  resetSubject: (subjectId) => {
    const subject = QA_DRILLS.find(s => s.id === subjectId)
    if (!subject) return
    const ids = subject.units.flatMap(u => u.questions.map(q => q.id))
    const idSet = new Set(ids)
    const progress = { ...get().progress }
    for (const id of ids) delete progress[id]
    save(progress)
    set({ progress })

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || ids.length === 0) return
      await supabase.from('qa_drill_progress').delete().eq('user_id', user.id).in('qid', [...idSet])
    })()
  },

  resetAll: () => {
    save({})
    set({ progress: {} })
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('qa_drill_progress').delete().eq('user_id', user.id)
    })()
  },
}))
