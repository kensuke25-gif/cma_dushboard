import { useState, useRef, useCallback } from 'react'
import { Upload, FileJson, CheckCircle, AlertTriangle, X, UploadCloud } from 'lucide-react'
import { useQuizStore } from '../../stores/quizStore'
import { SUBJECTS } from '../dashboard/StudyRecordPanel'

type RawQuestion = {
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
}

type ParsedFile = {
  subject: string
  field: string
  questions: RawQuestion[]
}

type UploadState = 'idle' | 'parsed' | 'uploading' | 'success' | 'error'

function validateQuestion(q: unknown, index: number): string | null {
  if (!q || typeof q !== 'object') return `問${index + 1}: オブジェクトではありません`
  const obj = q as Record<string, unknown>
  if (typeof obj.question !== 'string' || !obj.question.trim()) return `問${index + 1}: question が空です`
  if (!Array.isArray(obj.options) || obj.options.length < 2) return `問${index + 1}: options は2つ以上必要です`
  if (obj.options.some((o: unknown) => typeof o !== 'string')) return `問${index + 1}: options はすべて文字列にしてください`
  if (typeof obj.correct_answer !== 'number' || obj.correct_answer < 0 || obj.correct_answer >= obj.options.length) {
    return `問${index + 1}: correct_answer が範囲外です（0〜${(obj.options as unknown[]).length - 1}）`
  }
  return null
}

export default function QuizUpload() {
  const [state, setState] = useState<UploadState>('idle')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [existingCount, setExistingCount] = useState(0)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadQuestions, countExisting } = useQuizStore()

  async function processFile(file: File) {
    setError('')
    setParsed(null)
    setState('idle')

    if (!file.name.endsWith('.json')) {
      setError('JSONファイル（.json）を選択してください')
      return
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const subject = data.subject as string
      const field = data.field as string

      if (!subject || !(SUBJECTS as readonly string[]).includes(subject)) {
        setError(`subject が無効です。次のいずれかにしてください: ${SUBJECTS.join(' / ')}`)
        return
      }
      if (!field || typeof field !== 'string' || !field.trim()) {
        setError('field が空です')
        return
      }
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setError('questions が空の配列です')
        return
      }

      for (let i = 0; i < data.questions.length; i++) {
        const err = validateQuestion(data.questions[i], i)
        if (err) { setError(err); return }
      }

      const count = await countExisting(subject, field)
      setExistingCount(count)
      setParsed({ subject, field, questions: data.questions })
      setState('parsed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー'
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('テーブル')) {
        setError('Supabase にテーブルが存在しません。Dashboard → SQL Editor でマイグレーションSQLを実行してください。')
      } else {
        setError(`エラー: ${msg}`)
      }
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    processFile(files[0])
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragging(false), [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload() {
    if (!parsed) return
    setState('uploading')
    try {
      await uploadQuestions(parsed.subject, parsed.field, parsed.questions)
      setState('success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー'
      if (msg.includes('relation') || msg.includes('does not exist')) {
        setError('Supabase にテーブルが存在しません。Dashboard → SQL Editor でマイグレーションSQLを実行してください。')
      } else {
        setError(`アップロードに失敗しました: ${msg}`)
      }
      setState('error')
    }
  }

  function reset() {
    setState('idle')
    setParsed(null)
    setError('')
    setExistingCount(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7c4dff]/20 mb-4">
          <UploadCloud className="w-7 h-7 text-[#7c4dff]" />
        </div>
        <h2 className="text-xl font-semibold text-white">問題をアップロード</h2>
        <p className="text-sm text-[#8888aa] mt-1">
          JSONファイルを選択して問題を登録します
        </p>
      </div>

      {/* ドロップゾーン */}
      {state === 'idle' && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 py-12 px-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? 'border-[#7c4dff] bg-[#7c4dff]/10'
              : 'border-[#2a2a4a] bg-[#111125] hover:border-[#3a3a5c] hover:bg-[#16162a]'
          }`}
        >
          <FileJson className="w-10 h-10 text-[#4a4a7a]" />
          <div className="text-center">
            <p className="text-[#c8c8e8] font-medium">ファイルをドロップ</p>
            <p className="text-sm text-[#8888aa] mt-1">またはクリックして選択（.json）</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="mt-4 p-4 rounded-xl border border-red-500/50 bg-red-900/20 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={reset} className="text-xs text-red-400 underline mt-1">別のファイルを選択</button>
          </div>
        </div>
      )}

      {/* パース済みプレビュー */}
      {parsed && (state === 'parsed' || state === 'uploading') && (
        <div className="space-y-4">
          {/* サマリーカード */}
          <div className="p-5 rounded-2xl border border-[#2a2a4a] bg-[#111125]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#c8c8e8]">ファイルの内容</span>
              {state === 'parsed' && (
                <button onClick={reset} className="text-[#5a5a7a] hover:text-[#8888aa]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#1a1a2e] text-center">
                <p className="text-xs text-[#8888aa] mb-1">科目</p>
                <p className="text-sm font-medium text-white">{parsed.subject}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#1a1a2e] text-center">
                <p className="text-xs text-[#8888aa] mb-1">分野</p>
                <p className="text-sm font-medium text-white">{parsed.field}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#1a1a2e] text-center">
                <p className="text-xs text-[#8888aa] mb-1">問題数</p>
                <p className="text-sm font-medium text-white">{parsed.questions.length}問</p>
              </div>
            </div>
          </div>

          {/* 置き換え警告 */}
          {existingCount > 0 && (
            <div className="p-4 rounded-xl border border-orange-500/50 bg-orange-900/20 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-300">
                <span className="font-medium">既存の{existingCount}問が削除されます。</span>
                <br />「{parsed.subject} / {parsed.field}」の問題をすべて新しいファイルの内容で置き換えます。
              </p>
            </div>
          )}

          {/* 問題プレビュー（最初の3問） */}
          <div>
            <p className="text-xs text-[#8888aa] mb-2">プレビュー（最初の3問）</p>
            <div className="space-y-2">
              {parsed.questions.slice(0, 3).map((q, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#111125] border border-[#2a2a4a]">
                  <p className="text-sm text-[#c8c8e8] line-clamp-2">{i + 1}. {q.question}</p>
                  <p className="text-xs text-[#5a5a7a] mt-1">{q.options.length}択 / 正解: {String.fromCharCode(65 + q.correct_answer)}</p>
                </div>
              ))}
              {parsed.questions.length > 3 && (
                <p className="text-xs text-[#5a5a7a] text-center">他 {parsed.questions.length - 3}問</p>
              )}
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={reset}
              disabled={state === 'uploading'}
              className="flex-1 py-3.5 rounded-xl border border-[#2a2a4a] text-[#8888aa] hover:border-[#3a3a5c] text-sm font-medium transition-all disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpload}
              disabled={state === 'uploading'}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                state === 'uploading'
                  ? 'bg-[#252540] text-[#4a4a6a] cursor-wait'
                  : existingCount > 0
                  ? 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'
                  : 'bg-[#7c4dff] text-white hover:bg-[#6a3de8] active:scale-95'
              }`}
            >
              <Upload className="w-4 h-4" />
              {state === 'uploading' ? 'アップロード中...' : existingCount > 0 ? '置き換えてアップロード' : 'アップロード'}
            </button>
          </div>
        </div>
      )}

      {/* 成功 */}
      {state === 'success' && parsed && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 border border-green-500/50 mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-white font-semibold mb-1">アップロード完了</p>
          <p className="text-sm text-[#8888aa]">
            {parsed.subject} / {parsed.field} の {parsed.questions.length}問を登録しました
          </p>
          <button
            onClick={reset}
            className="mt-6 px-6 py-2.5 rounded-xl border border-[#2a2a4a] text-[#c8c8e8] hover:border-[#3a3a5c] text-sm font-medium transition-all"
          >
            続けて追加する
          </button>
        </div>
      )}

      {/* テンプレートダウンロードリンク */}
      {(state === 'idle' || state === 'success') && (
        <div className="mt-8 p-4 rounded-xl border border-[#2a2a4a] bg-[#111125]">
          <p className="text-xs text-[#8888aa] mb-2 font-medium">JSONフォーマット</p>
          <pre className="text-xs text-[#6a6a9a] overflow-x-auto leading-relaxed">{`{
  "subject": "証券分析",
  "field": "分野名",
  "questions": [
    {
      "question": "問題文",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "解説（省略可）"
    }
  ]
}`}</pre>
        </div>
      )}
    </div>
  )
}
