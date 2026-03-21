// =============================================
// src/types/problem.ts
// 問題演習機能 型定義
// STEP 2 の Supabase テーブル定義と完全対応
// =============================================

// -----------------------------------------------
// 基本型
// -----------------------------------------------

/** 科目キー */
export type SubjectKey = 'securities' | 'finance' | 'market' | 'ethics'

/** 正誤結果（null = 未回答） */
export type ProblemResult = 'correct' | 'partial' | 'incorrect' | null

/** 難易度 */
export type Difficulty = 1 | 2 | 3 // 1: 易しい / 2: 普通 / 3: 難しい

// -----------------------------------------------
// 問題データ型（Supabase problems テーブルに対応）
// -----------------------------------------------

export type Problem = {
  /** ユニークID 例: "securities-ch1-001" */
  id: string

  /** 科目キー */
  subject: SubjectKey

  /** 章キー 例: "securities-ch1"（URLアンカー・グルーピングに使用） */
  chapterKey: string

  /** 章名 例: "第I章 証券分析の基礎" */
  chapterName: string

  /** 節名 例: "第1節 リターンとリスク"（任意） */
  sectionName?: string

  /** 問番号 例: "練習問題1-1" / "章末問題1" */
  questionNo: string

  /** 問題形式（現在は記述式のみ） */
  questionType: 'descriptive'

  /** 配点 */
  points: number

  /**
   * 問題文
   * LaTeX記法対応:
   *   インライン数式: $E(R) = R_f + \beta(R_m - R_f)$
   *   ブロック数式:   $$\sigma_p = \sqrt{w_1^2\sigma_1^2 + w_2^2\sigma_2^2}$$
   */
  questionText: string

  /**
   * ヒント（任意）
   * 解答に詰まったときの手がかり。
   * QuizModePageで「ヒントを見る」ボタン押下時に表示。
   */
  hintText?: string

  /**
   * 模範解答
   * LaTeX記法対応
   */
  answerText: string

  /**
   * 初学者向け詳細解説
   * answerText より詳しく、式の導出過程・直感的説明を含む。
   * LaTeX記法対応
   */
  explanation: string

  /**
   * 周辺知識・発展知識（任意）
   * 関連する公式・背景理論・試験頻出ポイントなど
   */
  relatedKnowledge?: string

  /** タグ 例: ['シャープレシオ', 'リスク調整済みリターン'] */
  tags: string[]

  /** 難易度 1:易 / 2:普通 / 3:難 */
  difficulty: Difficulty

  /** 出典 例: "テキスト第3版 p.42" */
  source?: string

  /** 同一chapter_key内の表示順序 */
  displayOrder: number
}

// -----------------------------------------------
// 回答履歴型（Supabase problem_attempts テーブルに対応）
// -----------------------------------------------

export type ProblemAttempt = {
  /** UUID */
  id: string

  /** ユーザーID */
  userId: string

  /** 問題ID */
  problemId: string

  /** 正誤結果 */
  result: NonNullable<ProblemResult>

  /** 解答所要時間（秒）*/
  timeSpentSec?: number

  /** 回答日時 */
  attemptedAt: string
}

// -----------------------------------------------
// 集計統計型（Supabase problem_latest_results ビューに対応）
// -----------------------------------------------

export type ProblemStats = {
  /** 問題ID */
  problemId: string

  /** 最新の正誤結果 */
  latestResult: NonNullable<ProblemResult>

  /** 総回答回数 */
  attemptCount: number

  /** 正解回数 */
  correctCount: number

  /** 部分正解回数 */
  partialCount: number

  /** 不正解回数 */
  incorrectCount: number

  /** 最終回答日時 */
  lastAttemptedAt: string
}

// -----------------------------------------------
// 科目設定型
// -----------------------------------------------

export type SubjectConfig = {
  /** 科目キー */
  key: SubjectKey

  /** 正式名称 例: "証券分析とポートフォリオ・マネジメント" */
  label: string

  /** 短縮名称 例: "証券分析" */
  shortLabel: string

  /** ルートパス 例: "/problems/securities" */
  path: string

  /** Tailwind テキストカラークラス 例: "text-purple-400" */
  color: string

  /** チャート・ヒートマップ用16進カラー 例: "#7c4dff" */
  accentHex: string

  /** ヒートマップ背景用（薄い色）例: "rgba(124,77,255,0.15)" */
  accentBg: string
}

export const SUBJECT_CONFIGS: SubjectConfig[] = [
  {
    key: 'securities',
    label: '証券分析とポートフォリオ・マネジメント',
    shortLabel: '証券分析',
    path: '/problems/securities',
    color: 'text-purple-400',
    accentHex: '#7c4dff',
    accentBg: 'rgba(124,77,255,0.15)',
  },
  {
    key: 'finance',
    label: '財務分析・コーポレートファイナンス',
    shortLabel: '財務分析',
    path: '/problems/finance',
    color: 'text-blue-400',
    accentHex: '#60a5fa',
    accentBg: 'rgba(96,165,250,0.15)',
  },
  {
    key: 'market',
    label: '市場と経済の分析・数量分析',
    shortLabel: '市場分析',
    path: '/problems/market',
    color: 'text-emerald-400',
    accentHex: '#34d399',
    accentBg: 'rgba(52,211,153,0.15)',
  },
  {
    key: 'ethics',
    label: '職業倫理・行為基準',
    shortLabel: '職業倫理',
    path: '/problems/ethics',
    color: 'text-amber-400',
    accentHex: '#fbbf24',
    accentBg: 'rgba(251,191,36,0.15)',
  },
]

// -----------------------------------------------
// ユーティリティ型
// -----------------------------------------------

/** 科目別集計（getSubjectStats の戻り値） */
export type SubjectStatsResult = {
  total: number
  correct: number
  partial: number
  incorrect: number
  unanswered: number
  /** 回答済み問題の正答率（0〜100）*/
  accuracy: number
  /** 回答済み問題数 */
  answered: number
}

/** 章別集計（getChapterStats の戻り値） */
export type ChapterStatsResult = {
  chapterKey: string
  chapterName: string
  total: number
  correct: number
  answered: number
  /** 回答済み問題の正答率（0〜100）*/
  accuracy: number
}

/** QuizModePageのセッション結果 */
export type QuizSessionResult = {
  subject: SubjectKey
  chapterKey?: string
  totalProblems: number
  correct: number
  partial: number
  incorrect: number
  /** セッション開始日時 */
  startedAt: string
  /** セッション終了日時 */
  finishedAt: string
}
