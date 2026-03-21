export type ProblemResult = 'correct' | 'partial' | 'incorrect' | null

export type Problem = {
  id: string               // ユニークID（例: "market-ch2-001"）
  subject: SubjectKey      // 科目キー
  chapterKey: string       // 章キー（アンカーID生成に使用）
  chapterName: string      // 章名（例: "第II章 金融経済"）
  year: number             // 出題年度（例: 2023）
  questionNo: string       // 問番号（例: "第1問"）
  points: number           // 配点
  questionText: string     // 問題文（Markdown可）
  answerText: string       // 解答・解説（Markdown可）
  tags: string[]           // タグ（例: ["IS-LM", "財政政策"]）
}

export type SubjectKey = 'securities' | 'finance' | 'market' | 'ethics'

export type SubjectConfig = {
  key: SubjectKey
  label: string            // 表示名
  shortLabel: string       // 短縮表示名
  path: string             // ルートパス
  color: string            // アクセントカラー（Tailwind class）
}

export const SUBJECT_CONFIGS: SubjectConfig[] = [
  {
    key: 'securities',
    label: '証券分析とポートフォリオ・マネジメント',
    shortLabel: '証券分析',
    path: '/problems/securities',
    color: 'text-purple-400',
  },
  {
    key: 'finance',
    label: '財務分析・コーポレートファイナンス',
    shortLabel: '財務分析',
    path: '/problems/finance',
    color: 'text-blue-400',
  },
  {
    key: 'market',
    label: '市場と経済の分析・数量分析',
    shortLabel: '市場分析',
    path: '/problems/market',
    color: 'text-emerald-400',
  },
  {
    key: 'ethics',
    label: '職業倫理・行為基準',
    shortLabel: '職業倫理',
    path: '/problems/ethics',
    color: 'text-amber-400',
  },
]
