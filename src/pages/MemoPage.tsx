import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Pencil, Check, StickyNote, Loader2, Search } from 'lucide-react'
import { useMemoStore, type Memo } from '../stores/memoStore'

// ─── モーダル ────────────────────────────────────────────────────

type ModalProps = {
  memo: Memo | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function MemoModal({ memo, onClose, onSaved, onDeleted }: ModalProps) {
  const { addMemo, updateMemo, deleteMemo } = useMemoStore()
  const isNew = memo === null
  const [title, setTitle] = useState(memo?.title ?? '')
  const [body, setBody] = useState(memo?.body ?? '')
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) titleRef.current?.focus()
  }, [editing])

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleSave() {
    const t = title.trim()
    if (!t) return
    setSaving(true)
    try {
      if (isNew) {
        await addMemo(t, body.trim())
      } else {
        await updateMemo(memo.id, t, body.trim())
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!memo) return
    setSaving(true)
    try {
      await deleteMemo(memo.id)
      onDeleted()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = title.trim() !== ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl border border-[#2a2a4a] shadow-2xl flex flex-col max-h-[85vh]">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2a4a] shrink-0">
          <StickyNote className="w-4 h-4 text-[#7c4dff] shrink-0" strokeWidth={1.5} />
          {editing ? (
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="タイトル"
              className="flex-1 bg-transparent text-white text-base font-semibold placeholder-[#4a4a6a] focus:outline-none"
            />
          ) : (
            <h2 className="flex-1 text-base font-semibold text-white truncate">{memo?.title}</h2>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {!isNew && !editing && (
              <>
                <button
                  onClick={() => { setEditing(true); setConfirmDelete(false) }}
                  className="p-1.5 rounded-lg text-[#5a5a7a] hover:text-[#a78bfa] hover:bg-[#7c4dff]/10 transition-colors"
                  title="編集"
                >
                  <Pencil className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setConfirmDelete(v => !v)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    confirmDelete
                      ? 'text-red-400 bg-red-900/20'
                      : 'text-[#5a5a7a] hover:text-red-400 hover:bg-red-900/20'
                  }`}
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5a5a7a] hover:text-[#c8c8e8] hover:bg-[#252540] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 本文 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {editing ? (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="本文（省略可）"
              rows={10}
              className="w-full bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2.5 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] resize-none"
            />
          ) : (
            <p className="text-sm text-[#c8c8e8] leading-relaxed whitespace-pre-wrap">
              {memo?.body || <span className="text-[#5a5a7a] italic">本文なし</span>}
            </p>
          )}
        </div>

        {/* フッター */}
        {(editing || confirmDelete) && (
          <div className="px-5 py-4 border-t border-[#2a2a4a] shrink-0">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-red-300">このメモを削除しますか？</p>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs text-[#8888aa] hover:text-white rounded-lg hover:bg-[#252540] transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? '削除中…' : '削除する'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {!isNew && (
                  <button
                    onClick={() => { setEditing(false); setTitle(memo?.title ?? ''); setBody(memo?.body ?? '') }}
                    className="flex-1 py-2.5 rounded-xl border border-[#2a2a4a] text-sm text-[#8888aa] hover:border-[#3a3a5c] transition-colors"
                  >
                    キャンセル
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    canSave && !saving
                      ? 'bg-[#7c4dff] text-white hover:bg-[#6a3de8]'
                      : 'bg-[#252540] text-[#4a4a6a] cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Check className="w-3.5 h-3.5" />{isNew ? '追加する' : '保存する'}</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── メモページ ────────────────────────────────────────────────────

export default function MemoPage() {
  const { memos, loading, fetchMemos } = useMemoStore()
  const [selectedMemo, setSelectedMemo] = useState<Memo | null | undefined>(undefined)
  const [query, setQuery] = useState('')

  useEffect(() => { fetchMemos() }, [fetchMemos])

  const modalOpen = selectedMemo !== undefined

  const filtered = query.trim()
    ? memos.filter(m =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.body.toLowerCase().includes(query.toLowerCase())
      )
    : memos

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-[#7c4dff]" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-white">メモ</h2>
          <span className="text-xs text-[#8888aa]">（{memos.length}件）</span>
        </div>
        <button
          onClick={() => setSelectedMemo(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7c4dff]/20 text-[#a78bfa] hover:bg-[#7c4dff]/30 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          新規メモ
        </button>
      </div>

      {/* 検索 */}
      {memos.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a7a]" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="メモを検索…"
            className="w-full bg-[#111125] border border-[#2a2a4a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] transition-colors"
          />
        </div>
      )}

      {/* メモ一覧 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#7c4dff] animate-spin" />
        </div>
      ) : memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <StickyNote className="w-10 h-10 text-[#3a3a5c]" strokeWidth={1} />
          <p className="text-sm text-[#5a5a7a]">まだメモがありません</p>
          <button
            onClick={() => setSelectedMemo(null)}
            className="mt-2 px-4 py-2 rounded-xl bg-[#7c4dff]/20 text-[#a78bfa] hover:bg-[#7c4dff]/30 transition-colors text-sm font-medium"
          >
            最初のメモを作成する
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-[#5a5a7a] py-10">
          「{query}」に一致するメモはありません
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map(memo => (
            <button
              key={memo.id}
              onClick={() => setSelectedMemo(memo)}
              className="w-full text-left bg-[#111125] border border-[#2a2a4a] rounded-2xl px-5 py-4 hover:border-[#7c4dff]/40 hover:bg-[#16162a] transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-semibold text-white group-hover:text-[#a78bfa] transition-colors leading-snug">
                  {memo.title}
                </h3>
                <span className="text-[11px] text-[#5a5a7a] shrink-0 mt-0.5">
                  {formatDate(memo.updated_at)}
                </span>
              </div>
              {memo.body ? (
                <p className="text-xs text-[#8888aa] leading-relaxed line-clamp-2">
                  {memo.body}
                </p>
              ) : (
                <p className="text-xs text-[#4a4a6a] italic">本文なし</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* モーダル */}
      {modalOpen && (
        <MemoModal
          memo={selectedMemo}
          onClose={() => setSelectedMemo(undefined)}
          onSaved={() => fetchMemos()}
          onDeleted={() => fetchMemos()}
        />
      )}
    </div>
  )
}
