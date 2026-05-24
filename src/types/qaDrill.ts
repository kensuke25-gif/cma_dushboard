// 収録一問一答ドリルの型定義（科目→単元→問題）
export type DrillQuestion = { id: string; q: string; a: string }
export type DrillUnit = { id: string; name: string; questions: DrillQuestion[] }
export type DrillSubject = { id: string; name: string; description?: string; units: DrillUnit[] }
