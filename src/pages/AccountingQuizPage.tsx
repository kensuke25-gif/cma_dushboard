import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import renderMathInElement from 'katex/contrib/auto-render'
import {
  ACCOUNTING_QUIZ,
  ACCOUNTING_SEC_NAMES,
  accountingQid,
  type AccountingQuestion,
} from '../data/accountingQuiz'
import { useQADrillStore } from '../stores/qaDrillStore'

// アップロードされた元HTMLのレイアウト（ペーパー調）を忠実に再現するためのスコープ付きCSS。
const SCOPED_CSS = `
.acct-quiz{
  --ink:#1c2024; --ink-soft:#4a5159; --paper:#f4f1ea; --card:#fffefb; --line:#ddd6c9;
  --accent:#7c5a2e; --accent-soft:#b8946a; --green:#2f6b4f; --green-bg:#e7f0ea;
  --red:#9a3b32; --red-bg:#f5e5e2; --gold:#c79a4a;
  --shadow:0 1px 2px rgba(40,30,10,.05),0 8px 24px rgba(40,30,10,.06);
  font-family:"Zen Kaku Gothic New",system-ui,sans-serif;
  color:var(--ink); background:var(--paper);
  background-image:radial-gradient(circle at 1px 1px,rgba(124,90,46,.05) 1px,transparent 0);
  background-size:22px 22px; line-height:1.7; -webkit-font-smoothing:antialiased;
  min-height:100%; padding-bottom:80px;
}
.acct-quiz *{box-sizing:border-box}
.acct-quiz .wrap{max-width:780px;margin:0 auto;padding:0 18px}
.acct-quiz .back{display:inline-flex;align-items:center;gap:4px;font-size:.8rem;color:var(--accent);text-decoration:none;padding-top:18px}
.acct-quiz .back:hover{color:var(--ink)}
.acct-quiz header{padding:22px 0 22px;text-align:center}
.acct-quiz .kicker{font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:10px}
.acct-quiz h1{font-family:"Fraunces",serif;font-weight:600;font-size:clamp(1.7rem,5vw,2.5rem);letter-spacing:.01em;line-height:1.15;margin:0}
.acct-quiz h1 .ja{display:block;font-family:"Zen Kaku Gothic New",sans-serif;font-size:.5em;font-weight:500;letter-spacing:.12em;color:var(--ink-soft);margin-top:8px}
.acct-quiz .sub{margin-top:14px;font-size:.85rem;color:var(--ink-soft)}
.acct-quiz .rule{width:60px;height:2px;background:var(--accent);margin:20px auto 0;border-radius:2px}
.acct-quiz .progress-wrap{position:sticky;top:0;z-index:20;background:linear-gradient(var(--paper),var(--paper) 70%,rgba(244,241,234,0));padding:12px 0 16px}
.acct-quiz .progress-inner{max-width:780px;margin:0 auto;padding:0 18px;display:flex;align-items:center;gap:14px}
.acct-quiz .bar{flex:1;height:8px;background:#e4ded1;border-radius:99px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}
.acct-quiz .bar > i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--accent-soft),var(--accent));transition:width .4s cubic-bezier(.4,0,.2,1)}
.acct-quiz .bar-label{font-size:.78rem;color:var(--ink-soft);white-space:nowrap;font-weight:500;font-variant-numeric:tabular-nums}
.acct-quiz .controls{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px 0 26px}
.acct-quiz .chip{font-family:inherit;font-size:.8rem;font-weight:500;padding:7px 15px;border:1px solid var(--line);border-radius:99px;background:var(--card);color:var(--ink-soft);cursor:pointer;transition:all .18s}
.acct-quiz .chip:hover{border-color:var(--accent-soft);color:var(--ink)}
.acct-quiz .chip.active{background:var(--accent);border-color:var(--accent);color:#fff}
.acct-quiz .toolbar{display:flex;gap:8px;justify-content:center;margin-bottom:26px;flex-wrap:wrap}
.acct-quiz .btn{font-family:inherit;font-size:.8rem;font-weight:500;padding:8px 16px;border-radius:8px;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink-soft);transition:all .18s}
.acct-quiz .btn:hover{border-color:var(--accent-soft);color:var(--ink)}
.acct-quiz .btn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.acct-quiz .btn.primary:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.acct-quiz .sec-head{display:flex;align-items:center;gap:12px;margin:34px 0 16px}
.acct-quiz .sec-badge{font-family:"Fraunces",serif;font-size:1.1rem;font-weight:600;width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff}
.acct-quiz .sec-title{font-weight:700;font-size:1.05rem;letter-spacing:.04em}
.acct-quiz .sec-line{flex:1;height:1px;background:var(--line)}
.acct-quiz .card{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:14px;box-shadow:var(--shadow);overflow:hidden;transition:opacity .25s}
.acct-quiz .q-row{display:flex;gap:14px;padding:18px 20px;cursor:pointer;align-items:flex-start}
.acct-quiz .q-num{font-family:"Fraunces",serif;font-weight:600;font-size:.95rem;color:var(--accent);flex:0 0 auto;min-width:26px;padding-top:1px;font-variant-numeric:tabular-nums}
.acct-quiz .q-text{flex:1;font-size:.98rem;font-weight:500}
.acct-quiz .chevron{flex:0 0 auto;color:var(--accent-soft);transition:transform .25s;margin-top:3px}
.acct-quiz .card.open .chevron{transform:rotate(90deg)}
.acct-quiz .answer{max-height:0;overflow:hidden;transition:max-height .35s cubic-bezier(.4,0,.2,1);border-top:0 solid var(--line)}
.acct-quiz .card.open .answer{max-height:2000px;border-top:1px solid var(--line)}
.acct-quiz .answer-inner{padding:18px 20px 20px;background:linear-gradient(180deg,#fbf7ee,var(--card))}
.acct-quiz .answer-label{font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:8px}
.acct-quiz .answer-body{font-size:.95rem;color:var(--ink);line-height:1.85}
.acct-quiz .answer-body .katex{font-size:1.05em}
.acct-quiz .answer-body .katex-display{margin:.6em 0;overflow-x:auto;overflow-y:hidden;padding:2px 0}
.acct-quiz .grade{display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px dashed var(--line)}
.acct-quiz .grade-btn{font-family:inherit;font-size:.8rem;font-weight:600;padding:8px 16px;border-radius:8px;cursor:pointer;border:1px solid;transition:all .15s;flex:1;text-align:center}
.acct-quiz .grade-ok{border-color:#bcd6c8;background:var(--green-bg);color:var(--green)}
.acct-quiz .grade-ok:hover{background:var(--green);color:#fff}
.acct-quiz .grade-ng{border-color:#e4c5c0;background:var(--red-bg);color:var(--red)}
.acct-quiz .grade-ng:hover{background:var(--red);color:#fff}
.acct-quiz .card.correct .grade-ok{background:var(--green);color:#fff}
.acct-quiz .card.wrong .grade-ng{background:var(--red);color:#fff}
.acct-quiz .status-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px;margin-top:7px;background:transparent;transition:background .2s}
.acct-quiz .card.correct .status-dot{background:var(--green)}
.acct-quiz .card.wrong .status-dot{background:var(--red)}
.acct-quiz .summary{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:30px 0;text-align:center;box-shadow:var(--shadow)}
.acct-quiz .summary .nums{display:flex;justify-content:center;gap:30px;margin-top:10px}
.acct-quiz .summary .n{font-family:"Fraunces",serif;font-size:1.8rem;font-weight:600}
.acct-quiz .summary .n.ok{color:var(--green)}
.acct-quiz .summary .n.ng{color:var(--red)}
.acct-quiz .summary .lbl{font-size:.72rem;color:var(--ink-soft);letter-spacing:.08em}
.acct-quiz footer{text-align:center;color:var(--ink-soft);font-size:.78rem;margin-top:40px;padding-top:20px}
@media(max-width:560px){
  .acct-quiz .q-row{padding:15px 15px}
  .acct-quiz .answer-inner{padding:16px 15px 18px}
  .acct-quiz .grade{flex-direction:column}
}
`

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&display=swap'

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SECTIONS = Object.keys(ACCOUNTING_SEC_NAMES)

export default function AccountingQuizPage() {
  const progress = useQADrillStore(s => s.progress)
  const initialize = useQADrillStore(s => s.initialize)
  const setResult = useQADrillStore(s => s.setResult)

  useEffect(() => { void initialize() }, [initialize])

  const [filter, setFilter] = useState<string>('all')
  const [order, setOrder] = useState<number[]>(() => ACCOUNTING_QUIZ.map(d => d.n))
  const [openIds, setOpenIds] = useState<Set<number>>(new Set())
  const quizRef = useRef<HTMLDivElement>(null)

  const byNum = useMemo(() => {
    const m = new Map<number, AccountingQuestion>()
    ACCOUNTING_QUIZ.forEach(d => m.set(d.n, d))
    return m
  }, [])

  const total = ACCOUNTING_QUIZ.length
  const okCount = ACCOUNTING_QUIZ.filter(d => progress[accountingQid(d.n)] === 'ok').length
  const ngCount = ACCOUNTING_QUIZ.filter(d => progress[accountingQid(d.n)] === 'ng').length
  const done = okCount + ngCount

  const items = useMemo(() => order.map(n => byNum.get(n)!).filter(Boolean), [order, byNum])
  const visible = useMemo(() => items.filter(d => {
    if (filter === 'all') return true
    if (filter === 'wrong') return progress[accountingQid(d.n)] === 'ng'
    return d.c === filter
  }), [items, filter, progress])

  // KaTeX 数式を可視カードに描画
  useLayoutEffect(() => {
    if (quizRef.current) {
      renderMathInElement(quizRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      })
    }
  }, [visible, openIds])

  const toggleOpen = (n: number) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }

  const grade = (n: number, result: 'ok' | 'ng') => {
    const qid = accountingQid(n)
    setResult(qid, progress[qid] === result ? null : result)
  }

  const showSecHeads = filter === 'all'

  // 新しいセクションの先頭となる問題番号の集合を事前計算（描画中の変数再代入を避ける）
  const secHeadNums = useMemo(() => {
    const set = new Set<number>()
    if (!showSecHeads) return set
    let last: string | null = null
    for (const d of visible) {
      if (d.c !== last) { set.add(d.n); last = d.c }
    }
    return set
  }, [visible, showSecHeads])

  return (
    <div className="acct-quiz">
      <style>{SCOPED_CSS}</style>

      <div className="wrap">
        <Link to="/drills" className="back">
          <ChevronLeft size={14} /> ドリル一覧へ戻る
        </Link>
      </div>

      <header>
        <div className="wrap">
          <div className="kicker">CMA Level II · Quick Drill</div>
          <h1>Accounting Systems<span className="ja">証券アナリスト2次 一問一答 — 会計制度</span></h1>
          <p className="sub">2021〜2025年度 過去問 + テキスト第3章「会計制度」より抽出 · 全{total}問 · 答えをタップして確認</p>
          <div className="rule" />
        </div>
      </header>

      <div className="progress-wrap">
        <div className="progress-inner">
          <div className="bar"><i style={{ width: `${(done / total) * 100}%` }} /></div>
          <span className="bar-label">{done} / {total}</span>
        </div>
      </div>

      <div className="wrap">
        <div className="controls">
          <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>すべて</button>
          {SECTIONS.map(c => (
            <button key={c} className={`chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
              {c} {ACCOUNTING_SEC_NAMES[c]}
            </button>
          ))}
          <button className={`chip ${filter === 'wrong' ? 'active' : ''}`} onClick={() => setFilter('wrong')}>✗ 間違いのみ</button>
        </div>

        <div className="toolbar">
          <button className="btn" onClick={() => setOpenIds(new Set(visible.map(d => d.n)))}>すべて開く</button>
          <button className="btn" onClick={() => setOpenIds(new Set())}>すべて閉じる</button>
          <button className="btn" onClick={() => { setOrder(prev => shuffle(prev)); setFilter('all') }}>シャッフル</button>
          <button
            className="btn primary"
            onClick={() => {
              if (confirm('会計制度ドリルの記録をリセットしますか？')) {
                ACCOUNTING_QUIZ.forEach(d => setResult(accountingQid(d.n), null))
              }
            }}
          >記録をリセット</button>
        </div>

        <div ref={quizRef}>
          {visible.map(d => {
            const qid = accountingQid(d.n)
            const result = progress[qid]
            const isOpen = openIds.has(d.n)
            const secHead = secHeadNums.has(d.n)
            return (
              <div key={d.n}>
                {secHead && (
                  <div className="sec-head">
                    <div className="sec-badge">{d.c}</div>
                    <div className="sec-title">{ACCOUNTING_SEC_NAMES[d.c]}</div>
                    <div className="sec-line" />
                  </div>
                )}
                <div className={`card ${isOpen ? 'open' : ''} ${result === 'ok' ? 'correct' : ''} ${result === 'ng' ? 'wrong' : ''}`}>
                  <div className="q-row" onClick={() => toggleOpen(d.n)}>
                    <span className="status-dot" />
                    <span className="q-num">{d.n}</span>
                    <span className="q-text" dangerouslySetInnerHTML={{ __html: d.q }} />
                    <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                  </div>
                  <div className="answer">
                    <div className="answer-inner">
                      <div className="answer-label">Answer</div>
                      <div className="answer-body" dangerouslySetInnerHTML={{ __html: d.a }} />
                      <div className="grade">
                        <button className="grade-btn grade-ok" onClick={e => { e.stopPropagation(); grade(d.n, 'ok') }}>○ できた</button>
                        <button className="grade-btn grade-ng" onClick={e => { e.stopPropagation(); grade(d.n, 'ng') }}>× 復習する</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="summary">
          <div style={{ fontWeight: 700, letterSpacing: '.04em' }}>本日の到達度</div>
          <div className="nums">
            <div><div className="n ok">{okCount}</div><div className="lbl">正解</div></div>
            <div><div className="n ng">{ngCount}</div><div className="lbl">要復習</div></div>
            <div><div className="n">{total - done}</div><div className="lbl">未着手</div></div>
          </div>
        </div>

        <footer>
          繰り返し回すことで反射的に答えられるレベルを目指してください。<br />
          記録はSupabaseに保存され、ログインすればデバイス間で共有されます。
        </footer>
      </div>
    </div>
  )
}

// Google Fonts を一度だけ読み込む
if (typeof document !== 'undefined' && !document.getElementById('acct-quiz-fonts')) {
  const link = document.createElement('link')
  link.id = 'acct-quiz-fonts'
  link.rel = 'stylesheet'
  link.href = FONT_HREF
  document.head.appendChild(link)
}
