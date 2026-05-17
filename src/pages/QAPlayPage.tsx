import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, Check, X, ChevronRight, Pencil } from 'lucide-react'
import { useQAStore } from '../stores/qaStore'

export default function QAPlayPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const items = useQAStore(s => s.items)
  const history = useQAStore(s => s.history)
  const initialize = useQAStore(s => s.initialize)
  const recordAnswer = useQAStore(s => s.recordAnswer)

  useEffect(() => { initialize() }, [initialize])

  const item = useMemo(() => items.find(i => i.id === id), [items, id])
  const [revealed, setRevealed] = useState(false)
  const [recorded, setRecorded] = useState<null | 'correct' | 'wrong'>(null)

  useEffect(() => {
    setRevealed(false)
    setRecorded(null)
  }, [id])

  const stats = useMemo(() => {
    const hs = history.filter(h => h.qa_id === id)
    const correct = hs.filter(h => h.result === 'correct').length
    return { total: hs.length, correct }
  }, [history, id])

  const recentHistory = useMemo(() => {
    return history.filter(h => h.qa_id === id).slice(0, 10)
  }, [history, id])

  const goNext = () => {
    if (!item) return
    const sameSubject = items.filter(i => i.subject === item.subject)
    const pool = sameSubject.length > 1 ? sameSubject.filter(i => i.id !== item.id) : items.filter(i => i.id !== item.id)
    if (pool.length === 0) { navigate('/qa'); return }
    const next = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/qa/${next.id}`)
  }

  const onRecord = (result: 'correct' | 'wrong') => {
    if (!item || recorded) return
    recordAnswer(item.id, result)
    setRecorded(result)
  }

  if (!item) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link to="/qa" className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white mb-4">
          <ChevronLeft className="w-3.5 h-3.5" />
          一覧へ戻る
        </Link>
        <p className="text-sm text-[#8888aa]">問題が見つかりませんでした。</p>
      </div>
    )
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/qa" className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" />
          一覧へ戻る
        </Link>
        <Link
          to={`/qa/${item.id}/edit`}
          className="inline-flex items-center gap-1 text-xs text-[#8888aa] hover:text-white"
        >
          <Pencil className="w-3.5 h-3.5" />
          編集
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {item.subject && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c4dff]/20 text-[#a78bfa] font-medium">
            {item.subject}
          </span>
        )}
        {item.unit && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#252540] text-[#c8c8e8]">
            {item.unit}
          </span>
        )}
        {accuracy !== null && (
          <span className="text-[10px] text-[#8888aa] ml-auto">
            正答率 {accuracy}% （{stats.correct}/{stats.total}）
          </span>
        )}
      </div>

      {/* 問題カード */}
      <div className="bg-[#111125] border border-[#2a2a4a] rounded-2xl p-6 md:p-8 mb-4">
        <div className="text-xs text-[#8888aa] mb-2">問題</div>
        <p className="text-lg md:text-xl text-white whitespace-pre-wrap break-words leading-relaxed">
          {item.question}
        </p>
      </div>

      <p className="text-center text-xs text-[#5a5a7a] mb-4">
        頭の中で考えるか、ノートに書き出してから答えを見ましょう。
      </p>

      {/* 答え表示エリア */}
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full py-4 rounded-2xl bg-[#7c4dff] hover:bg-[#6c3ddf] text-white font-medium transition-colors inline-flex items-center justify-center gap-2"
        >
          <Eye className="w-5 h-5" />
          答えを見る
        </button>
      ) : (
        <>
          <div className="bg-[#1a1a30] border border-[#7c4dff]/50 rounded-2xl p-6 md:p-8 mb-4">
            <div className="text-xs text-[#a78bfa] mb-2">答え</div>
            <p className="text-base md:text-lg text-white whitespace-pre-wrap break-words leading-relaxed">
              {item.answer}
            </p>
          </div>

          {/* 自己採点 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => onRecord('wrong')}
              disabled={recorded !== null}
              className={`py-3 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                recorded === 'wrong'
                  ? 'bg-[#3a1a2a] border-[#ff6b8a] text-[#ff6b8a]'
                  : 'bg-[#111125] border-[#2a2a4a] text-[#8888aa] hover:border-[#ff6b8a]/60 hover:text-[#ff6b8a] disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <X className="w-4 h-4" />
              不正解
            </button>
            <button
              onClick={() => onRecord('correct')}
              disabled={recorded !== null}
              className={`py-3 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                recorded === 'correct'
                  ? 'bg-[#1a3a2a] border-[#4ade80] text-[#4ade80]'
                  : 'bg-[#111125] border-[#2a2a4a] text-[#8888aa] hover:border-[#4ade80]/60 hover:text-[#4ade80] disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              正解
            </button>
          </div>

          <button
            onClick={goNext}
            className="w-full py-3 rounded-xl bg-[#252540] hover:bg-[#2a2a4a] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
          >
            次の問題へ
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* 履歴 */}
      {recentHistory.length > 0 && (
        <div className="mt-8">
          <div className="text-xs text-[#8888aa] mb-2">回答履歴（最新10件）</div>
          <ul className="space-y-1">
            {recentHistory.map(h => (
              <li key={h.id} className="flex items-center gap-2 text-xs text-[#8888aa]">
                <span
                  className={`w-2 h-2 rounded-full ${h.result === 'correct' ? 'bg-[#4ade80]' : 'bg-[#ff6b8a]'}`}
                />
                <span>{new Date(h.answered_at).toLocaleString('ja-JP')}</span>
                <span className={h.result === 'correct' ? 'text-[#4ade80]' : 'text-[#ff6b8a]'}>
                  {h.result === 'correct' ? '正解' : '不正解'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
