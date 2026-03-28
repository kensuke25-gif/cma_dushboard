import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileJson, FileText, XCircle, CheckCircle,
  Loader2, ChevronDown, ChevronUp, Filter, ArrowRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Problem } from '../types/problem'
import { useAuthStore } from '../stores/authStore'
import { useProblemStore } from '../stores/problemStore'

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

// スネークケース / キャメルケース どちらでも受け取れるよう正規化
function normalizeJsonProblem(raw: unknown): Problem {
  const r = raw as Record<string, unknown>
  return {
    id:               String(r.id ?? ''),
    subject:          (r.subject ?? '') as SubjectKey,
    chapterKey:       String(r.chapterKey   ?? r.chapter_key   ?? ''),
    chapterName:      String(r.chapterName  ?? r.chapter_name  ?? ''),
    sectionName:      r.sectionName  != null ? String(r.sectionName)  : r.section_name  != null ? String(r.section_name)  : undefined,
    questionNo:       String(r.questionNo   ?? r.question_no   ?? ''),
    questionType:     ((r.questionType ?? r.question_type ?? 'descriptive') as 'descriptive'),
    points:           Number(r.points ?? 0),
    questionText:     String(r.questionText ?? r.question_text ?? ''),
    hintText:         r.hintText        != null ? String(r.hintText)        : r.hint_text        != null ? String(r.hint_text)        : undefined,
    answerText:       String(r.answerText   ?? r.answer_text   ?? ''),
    explanation:      String(r.explanation  ?? ''),
    relatedKnowledge: r.relatedKnowledge != null ? String(r.relatedKnowledge) : r.related_knowledge != null ? String(r.related_knowledge) : undefined,
    tags:             Array.isArray(r.tags) ? r.tags.map(String) : [],
    difficulty:       (Number(r.difficulty ?? 2) as 1 | 2 | 3),
    source:           r.source != null ? String(r.source) : undefined,
    displayOrder:     Number(r.displayOrder ?? r.display_order ?? 0),
  }
}

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
  const { user } = useAuthStore()
  const fetchProblems = useProblemStore(s => s.fetchProblems)

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
    fetchImportLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // フラット配列 or ラッパーオブジェクト（{ problems: [...] } 等）に対応
        let arr: unknown[]
        if (Array.isArray(raw)) {
          arr = raw
        } else if (raw && typeof raw === 'object') {
          const nested = Object.values(raw as Record<string, unknown>).find(v => Array.isArray(v))
          arr = nested ? (nested as unknown[]) : [raw]
        } else {
          arr = [raw]
        }
        // スネークケース → キャメルケース正規化
        parsed = arr.map(normalizeJsonProblem)
      } else {
        parsed = parseCSV(text)
      }

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

  // ===== インポート実行 =====
  const filteredProblems = problems.filter(p =>
    selectedSubjects.includes(p.subject as SubjectKey)
  )

  const handleImport = async () => {
    if (filteredProblems.length === 0) return
    if (!window.confirm(
      `${filteredProblems.length}件の問題をインポートします。\n既存データは上書きされます。よろしいですか？`
    )) return

    setStatus('importing')
    setProgress(0)
    setProgressTotal(filteredProblems.length)

    let successCount = 0
    const errorMessages: string[] = []

    // camelCase → snake_case 変換
    const toSnakeCase = (p: Problem) => ({
      id: p.id,
      subject: p.subject,
      chapter_key: p.chapterKey,
      chapter_name: p.chapterName,
      question_no: p.questionNo,
      source: p.source ?? null,
      difficulty: p.difficulty ?? null,
      question_text: p.questionText,
      hint_text: p.hintText ?? null,
      answer_text: p.answerText,
      explanation: p.explanation ?? null,
      related_knowledge: p.relatedKnowledge ?? null,
      tags: p.tags ?? [],
      display_order: p.displayOrder ?? null,
    })

    // インポート対象の章キーに属する孤立問題（ファイルに存在しないID）を削除
    const importedChapterKeys = [...new Set(filteredProblems.map(p => p.chapterKey))]
    const importedIdSet = new Set(filteredProblems.map(p => p.id))
    if (importedChapterKeys.length > 0) {
      const { data: existingInChapters } = await supabase
        .from('problems')
        .select('id')
        .in('chapter_key', importedChapterKeys)
      const orphanedIds = (existingInChapters ?? [])
        .map((r: { id: string }) => r.id)
        .filter(id => !importedIdSet.has(id))
      if (orphanedIds.length > 0) {
        await supabase.from('problem_attempts').delete().in('problem_id', orphanedIds)
        await supabase.from('problems').delete().in('id', orphanedIds)
      }
    }

    // 100件ずつチャンク処理
    for (let i = 0; i < filteredProblems.length; i += CHUNK_SIZE) {
      const chunk = filteredProblems.slice(i, i + CHUNK_SIZE).map(toSnakeCase)
      const { error } = await supabase
        .from('problems')
        .upsert(chunk, { onConflict: 'id' })

      if (error) {
        errorMessages.push(
          `チャンク${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`
        )
      } else {
        successCount += chunk.length
      }
      setProgress(Math.min(i + CHUNK_SIZE, filteredProblems.length))
    }

    // import_logs に履歴を記録
    const subjectBreakdown = filteredProblems.reduce<Record<string, number>>(
      (acc, p) => {
        acc[p.subject] = (acc[p.subject] ?? 0) + 1
        return acc
      },
      {}
    )

    if (user?.id) {
      await supabase.from('import_logs').insert({
        user_id: user.id,
        file_name: fileName,
        file_type: fileType,
        total_count: filteredProblems.length,
        success_count: successCount,
        error_count: errorMessages.length,
        subject_breakdown: subjectBreakdown,
      })
    }

    // 既存IDセットを更新
    setExistingIds(prev => {
      const next = new Set(prev)
      filteredProblems.forEach(p => next.add(p.id))
      return next
    })

    setImportResult({
      success: successCount,
      error: errorMessages.length,
      errors: errorMessages,
    })
    setStatus('done')
    fetchImportLogs()
    // problemStore を更新して問題集に即反映
    fetchProblems()
  }

  const fetchImportLogs = async () => {
    const { data } = await supabase
      .from('import_logs')
      .select('*')
      .order('imported_at', { ascending: false })
      .limit(10)
    if (data) setImportLogs(data as ImportLog[])
  }

  // 未使用変数の警告を抑制
  void previewRows
  void fileSize
  void showAllErrors
  void setShowAllErrors
  void exportSubject
  void setExportSubject
  void exporting
  void setExporting
  void existingIds
  void REQUIRED_FIELDS
  void SUBJECT_LABELS
  void XCircle
  void ChevronDown
  void ChevronUp
  void Filter

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

            {/* エラー表示 */}
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

            {/* プレビュー + 科目フィルター */}
            {status === 'previewing' && (
              <div className="bg-[#0f0f23] rounded-xl p-4">
                <p className="text-white font-medium mb-1">
                  ✅ {fileName} を読み込みました
                </p>
                <p className="text-gray-400 text-sm mb-3">
                  {problems.length} 件の問題を検出
                </p>

                {/* 科目フィルター */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    インポートする科目を選択
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VALID_SUBJECTS.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedSubjects(prev =>
                          prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                        )}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedSubjects.includes(s)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {SUBJECT_LABELS[s]} ({problems.filter(p => p.subject === s).length})
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={resetFile}
                  className="text-sm text-gray-400 hover:text-white underline"
                >
                  ← ファイルを変更
                </button>
              </div>
            )}

            {/* インポートボタン */}
            {status === 'previewing' && (
              <button
                onClick={handleImport}
                disabled={
                  filteredProblems.length === 0 ||
                  validationErrors.length > 0
                }
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {filteredProblems.length}件を Supabase にインポート
              </button>
            )}

            {/* プログレスバー */}
            {status === 'importing' && (
              <div className="bg-[#0f0f23] rounded-xl p-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    インポート中...
                  </span>
                  <span>{progress} / {progressTotal} 件</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressTotal
                        ? (progress / progressTotal) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* 完了サマリー */}
            {status === 'done' && importResult && (
              <div className="bg-[#0f0f23] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="font-semibold text-white">
                    インポート完了
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {importResult.success}
                    </p>
                    <p className="text-xs text-green-300">成功</p>
                  </div>
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {importResult.error}
                    </p>
                    <p className="text-xs text-red-300">失敗</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-900/20 rounded-lg p-3 mb-4 space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-sm text-red-300">{e}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/problems/securities')}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    問題一覧へ
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetFile}
                    className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    続けてインポート
                  </button>
                </div>
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

        {/* 履歴タブ */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {importLogs.length === 0 ? (
              <div className="bg-[#0f0f23] rounded-xl p-8 text-center text-gray-500">
                インポート履歴がありません
              </div>
            ) : (
              importLogs.map(log => (
                <div key={log.id} className="bg-[#0f0f23] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{log.file_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.imported_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>合計: {log.total_count}件</span>
                    <span className="text-green-400">成功: {log.success_count}件</span>
                    {log.error_count > 0 && (
                      <span className="text-red-400">失敗: {log.error_count}件</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}
