// =============================================
// src/components/MathText.tsx
// LaTeX 数式 + プレーンテキスト混在レンダリング
// react-katex を使用
// =============================================

import katex from 'katex'
// KaTeX CSS は src/main.tsx で import 済み

// -----------------------------------------------
// 型定義
// -----------------------------------------------

type Props = {
  /** レンダリングするテキスト（LaTeX記法を含む可） */
  text: string

  /** ルート要素に追加する Tailwind クラス */
  className?: string
}

// -----------------------------------------------
// テキストをセグメントに分割するパーサー
// -----------------------------------------------

type Segment =
  | { type: 'text';   value: string }
  | { type: 'inline'; value: string }   // $...$
  | { type: 'block';  value: string }   // $$...$$

/**
 * テキストを「プレーンテキスト」「インライン数式」「ブロック数式」
 * のセグメント配列に分割する。
 *
 * 処理順序:
 *   1. $$...$$ （ブロック数式）を先に処理
 *   2. $...$   （インライン数式）を処理
 *   3. 残りはプレーンテキスト
 */
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = []

  // ブロック数式 $$...$$ とインライン数式 $...$ を
  // 一度の走査で分割する正規表現
  // $$...$$ を先にマッチさせることで優先度を確保
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // マッチ前のプレーンテキスト
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      })
    }

    const matched = match[0]

    if (matched.startsWith('$$')) {
      // ブロック数式: $$ を除去
      segments.push({
        type: 'block',
        value: matched.slice(2, -2).trim(),
      })
    } else {
      // インライン数式: $ を除去
      segments.push({
        type: 'inline',
        value: matched.slice(1, -1).trim(),
      })
    }

    lastIndex = pattern.lastIndex
  }

  // 末尾のプレーンテキスト
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    })
  }

  return segments
}

// -----------------------------------------------
// エラーフォールバック付き数式レンダラー
// -----------------------------------------------

type MathRendererProps = {
  latex: string
  display: boolean
}

function MathRenderer({ latex, display }: MathRendererProps) {
  let html: string
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: display,
      output: 'html',
    })
  } catch {
    const raw = display ? `$$${latex}$$` : `$${latex}$`
    return (
      <span className="font-mono text-amber-400 text-sm">{raw}</span>
    )
  }

  if (display) {
    return (
      <div
        className="my-3 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// -----------------------------------------------
// プレーンテキストレンダラー
// 改行 \n を <br /> に変換
// -----------------------------------------------

function PlainText({ value }: { value: string }) {
  const lines = value.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

// -----------------------------------------------
// メインコンポーネント
// -----------------------------------------------

export default function MathText({ text, className }: Props) {
  if (!text) return null

  const segments = parseSegments(text)

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'block':
            return (
              <MathRenderer
                key={i}
                latex={seg.value}
                display={true}
              />
            )
          case 'inline':
            return (
              <MathRenderer
                key={i}
                latex={seg.value}
                display={false}
              />
            )
          case 'text':
          default:
            return <PlainText key={i} value={seg.value} />
        }
      })}
    </span>
  )
}
