import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Problem, ProblemResult, SubjectKey, SubjectStatsResult } from '../types/problem'

type ResultRecord = Record<string, ProblemResult>  // key: problem.id

type ProblemStore = {
  // 問題データ（Supabaseから取得 or 管理者がアップロード）
  problems: Problem[]
  setProblems: (problems: Problem[]) => void

  // 正誤記録（localStorageに永続化）
  results: ResultRecord
  setResult: (problemId: string, result: ProblemResult) => void
  clearResults: () => void

  // 科目別フィルタ
  getProblemsBySubject: (subject: SubjectKey) => Problem[]

  // 統計
  getStats: (subject: SubjectKey) => SubjectStatsResult
}

export const useProblemStore = create<ProblemStore>()(
  persist(
    (set, get) => ({
      problems: [],
      setProblems: (problems) => set({ problems }),

      results: {},
      setResult: (problemId, result) =>
        set((state) => ({
          results: { ...state.results, [problemId]: result },
        })),
      clearResults: () => set({ results: {} }),

      getProblemsBySubject: (subject) =>
        get().problems.filter((p) => p.subject === subject),

      getStats: (subject) => {
        const problems = get().getProblemsBySubject(subject)
        const results = get().results
        const correct = problems.filter((p) => results[p.id] === 'correct').length
        const partial = problems.filter((p) => results[p.id] === 'partial').length
        const incorrect = problems.filter((p) => results[p.id] === 'incorrect').length
        const answered = correct + partial + incorrect
        return {
          total: problems.length,
          correct,
          partial,
          incorrect,
          unanswered: problems.filter((p) => !results[p.id]).length,
          answered,
          accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
        }
      },
    }),
    {
      name: 'cma-problem-results',
      // resultsのみ永続化（problemsはランタイムで取得）
      partialize: (state) => ({ results: state.results }),
    }
  )
)
