import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Play, Filter } from 'lucide-react'
import { useQAStore } from '../stores/qaStore'

export default function QAListPage() {
  const items = useQAStore(s => s.items)
  const history = useQAStore(s => s.history)
  const initialize = useQAStore(s => s.initialize)
  const deleteItem = useQAStore(s => s.deleteItem)

  const [keyword, setKeyword] = useState('')
  const [subject, setSubject] = useState<string>('all')
  const [unit, setUnit] = useState<string>('all')

  useEffect(() => { initialize() }, [initialize])

  const subjects = useMemo(() => {
    const set = new Set(items.map(i => i.subject).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [items])

  const units = useMemo(() => {
    const filtered = subject === 'all' ? items : items.filter(i => i.subject === subject)
    const set = new Set(filtered.map(i => i.unit).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [items, subject])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    return items.filter(i => {
      if (subject !== 'all' && i.subject !== subject) return false
      if (unit !== 'all' && i.unit !== unit) return false
      if (k && !i.question.toLowerCase().includes(k) && !i.answer.toLowerCase().includes(k)) return false
      return true
    })
  }, [items, keyword, subject, unit])

  const statsFor = (qaId: string) => {
    const hs = history.filter(h => h.qa_id === qaId)
    const correct = hs.filter(h => h.result === 'correct').length
    return { total: hs.length, correct }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">一問一答</h1>
          <p className="text-xs text-[#8888aa] mt-1">自作の問題を作成・演習できます（ワイヤーフレーム版）</p>
        </div>
        <Link
          to="/qa/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7c4dff] text-white text-sm font-medium hover:bg-[#6c3ddf] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規作成
        </Link>
      </div>

      {/* フィルター */}
      <div className="bg-[#111125] border border-[#2a2a4a] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-[#8888aa] mb-3">
          <Filter className="w-3.5 h-3.5" />
          フィルター
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="キーワード検索"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white placeholder-[#5a5a7a] focus:border-[#7c4dff] focus:outline-none"
            />
          </div>
          <select
            value={subject}
            onChange={e => { setSubject(e.target.value); setUnit('all') }}
            className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white focus:border-[#7c4dff] focus:outline-none"
          >
            {subjects.map(s => <option key={s} value={s}>{s === 'all' ? '科目: すべて' : s}</option>)}
          </select>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-white focus:border-[#7c4dff] focus:outline-none"
          >
            {units.map(u => <option key={u} value={u}>{u === 'all' ? '単元: すべて' : u}</option>)}
          </select>
        </div>
      </div>

      {/* 一覧 */}
      {filtered.length === 0 ? (
        <div className="bg-[#111125] border border-dashed border-[#2a2a4a] rounded-2xl p-10 text-center">
          <p className="text-sm text-[#8888aa] mb-4">
            {items.length === 0 ? 'まだ問題が登録されていません。' : '条件に一致する問題がありません。'}
          </p>
          {items.length === 0 && (
            <Link
              to="/qa/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7c4dff] text-white text-sm hover:bg-[#6c3ddf]"
            >
              <Plus className="w-4 h-4" />
              最初の問題を作成する
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map(item => {
            const s = statsFor(item.id)
            const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null
            return (
              <li
                key={item.id}
                className="bg-[#111125] border border-[#2a2a4a] rounded-2xl p-4 hover:border-[#7c4dff]/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
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
                        <span className="text-[10px] text-[#8888aa]">
                          正答率 {accuracy}% （{s.correct}/{s.total}）
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white line-clamp-2 break-words">{item.question}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/qa/${item.id}`}
                      title="演習する"
                      className="p-2 rounded-lg text-[#a78bfa] hover:bg-[#7c4dff]/20 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/qa/${item.id}/edit`}
                      title="編集"
                      className="p-2 rounded-lg text-[#8888aa] hover:bg-[#252540] hover:text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => { if (confirm('この問題を削除しますか？')) deleteItem(item.id) }}
                      title="削除"
                      className="p-2 rounded-lg text-[#8888aa] hover:bg-[#3a1a2a] hover:text-[#ff6b8a] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
