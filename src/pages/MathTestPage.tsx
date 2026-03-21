// =============================================
// src/pages/MathTestPage.tsx
// MathText コンポーネントの動作確認用テストページ
// 開発時のみ使用（本番には残しても無害）
// =============================================

import { useState } from 'react'
import MathText from '../components/MathText'

// 証券アナリスト試験で頻出の数式テストケース
const TEST_CASES = [
  {
    label: '① プレーンテキストのみ',
    text: '株式のリターンは過去の実績から推測することができる。',
  },
  {
    label: '② インライン数式（CAPMモデル）',
    text: 'CAPMモデルは $E(R_i) = R_f + \\beta_i(E(R_m) - R_f)$ で表される。',
  },
  {
    label: '③ ブロック数式（ポートフォリオ分散）',
    text: '2資産ポートフォリオの分散は以下の式で求められる。\n$$\\sigma_p^2 = w_1^2\\sigma_1^2 + w_2^2\\sigma_2^2 + 2w_1 w_2 \\sigma_{12}$$',
  },
  {
    label: '④ インラインとブロックの混在',
    text: 'シャープレシオ $S = \\frac{R_p - R_f}{\\sigma_p}$ を最大化するポートフォリオを接点ポートフォリオという。\n\n$$S^* = \\frac{E(R_p) - R_f}{\\sigma_p}$$\n\nここで $R_f$ はリスクフリーレート、$\\sigma_p$ はポートフォリオの標準偏差である。',
  },
  {
    label: '⑤ 複雑な数式（デュレーション）',
    text: 'デュレーションの計算式:\n$$D = \\frac{\\sum_{t=1}^{T} t \\cdot \\frac{CF_t}{(1+y)^t}}{\\sum_{t=1}^{T} \\frac{CF_t}{(1+y)^t}}$$\nここで $CF_t$ は $t$ 期のキャッシュフロー、$y$ は最終利回りである。',
  },
  {
    label: '⑥ 財務比率（ROE）',
    text: 'ROEは $ROE = \\frac{\\text{当期純利益}}{\\text{自己資本}} \\times 100$ として計算される。\nデュポン分解では $ROE = \\frac{\\text{純利益}}{\\text{売上高}} \\times \\frac{\\text{売上高}}{\\text{総資産}} \\times \\frac{\\text{総資産}}{\\text{自己資本}}$ となる。',
  },
  {
    label: '⑦ エラーケース（不正な LaTeX）',
    text: '不正な数式 $\\invalid{test}$ はフォールバック表示される。',
  },
  {
    label: '⑧ 改行を含むプレーンテキスト',
    text: '第1行目のテキスト\n第2行目のテキスト\n第3行目のテキスト',
  },
]

export default function MathTestPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">
            MathText 動作確認ページ
          </h1>
          <p className="text-sm text-[#8888aa]">
            KaTeX による数式レンダリングのテスト（開発用）
          </p>
        </div>

        {/* テストケース一覧 */}
        <div className="space-y-4">
          {TEST_CASES.map((tc, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#2a2a4a] overflow-hidden"
            >
              {/* ラベル */}
              <div className="px-4 py-2 bg-[#111125] border-b border-[#2a2a4a]">
                <span className="text-xs font-medium text-[#a78bfa]">
                  {tc.label}
                </span>
              </div>

              {/* 入力テキスト（raw） */}
              <div className="px-4 py-3 bg-[#0d0d1f] border-b border-[#2a2a4a]">
                <p className="text-[10px] text-[#5a5a7a] mb-1">INPUT</p>
                <pre className="text-xs text-[#8888aa] whitespace-pre-wrap font-mono">
                  {tc.text}
                </pre>
              </div>

              {/* レンダリング結果 */}
              <div className="px-4 py-4 bg-[#1e1e3a]">
                <p className="text-[10px] text-[#5a5a7a] mb-2">OUTPUT</p>
                <div className="text-sm text-[#c8c8e8] leading-relaxed">
                  <MathText text={tc.text} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* インタラクティブテスト */}
        <div className="mt-8 rounded-xl border border-[#2a2a4a] overflow-hidden">
          <div className="px-4 py-2 bg-[#111125] border-b border-[#2a2a4a]">
            <span className="text-xs font-medium text-[#a78bfa]">
              ⑨ インタラクティブテスト
            </span>
          </div>
          <InteractiveTest />
        </div>

      </div>
    </div>
  )
}

// インタラクティブテストコンポーネント
function InteractiveTest() {
  const [input, setInput] = useState(
    'シャープレシオ $S = \\frac{R_p - R_f}{\\sigma_p}$ を入力してみよう'
  )

  return (
    <div className="bg-[#1e1e3a]">
      <div className="px-4 pt-4">
        <p className="text-[10px] text-[#5a5a7a] mb-1">
          ここに LaTeX 入りテキストを入力
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full bg-[#111125] border border-[#2a2a4a] rounded-lg
                     px-3 py-2 text-xs text-[#c8c8e8] font-mono
                     focus:outline-none focus:border-[#7c4dff]
                     resize-none"
        />
      </div>
      <div className="px-4 pb-4">
        <p className="text-[10px] text-[#5a5a7a] mb-2">PREVIEW</p>
        <div className="text-sm text-[#c8c8e8] leading-relaxed min-h-[2rem]">
          <MathText text={input} />
        </div>
      </div>
    </div>
  )
}
