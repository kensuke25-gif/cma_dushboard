import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Pencil, Check, StickyNote, Loader2 } from 'lucide-react'
import { useMemoStore, type Memo } from '../../stores/memoStore'

// ─── モーダル ──────────────────────────────────────────────────────────────────

type ModalProps = {
  memo: Memo | null          // null = 新規作成モード
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

  // 背景クリックで閉じる
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
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-2xl border border-[#2a2a4a] shadow-2xl flex flex-col max-h-[85vh]">
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
              rows={8}
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

// ─── パネル ────────────────────────────────────────────────────────────────────

export default function MemoPanel() {
  const { memos, loading, fetchMemos } = useMemoStore()
  const [selectedMemo, setSelectedMemo] = useState<Memo | null | undefined>(undefined)
  // undefined = モーダル非表示, null = 新規作成, Memo = 既存メモ表示

  useEffect(() => { fetchMemos() }, [fetchMemos])

  const modalOpen = selectedMemo !== undefined

  return (
    <>
      <div className="bg-[#111125] rounded-2xl border border-[#2a2a4a] p-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="w-4 h-4 text-[#7c4dff]" strokeWidth={1.5} />
          <h3 className="flex-1 text-sm font-semibold text-[#c8c8e8]">メモ</h3>
          <button
            onClick={() => setSelectedMemo(null)}
            className="p-1.5 rounded-lg text-[#5a5a7a] hover:text-[#a78bfa] hover:bg-[#7c4dff]/10 transition-colors"
            title="メモを追加"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* メモ一覧 */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 text-[#7c4dff] animate-spin" />
          </div>
        ) : memos.length === 0 ? (
          <p className="text-xs text-[#5a5a7a] text-center py-4">メモがありません</p>
        ) : (
          <ul className="space-y-1">
            {memos.map(memo => (
              <li key={memo.id}>
                <button
                  onClick={() => setSelectedMemo(memo)}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-[#c8c8e8] hover:bg-[#1e1e3a] hover:text-white transition-colors truncate"
                >
                  {memo.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* モーダル */}
      {modalOpen && (
        <MemoModal
          memo={selectedMemo}
          onClose={() => setSelectedMemo(undefined)}
          onSaved={() => fetchMemos()}
          onDeleted={() => fetchMemos()}
        />
      )}
    </>
  )
}
