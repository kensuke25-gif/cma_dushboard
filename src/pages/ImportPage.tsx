import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileJson, FileText,
  Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Problem } from '../types/problem'

// ===== 型定義 =====
type ImportStatus = 'idle' | 'parsing' | 'validating' | 'previewing' | 'importing' | 'done' | 'error'
type FileType = 'json' | 'csv'
type SubjectKey = 'securities' | 'finance' | 'market' | 'ethics'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface PreviewRow extends Problem {
  _isNew: boolean
}

interface ImportLog {
  id: string
  file_name: string
  file_type: string
  total_count: number
  success_count: number
  error_count: number
  subject_breakdown: Record<string, number>
  imported_at: string
}

interface ImportResult {
  success: number
  error: number
  errors: string[]
}

// ===== 定数 =====
const VALID_SUBJECTS: SubjectKey[] = ['securities', 'finance', 'market', 'ethics']
const SUBJECT_LABELS: Record<SubjectKey, string> = {
  securities: '証券分析',
  finance: '財務分析',
  market: '市場・経済',
  ethics: '職業倫理',
}
const REQUIRED_FIELDS = [
  'id', 'subject', 'chapter_key', 'chapter_name',
  'question_no', 'question_text', 'answer_text',
] as const
const CHUNK_SIZE = 100

// ===== CSVパーサー（RFC 4180準拠） =====
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Problem[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const problems: Problem[] = []
  let rowBuffer = ''
  let openQuotes = 0

  for (let i = 1; i < lines.length; i++) {
    rowBuffer += (rowBuffer ? '\n' : '') + lines[i]
    openQuotes += (lines[i].match(/"/g) || []).length
    if (openQuotes % 2 !== 0) continue
    openQuotes = 0
    if (!rowBuffer.trim()) { rowBuffer = ''; continue }
    const values = parseCSVLine(rowBuffer)
    rowBuffer = ''
    const obj: Record<string, unknown> = {}
    headers.forEach((h, idx) => { obj[h.trim()] = values[idx]?.trim() ?? '' })
    const tags = obj.tags
      ? String(obj.tags).split(';').map(t => t.trim()).filter(Boolean)
      : []
    problems.push({
      id: String(obj.id || ''),
      subject: String(obj.subject || '') as SubjectKey,
      chapterKey: String(obj.chapter_key || ''),
      chapterName: String(obj.chapter_name || ''),
      questionNo: String(obj.question_no || ''),
      source: String(obj.source || ''),
      difficulty: obj.difficulty ? Number(obj.difficulty) : undefined,
      questionText: String(obj.question_text || ''),
      hintText: obj.hint_text ? String(obj.hint_text) : undefined,
      answerText: String(obj.answer_text || ''),
      explanation: obj.explanation ? String(obj.explanation) : undefined,
      relatedKnowledge: obj.related_knowledge ? String(obj.related_knowledge) : undefined,
      tags,
      displayOrder: obj.display_order ? Number(obj.display_order) : undefined,
    } as Problem)
  }
  return problems
}

// ===== メインコンポーネント =====
export default function ImportPage() {
  const navigate = useNavigate()

  // --- state ---
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [fileType, setFileType] = useState<FileType>('json')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [problems, setProblems] = useState<Problem[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectKey[]>([...VALID_SUBJECTS])
  const [progress, setProgress] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showAllErrors, setShowAllErrors] = useState(false)
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [exportSubject, setExportSubject] = useState<SubjectKey | 'all'>('all')
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 既存IDをSupabaseから取得
  useEffect(() => {
    supabase.from('problems').select('id').then(({ data }) => {
      if (data) setExistingIds(new Set(data.map((r: { id: string }) => r.id)))
    })
  }, [])

  // ===== ファイル処理 =====
  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setFileSize(file.size)
    setStatus('parsing')
    setValidationErrors([])
    setImportResult(null)
    setProblems([])
    setPreviewRows([])

    const ext = file.name.split('.').pop()?.toLowerCase()
    const type: FileType = ext === 'csv' ? 'csv' : 'json'
    setFileType(type)

    try {
      const text = await file.text()
      let parsed: Problem[] = []

      if (type === 'json') {
        const raw = JSON.parse(text)
        parsed = Array.isArray(raw) ? raw : [raw]
      } else {
        parsed = parseCSV(text)
      }

      // バリデーション・プレビューは次のステップで追加
      setProblems(parsed)
      setStatus('previewing')
    } catch (e) {
      setValidationErrors([{
        row: 0,
        field: 'file',
        message: `ファイルの解析に失敗しました: ${e instanceof Error ? e.message : String(e)}`
      }])
      setStatus('error')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const resetFile = () => {
    setStatus('idle')
    setProblems([])
    setPreviewRows([])
    setValidationErrors([])
    setImportResult(null)
    setFileName('')
    setFileSize(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 未使用変数の警告を抑制（次のステップで使用）
  void navigate
  void selectedSubjects
  void setSelectedSubjects
  void progress
  void setProgress
  void progressTotal
  void setProgressTotal
  void importResult
  void setImportResult
  void importLogs
  void setImportLogs
  void showAllErrors
  void setShowAllErrors
  void exportSubject
  void setExportSubject
  void exporting
  void setExporting
  void fileType
  void fileSize
  void previewRows
  void existingIds
  void REQUIRED_FIELDS
  void CHUNK_SIZE

  // ===== UI =====
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-400" />
            問題データ管理
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            AIツールで生成した JSON / CSV ファイルをインポートして問題データベースを構築します
          </p>
        </div>

        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-[#0f0f23] rounded-lg p-1">
          {(['import', 'export', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'import' ? '📥 インポート'
                : tab === 'export' ? '📤 エクスポート'
                : '📋 履歴'}
            </button>
          ))}
        </div>

        {/* インポートタブ */}
        {activeTab === 'import' && (
          <div className="space-y-4">

            {/* ドロップゾーン */}
            {status === 'idle' && (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-400 bg-blue-400/10'
                    : 'border-gray-600 hover:border-gray-400 hover:bg-white/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={onFileChange}
                  className="hidden"
                />
                <div className="flex justify-center gap-4 mb-4">
                  <FileJson className="w-10 h-10 text-blue-400" />
                  <FileText className="w-10 h-10 text-green-400" />
                </div>
                <p className="text-lg font-medium text-white mb-2">
                  JSON または CSV ファイルをドロップ
                </p>
                <p className="text-gray-400 text-sm">
                  またはクリックしてファイルを選択
                </p>
              </div>
            )}

            {/* パース中 */}
            {(status === 'parsing' || status === 'validating') && (
              <div className="bg-[#0f0f23] rounded-xl p-8 text-center">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-white">
                  {status === 'parsing' ? 'ファイルを解析中...' : 'バリデーション中...'}
                </p>
              </div>
            )}

            {/* エラー表示（仮） */}
            {status === 'error' && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  {validationErrors[0]?.message ?? 'エラーが発生しました'}
                </p>
                <button
                  onClick={resetFile}
                  className="mt-3 text-sm text-red-300 hover:text-white underline"
                >
                  ← ファイルを選び直す
                </button>
              </div>
            )}

            {/* 読み込み完了（仮表示） */}
            {status === 'previewing' && (
              <div className="bg-[#0f0f23] rounded-xl p-4">
                <p className="text-white font-medium mb-1">
                  ✅ {fileName} を読み込みました
                </p>
                <p className="text-gray-400 text-sm">
                  {problems.length} 件の問題を検出
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  ※ バリデーション・プレビュー・インポートボタンは次のステップで追加します
                </p>
                <button
                  onClick={resetFile}
                  className="mt-3 text-sm text-gray-400 hover:text-white underline"
                >
                  ← ファイルを変更
                </button>
              </div>
            )}
          </div>
        )}

        {/* エクスポートタブ（仮） */}
        {activeTab === 'export' && (
          <div className="bg-[#0f0f23] rounded-xl p-8 text-center text-gray-500">
            エクスポート機能は次のステップで実装します
          </div>
        )}

        {/* 履歴タブ（仮） */}
        {activeTab === 'history' && (
          <div className="bg-[#0f0f23] rounded-xl p-8 text-center text-gray-500">
            履歴機能は次のステップで実装します
          </div>
        )}

      </div>
    </div>
  )
}
