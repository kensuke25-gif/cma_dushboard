// =============================================
// src/components/MathText.tsx
// LaTeX 数式 + マークダウンテーブル + プレーンテキスト混在レンダリング
// =============================================

import katex from 'katex'
// KaTeX CSS は src/main.tsx で import 済み

// -----------------------------------------------
// 型定義
// -----------------------------------------------

type Props = {
  /** レンダリングするテキスト（LaTeX記法・マークダウンテーブルを含む可） */
  text: string
  /** ルート要素に追加する Tailwind クラス */
  className?: string
}

// テキストブロック内の数式セグメント
type MathSegment =
  | { type: 'text';   value: string }
  | { type: 'inline'; value: string }   // $...$
  | { type: 'block';  value: string }   // $$...$$

// トップレベルセグメント（テーブル vs テキストブロック）
type TopSegment =
  | { type: 'text';  value: string }
  | { type: 'table'; headers: string[]; rows: string[][]; aligns: Align[] }

type Align = 'left' | 'center' | 'right'

// -----------------------------------------------
// マークダウンテーブルパーサー
// -----------------------------------------------

/** セパレーター行かどうか（例: |---|:--:|---:| ） */
function isSeparatorRow(line: string): boolean {
  return /^\|[\s|:\-]+$/.test(line.trim()) && line.includes('-')
}

/** `|` で始まる行かどうか */
function isTableLine(line: string): boolean {
  return line.trimStart().startsWith('|')
}

/** セル列を配列に変換 */
function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(c => c.trim())
}

/** セパレーターのコロン位置からテキスト整列方向を取得 */
function parseAlign(sep: string): Align {
  const t = sep.trim()
  if (t.startsWith(':') && t.endsWith(':')) return 'center'
  if (t.endsWith(':')) return 'right'
  return 'left'
}

/** テーブルバッファをパースして TopSegment を返す */
function flushTableBuffer(buf: string[]): TopSegment | null {
  if (buf.length < 2) return null

  const sepIdx = buf.findIndex(isSeparatorRow)
  if (sepIdx < 0) return null  // セパレーターなし → テーブルとみなさない

  const headerLines = buf.slice(0, sepIdx)
  const sepLine     = buf[sepIdx]
  const bodyLines   = buf.slice(sepIdx + 1).filter(l => l.trim() !== '')

  const headers = headerLines.length > 0 ? parseTableRow(headerLines[0]) : []
  const aligns  = parseTableRow(sepLine).map(parseAlign)
  const rows    = bodyLines.map(parseTableRow)

  return { type: 'table', headers, rows, aligns }
}

/**
 * テキスト全体を「テーブルブロック」と「テキストブロック」に分割する。
 * | で始まる連続行をテーブルブロック候補として扱う。
 */
function splitByTables(text: string): TopSegment[] {
  const lines   = text.split('\n')
  const result: TopSegment[] = []
  let textBuf: string[] = []
  let tableBuf: string[] = []

  function flushText() {
    if (textBuf.length === 0) return
    result.push({ type: 'text', value: textBuf.join('\n') })
    textBuf = []
  }

  function flushTable() {
    if (tableBuf.length === 0) return
    const seg = flushTableBuffer(tableBuf)
    if (seg) {
      result.push(seg)
    } else {
      // テーブルとして認識できなかった場合はテキストとして退避
      textBuf.push(...tableBuf)
    }
    tableBuf = []
  }

  for (const line of lines) {
    if (isTableLine(line)) {
      flushText()
      tableBuf.push(line)
    } else {
      flushTable()
      textBuf.push(line)
    }
  }
  flushText()
  flushTable()

  return result
}

// -----------------------------------------------
// 数式セグメントパーサー（既存ロジック）
// -----------------------------------------------

/**
 * テキストを「プレーンテキスト」「インライン数式」「ブロック数式」
 * のセグメント配列に分割する。
 */
function parseSegments(text: string): MathSegment[] {
  const segments: MathSegment[] = []
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    const matched = match[0]
    if (matched.startsWith('$$')) {
      segments.push({ type: 'block',  value: matched.slice(2, -2).trim() })
    } else {
      segments.push({ type: 'inline', value: matched.slice(1, -1).trim() })
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments
}

// -----------------------------------------------
// LaTeX 前処理（よくある記法ミスを自動補正）
// -----------------------------------------------

function sanitizeLatex(latex: string): string {
  return latex.replace(/\\frac([^{\s\\])/g, '\\frac{$1}')
}

// -----------------------------------------------
// エラーフォールバック付き数式レンダラー
// -----------------------------------------------

function MathRenderer({ latex, display }: { latex: string; display: boolean }) {
  let html: string
  try {
    html = katex.renderToString(sanitizeLatex(latex), {
      throwOnError: false,
      displayMode: display,
      output: 'html',
    })
  } catch {
    const raw = display ? `$$${latex}$$` : `$${latex}$`
    return <span className="font-mono text-amber-400 text-sm">{raw}</span>
  }

  if (display) {
    return <div className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// -----------------------------------------------
// プレーンテキストレンダラー（改行 → <br />）
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
// 数式セグメント列のレンダラー（テーブルセル内でも使用）
// -----------------------------------------------

function RenderMathSegments({ text }: { text: string }) {
  const segs = parseSegments(text)
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.type === 'block')  return <MathRenderer key={i} latex={seg.value} display={true} />
        if (seg.type === 'inline') return <MathRenderer key={i} latex={seg.value} display={false} />
        return <PlainText key={i} value={seg.value} />
      })}
    </>
  )
}

// -----------------------------------------------
// マークダウンテーブルレンダラー
// -----------------------------------------------

const alignClass: Record<Align, string> = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
}

function MarkdownTable({ headers, rows, aligns }: {
  headers: string[]
  rows: string[][]
  aligns: Align[]
}) {
  const colAlign = (i: number): Align => aligns[i] ?? 'left'

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-[#2a2a4a]">
      <table className="min-w-full text-sm border-collapse">
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 font-semibold text-[#c8c8e8] bg-[#252540] border-b border-[#2a2a4a] ${alignClass[colAlign(i)]}`}
                >
                  <RenderMathSegments text={h} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-[#1a1a2e]' : 'bg-[#1e1e3a]'}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 text-[#c8c8e8] border-b border-[#2a2a4a] last:border-b-0 ${alignClass[colAlign(ci)]}`}
                >
                  <RenderMathSegments text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// -----------------------------------------------
// メインコンポーネント
// -----------------------------------------------

export default function MathText({ text, className }: Props) {
  if (!text) return null

  const topSegments = splitByTables(text)

  return (
    <span className={className}>
      {topSegments.map((seg, i) => {
        if (seg.type === 'table') {
          return (
            <MarkdownTable
              key={i}
              headers={seg.headers}
              rows={seg.rows}
              aligns={seg.aligns}
            />
          )
        }
        // テキストブロック → 既存の数式レンダリング
        return <RenderMathSegments key={i} text={seg.value} />
      })}
    </span>
  )
}
