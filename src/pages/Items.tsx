import { useEffect, useState } from 'react'
import { Star, ExternalLink, FileText, Pencil, X, Upload, Loader2, ChevronLeft } from 'lucide-react'
import { useStudyStore } from '../stores/studyStore'
import { supabase } from '../lib/supabase'

type Item = {
  id: number
  chapter: string
  name: string
  description: string
  explanationUrl: string
}

// ---- 市場分析 ----
const SHIJO_ITEMS: Item[] = [
  // 第I章 マクロ経済学
  { id: 1, chapter: '第I章 マクロ経済学', name: '景気循環', description: '局面、景気動向指数、ビジネス・サーベイ', explanationUrl: '#' },
  { id: 2, chapter: '第I章 マクロ経済学', name: 'SNA統計と物価指標', description: '三面等価の原則、名目と実質、GDPデフレーター、実質GDI、成長率、消費者・企業物価指数', explanationUrl: '#' },
  { id: 3, chapter: '第I章 マクロ経済学', name: '45度線分析（財市場均衡分析）', description: '均衡条件、消費関数、均衡GDPの決定、乗数効果、財政政策の有効性', explanationUrl: '#' },
  { id: 4, chapter: '第I章 マクロ経済学', name: 'IS-LM分析と財政・金融政策', description: '財市場と貨幣市場、政策効果、流動性の罠、タイム・ラグ', explanationUrl: '#' },
  { id: 5, chapter: '第I章 マクロ経済学', name: 'AD-AS分析', description: 'AD曲線とAS曲線、デフレ、インフレ', explanationUrl: '#' },
  { id: 6, chapter: '第I章 マクロ経済学', name: '物価に関するその他の論点', description: '貨幣数量説、フィッシャー方程式、GDPギャップ、フィリップス曲線', explanationUrl: '#' },
  { id: 7, chapter: '第I章 マクロ経済学', name: '経済成長の要因分解', description: '', explanationUrl: '#' },
  { id: 8, chapter: '第I章 マクロ経済学', name: '新古典派経済成長モデル（ソロー＝スワンモデル）', description: '', explanationUrl: '#' },
  { id: 9, chapter: '第I章 マクロ経済学', name: '財政赤字と公債残高の収束問題', description: '', explanationUrl: '#' },
  // 第II章 金融経済
  { id: 10, chapter: '第II章 金融経済', name: '金融政策のフレームワーク', description: '', explanationUrl: '#' },
  { id: 11, chapter: '第II章 金融経済', name: 'マネタリーベースとマネーストック', description: '', explanationUrl: '#' },
  { id: 12, chapter: '第II章 金融経済', name: '貨幣乗数', description: '', explanationUrl: '#' },
  { id: 13, chapter: '第II章 金融経済', name: '金融調節', description: '日銀当座預金の変動要因、資金需給', explanationUrl: '#' },
  { id: 14, chapter: '第II章 金融経済', name: '金利の期間構造', description: '', explanationUrl: '#' },
  { id: 15, chapter: '第II章 金融経済', name: '金融政策と運営ルール', description: 'テイラー・ルール、インフレ・ターゲティング', explanationUrl: '#' },
  { id: 16, chapter: '第II章 金融経済', name: '金融政策の動向', description: '量的緩和、マイナス金利、長短金利操作（イールドカーブ・コントロール）など', explanationUrl: '#' },
  { id: 17, chapter: '第II章 金融経済', name: '景気動向と株価', description: '株価決定モデル、PER、土地の理論価格', explanationUrl: '#' },
  // 第III章 国際金融論
  { id: 18, chapter: '第III章 国際金融論', name: '国際収支', description: '統計の体系', explanationUrl: '#' },
  { id: 19, chapter: '第III章 国際金融論', name: '経常収支', description: '金融収支との関係', explanationUrl: '#' },
  { id: 20, chapter: '第III章 国際金融論', name: '財貯蓄投資差額（ISバランス）', description: '資金過不足、為替と貿易収支', explanationUrl: '#' },
  { id: 21, chapter: '第III章 国際金融論', name: '為替レート', description: '名目・実質、実効為替レート', explanationUrl: '#' },
  { id: 22, chapter: '第III章 国際金融論', name: '為替レート決定理論I（長期）', description: '', explanationUrl: '#' },
  { id: 23, chapter: '第III章 国際金融論', name: '為替レート決定理論II（短期）', description: '金利平価説、ポートフォリオ・バランス・アプローチ', explanationUrl: '#' },
  { id: 24, chapter: '第III章 国際金融論', name: '為替介入とその効果', description: '', explanationUrl: '#' },
  { id: 25, chapter: '第III章 国際金融論', name: 'オープン・マクロ（IS-LM型小国モデル）', description: '', explanationUrl: '#' },
  // 第IV章 ミクロ経済学
  { id: 26, chapter: '第IV章 ミクロ経済学', name: '消費者の効用最大化', description: '所得効果と価格効果', explanationUrl: '#' },
  { id: 27, chapter: '第IV章 ミクロ経済学', name: '企業の利潤最大化', description: '', explanationUrl: '#' },
  { id: 28, chapter: '第IV章 ミクロ経済学', name: '市場均衡と価格の自動調整機能', description: '', explanationUrl: '#' },
  { id: 29, chapter: '第IV章 ミクロ経済学', name: '市場均衡と資源配分の効率性', description: '余剰分析、価格規制、市場の失敗（外部性、公共財）', explanationUrl: '#' },
  { id: 30, chapter: '第IV章 ミクロ経済学', name: '不完全競争市場', description: '独占、複占（クールノー均衡）', explanationUrl: '#' },
  { id: 31, chapter: '第IV章 ミクロ経済学', name: '国際貿易と関税', description: '', explanationUrl: '#' },
  { id: 32, chapter: '第IV章 ミクロ経済学', name: 'ライフサイクル仮説', description: '予算制約、消費の平準化、リカードの中立命題', explanationUrl: '#' },
  { id: 33, chapter: '第IV章 ミクロ経済学', name: '情報の経済学', description: '逆選択、モラルハザード、エージェンシー問題', explanationUrl: '#' },
]

// ---- 証券分析 ----
const SHOKEN_ITEMS: Item[] = [
  // 第I章 株式価値評価と株式ポートフォリオ戦略
  { id: 101, chapter: '第I章 株式価値評価と株式ポートフォリオ戦略', name: 'シングル・ファクター・モデル', description: 'ポートフォリオの収益率 / 平均・分散アプローチ / 資本資産評価モデル（CAPM）/ マーケット・モデル', explanationUrl: '#' },
  { id: 102, chapter: '第I章 株式価値評価と株式ポートフォリオ戦略', name: 'マルチファクター・モデル', description: 'マルチファクター・モデルの基本 / APT（裁定価格理論）', explanationUrl: '#' },
  { id: 103, chapter: '第I章 株式価値評価と株式ポートフォリオ戦略', name: '株式ポートフォリオの運用', description: '効率的市場仮説 / ベンチマーク / パッシブ運用 / アクティブ運用 / スマートベータ', explanationUrl: '#' },
  { id: 104, chapter: '第I章 株式価値評価と株式ポートフォリオ戦略', name: '株式価値評価モデル', description: '配当割引モデル（DDM）/ フリーキャッシュフロー割引モデル / 残余利益モデル', explanationUrl: '#' },
  { id: 105, chapter: '第I章 株式価値評価と株式ポートフォリオ戦略', name: '売買執行のリスクとコスト', description: '取引システムと執行方法 / 取引コストとその分析 / 投資スタイルと執行コスト', explanationUrl: '#' },
  // 第II章 債券分析と債券ポートフォリオ戦略
  { id: 106, chapter: '第II章 債券分析と債券ポートフォリオ戦略', name: '債券投資分析の基本ツール', description: '債券投資のリスクと債券価格 / 債券投資の利回り / イールド・カーブの変化 / デュレーション・コンベクシティ / コーラブル債 / MBS / 変動利付債 / インフレ連動債', explanationUrl: '#' },
  { id: 107, chapter: '第II章 債券分析と債券ポートフォリオ戦略', name: '債券ポートフォリオの運用', description: 'ラダー型ポートフォリオ / アクティブ運用 / パッシブ運用 / セミ・アクティブ戦略', explanationUrl: '#' },
  // 第III章 デリバティブ分析と投資戦略
  { id: 108, chapter: '第III章 デリバティブ分析と投資戦略', name: 'オプション取引', description: '', explanationUrl: '#' },
  { id: 109, chapter: '第III章 デリバティブ分析と投資戦略', name: '先渡（先物）取引', description: '', explanationUrl: '#' },
  { id: 110, chapter: '第III章 デリバティブ分析と投資戦略', name: '債券先物取引', description: '', explanationUrl: '#' },
  { id: 111, chapter: '第III章 デリバティブ分析と投資戦略', name: '金利デリバティブ', description: '金利先渡契約（FRA）/ 金利スワップ / 通貨スワップ / 金利オプション', explanationUrl: '#' },
  { id: 112, chapter: '第III章 デリバティブ分析と投資戦略', name: 'デリバティブを用いたポートフォリオのリスク管理', description: '', explanationUrl: '#' },
  // 第IV章 投資政策とアセット・アロケーション
  { id: 113, chapter: '第IV章 投資政策とアセット・アロケーション', name: 'ストラテジック・アセット・アロケーション', description: '', explanationUrl: '#' },
  { id: 114, chapter: '第IV章 投資政策とアセット・アロケーション', name: '短期のアセット・アロケーション', description: '', explanationUrl: '#' },
  { id: 115, chapter: '第IV章 投資政策とアセット・アロケーション', name: '長期投資とアセット・アロケーション', description: '', explanationUrl: '#' },
  { id: 116, chapter: '第IV章 投資政策とアセット・アロケーション', name: '企業年金とALM（Asset Liability Management）', description: '', explanationUrl: '#' },
  { id: 117, chapter: '第IV章 投資政策とアセット・アロケーション', name: 'リスク管理', description: '正規分布 / 確率計算 / 標準化と標準正規分布 / 期間の調整 / バリュー・アット・リスク（VaR）/ ショート・フォール・リスク', explanationUrl: '#' },
  // 第V章 国際証券投資
  { id: 118, chapter: '第V章 国際証券投資', name: '外国証券投資の基本ツール', description: '', explanationUrl: '#' },
  { id: 119, chapter: '第V章 国際証券投資', name: '国際証券投資の諸論点', description: '', explanationUrl: '#' },
  // 第VI章 オルタナティブ投資
  { id: 120, chapter: '第VI章 オルタナティブ投資', name: 'オルタナティブ投資とは？', description: '', explanationUrl: '#' },
  { id: 121, chapter: '第VI章 オルタナティブ投資', name: '証券化商品', description: '', explanationUrl: '#' },
  { id: 122, chapter: '第VI章 オルタナティブ投資', name: 'ヘッジファンド', description: '', explanationUrl: '#' },
  { id: 123, chapter: '第VI章 オルタナティブ投資', name: 'その他のオルタナティブ投資', description: '', explanationUrl: '#' },
  // 第VII章 パフォーマンス評価
  { id: 124, chapter: '第VII章 パフォーマンス評価', name: 'パフォーマンス収益率の測度', description: '', explanationUrl: '#' },
  { id: 125, chapter: '第VII章 パフォーマンス評価', name: 'リスク調整後収益率測度', description: '', explanationUrl: '#' },
  { id: 126, chapter: '第VII章 パフォーマンス評価', name: 'その他のパフォーマンス評価の方法', description: '', explanationUrl: '#' },
  { id: 127, chapter: '第VII章 パフォーマンス評価', name: 'スタイル・マネジメント', description: '', explanationUrl: '#' },
  // 第VIII章 信用リスク・モデル
  { id: 128, chapter: '第VIII章 信用リスク・モデル', name: '信用リスクのある債券（債権）の評価', description: '', explanationUrl: '#' },
  { id: 129, chapter: '第VIII章 信用リスク・モデル', name: '債券の格付けと格付け推移行列', description: '', explanationUrl: '#' },
  { id: 130, chapter: '第VIII章 信用リスク・モデル', name: '財務諸表データに基づくデフォルト確率の推定', description: '', explanationUrl: '#' },
  { id: 131, chapter: '第VIII章 信用リスク・モデル', name: '構造型モデル', description: '', explanationUrl: '#' },
  { id: 132, chapter: '第VIII章 信用リスク・モデル', name: 'デフォルトの相関リスク', description: '', explanationUrl: '#' },
  { id: 133, chapter: '第VIII章 信用リスク・モデル', name: 'クレジット・リスク・デリバティブ', description: '', explanationUrl: '#' },
  // 第IX章 行動ファイナンス
  { id: 134, chapter: '第IX章 行動ファイナンス', name: '市場の効率性とアノマリー', description: '', explanationUrl: '#' },
  { id: 135, chapter: '第IX章 行動ファイナンス', name: '行動ファイナンスとは？', description: '', explanationUrl: '#' },
  { id: 136, chapter: '第IX章 行動ファイナンス', name: '行動ファイナンスの代表事例', description: '', explanationUrl: '#' },
  // 統計付録
  { id: 137, chapter: '統計付録', name: '確率変数の加重和の期待値と分散', description: '', explanationUrl: '#' },
  { id: 138, chapter: '統計付録', name: '正規分布', description: '', explanationUrl: '#' },
  { id: 139, chapter: '統計付録', name: '回帰分析', description: '', explanationUrl: '#' },
  { id: 140, chapter: '統計付録', name: '主成分分析', description: '', explanationUrl: '#' },
]

// ---- 財務分析（項目追加予定） ----
const ZAIMU_ITEMS: Item[] = []

// ---- 職業行為倫理基準（項目追加予定） ----
const RINRI_ITEMS: Item[] = []

type SubjectTab = '証券分析' | '財務分析' | '市場分析' | '職業行為倫理基準'

const SUBJECT_TABS: { key: SubjectTab; short: string; items: Item[] }[] = [
  { key: '証券分析',         short: '証券分析', items: SHOKEN_ITEMS },
  { key: '財務分析',         short: '財務分析', items: ZAIMU_ITEMS },
  { key: '市場分析',         short: '市場分析', items: SHIJO_ITEMS },
  { key: '職業行為倫理基準', short: '倫理基準', items: RINRI_ITEMS },
]

// iOS PWAでもSafariが確実に起動するanchorクリック方式
function openExternalLink(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 組み込み問題集HTML（publicディレクトリに配置）
const BUILTIN_QUIZ_URLS: Record<string, string> = {
  '第II章 金融経済': `${import.meta.env.BASE_URL}quiz/chapter2-finance.html`,
}

function chapterProblemKey(chapter: string) { return `chapter:${chapter}` }
function itemExplanationKey(itemId: number) { return `item:${itemId}` }

// link_key → Supabase Storage のファイル名に変換
function linkKeyToFilename(key: string): string {
  return key.replace(/[^a-zA-Z0-9\-_.]/g, '_') + '.html'
}

// localStorage をキャッシュとして使用（ロード中のちらつき防止）
const LS_KEY = 'item_links_cache'
function loadCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveCache(links: Record<string, string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(links))
}

type ModalState = {
  key: string
  label: string
  inputValue: string
  mode: 'file' | 'url'
}

// クイズページの苦手マーク数を localStorage から読み取る
function loadQuiz2WeakCount(): number {
  try {
    const arr = JSON.parse(localStorage.getItem('cma_quiz2_weak') || '[]')
    return Array.isArray(arr) ? arr.length : 0
  } catch { return 0 }
}

export default function Items() {
  const { weakItems, fetchWeakItems, toggleWeakItem } = useStudyStore()
  const [links, setLinks] = useState<Record<string, string>>(loadCache)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [quiz2WeakCount, setQuiz2WeakCount] = useState(loadQuiz2WeakCount)
  const [activeTab, setActiveTab] = useState<SubjectTab>('市場分析')
  const [htmlViewer, setHtmlViewer] = useState<{ title: string; content: string } | null>(null)
  const [htmlLoading, setHtmlLoading] = useState(false)

  useEffect(() => { fetchWeakItems() }, [fetchWeakItems])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'cma_quiz2_weak') setQuiz2WeakCount(loadQuiz2WeakCount())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Supabase からリンクを取得
  useEffect(() => {
    supabase.from('item_links').select('link_key, url').then(({ data, error }) => {
      if (error) { console.error('[item_links fetch]', error); return }
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach((r: { link_key: string; url: string }) => { map[r.link_key] = r.url })
      setLinks(map)
      saveCache(map)
    })
  }, [])

  const weakCount = weakItems.size

  const currentTabData = SUBJECT_TABS.find(t => t.key === activeTab)!
  const currentItems = currentTabData.items
  const chapters = [...new Set(currentItems.map(item => item.chapter))]
  const grouped = chapters.map(chapter => ({
    chapter,
    items: currentItems.filter(item => item.chapter === chapter),
  }))

  function getLink(key: string): string | null {
    const url = links[key]
    if (url && url !== '#') return url
    const chapter = key.startsWith('chapter:') ? key.slice('chapter:'.length) : null
    if (chapter && BUILTIN_QUIZ_URLS[chapter]) return BUILTIN_QUIZ_URLS[chapter]
    return null
  }

  function closeModal() {
    setModal(null)
    setSelectedFile(null)
    setSaveError(null)
  }

  // .html URL はすべてビューアで表示する（Supabase Storage・ビルトイン問わず）
  // arrayBuffer() + TextDecoder('utf-8') でサーバーのcharset宣言を無視して強制UTF-8デコード
  // srcDoc はHTML5仕様で常にUTF-8が保証されるため iOS Safari を含む全環境で文字化けしない
  async function openLink(url: string, label: string) {
    const isHtmlUrl = /\.html(\?.*)?$/i.test(url)
    if (!isHtmlUrl) {
      openExternalLink(url)
      return
    }
    setHtmlLoading(true)
    try {
      const res = await fetch(url)
      const buffer = await res.arrayBuffer()
      const content = new TextDecoder('utf-8').decode(buffer)
      setHtmlViewer({ title: label, content })
    } catch (e) {
      console.error('[html fetch]', e)
      openExternalLink(url)
    } finally {
      setHtmlLoading(false)
    }
  }

  function handleLinkClick(key: string, label: string) {
    const url = getLink(key)
    if (url) {
      openLink(url, label)
    } else {
      setModal({ key, label, inputValue: '', mode: 'file' })
    }
  }

  function handleEdit(key: string, label: string) {
    setModal({ key, label, inputValue: links[key] ?? '', mode: 'url' })
  }

  async function handleUrlSave() {
    if (!modal) return
    const url = modal.inputValue.trim()
    if (!url) return

    setSaving(true)
    setSaveError(null)

    const { error: upsertError } = await supabase.from('item_links').upsert(
      { link_key: modal.key, url, updated_at: new Date().toISOString() },
      { onConflict: 'link_key' }
    )

    setSaving(false)

    if (upsertError) {
      console.error('[item_links upsert]', upsertError)
      setSaveError(`保存エラー: ${upsertError.message}`)
      return
    }

    const next = { ...links, [modal.key]: url }
    setLinks(next)
    saveCache(next)
    closeModal()
    await openLink(url, modal.label)
  }

  async function handleUploadAndSave() {
    if (!modal || !selectedFile) return

    setSaving(true)
    setSaveError(null)

    const filename = linkKeyToFilename(modal.key)
    const { error: uploadError } = await supabase.storage
      .from('item-files')
      .upload(filename, selectedFile, { contentType: 'text/html', upsert: true })

    if (uploadError) {
      console.error('[storage upload]', uploadError)
      setSaveError(`アップロードエラー: ${uploadError.message}`)
      setSaving(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('item-files')
      .getPublicUrl(filename)

    const { error: upsertError } = await supabase.from('item_links').upsert(
      { link_key: modal.key, url: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'link_key' }
    )

    setSaving(false)

    if (upsertError) {
      console.error('[item_links upsert]', upsertError)
      setSaveError(`保存エラー: ${upsertError.message}`)
      return
    }

    const next = { ...links, [modal.key]: publicUrl }
    setLinks(next)
    saveCache(next)
    closeModal()
    await openLink(publicUrl, modal.label)
  }

  function handleSave() {
    if (!modal) return
    if (modal.mode === 'file') {
      handleUploadAndSave()
    } else {
      handleUrlSave()
    }
  }

  const isFileMode = modal?.mode === 'file'
  const saveDisabled = saving || (isFileMode ? !selectedFile : !modal?.inputValue.trim())

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">学習項目</h2>
          <p className="text-xs text-[#8888aa] mt-0.5">全{currentItems.length}項目</p>
        </div>
        {weakCount > 0 && (
          <span className="text-xs px-3 py-1 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800/40">
            苦手マーク {weakCount}項目
          </span>
        )}
      </div>

      {/* 科目タブ */}
      <div className="grid grid-cols-4 gap-1 mb-5 p-1 bg-[#111125] rounded-xl border border-[#2a2a4a]">
        {SUBJECT_TABS.map(({ key, short }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-2 rounded-lg font-medium transition-colors leading-tight text-center ${
              activeTab === key
                ? 'bg-[#7c4dff] text-white text-[10px] md:text-xs'
                : 'text-[#8888aa] hover:text-[#c8c8e8] text-[10px] md:text-xs'
            }`}
          >
            <span className="md:hidden">{short}</span>
            <span className="hidden md:inline">{key}</span>
          </button>
        ))}
      </div>

      {/* 項目なし（準備中）*/}
      {currentItems.length === 0 && (
        <div className="rounded-[20px] border border-[#2a2a4a] bg-[#111125] py-16 text-center">
          <p className="text-sm text-[#8888aa]">このカテゴリの項目は準備中です</p>
        </div>
      )}

      {/* 項目テーブル */}
      {currentItems.length > 0 && (
        <div className="rounded-[20px] border border-[#2a2a4a] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] bg-[#111125] border-b border-[#2a2a4a] px-4 py-2.5">
            <span className="text-xs text-[#9090bb] font-medium">項目名</span>
            <span className="text-xs text-[#9090bb] font-medium w-12 text-center">苦手</span>
            <span className="text-xs text-[#9090bb] font-medium w-12 text-center">解説</span>
          </div>

          {grouped.map(({ chapter, items }) => {
            const probKey = chapterProblemKey(chapter)
            const probUrl = getLink(probKey)

            return (
              <div key={chapter}>
                {/* Chapter header with 問題集 button */}
                <div className="px-4 py-2 bg-[#111125] border-b border-[#2a2a4a] border-l-4 border-l-[#7c4dff] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#9090bb] tracking-wide">{chapter}</span>
                    {chapter === '第II章 金融経済' && quiz2WeakCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-400 border border-orange-800/40 font-medium">
                        苦手 {quiz2WeakCount}問
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {probUrl && (
                      <button
                        onClick={() => handleEdit(probKey, `${chapter} 問題集`)}
                        title="リンクを編集"
                        className="p-1 rounded-lg hover:bg-[#252540] transition-colors group"
                      >
                        <Pencil className="w-3 h-3 text-[#5a5a7a] group-hover:text-[#9090bb] transition-colors" strokeWidth={1.5} />
                      </button>
                    )}
                    <button
                      onClick={() => handleLinkClick(probKey, `${chapter} 問題集`)}
                      title={probUrl ? '問題集を開く' : '問題集のリンクを設定'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        probUrl
                          ? 'bg-[#7c4dff]/20 text-[#7c4dff] hover:bg-[#7c4dff]/30'
                          : 'bg-[#252540] text-[#5a5a7a] hover:bg-[#2e2e50] hover:text-[#9090bb]'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                      問題集
                    </button>
                  </div>
                </div>

                {/* Item rows */}
                {items.map((item, rowIndex) => {
                  const expKey = itemExplanationKey(item.id)
                  const expUrl = getLink(expKey)

                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[1fr_auto_auto] px-4 py-3 border-b border-[#2a2a4a] items-center transition-colors hover:bg-[rgba(124,77,255,0.05)] ${
                        rowIndex % 2 === 0 ? 'bg-[#1e1e3a]' : 'bg-[#16162a]'
                      }`}
                    >
                      <div className="pr-4 min-w-0">
                        <p className="text-sm text-[#c8c8e8] font-medium leading-snug">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-[#8888aa] mt-0.5 leading-relaxed">{item.description}</p>
                        )}
                      </div>

                      <div className="w-12 flex justify-center">
                        <button
                          onClick={() => toggleWeakItem(item.id)}
                          title={weakItems.has(item.id) ? '苦手マーク解除' : '苦手マーク登録'}
                          className="p-1 rounded-lg hover:bg-[#252540] transition-colors"
                        >
                          <Star
                            className={`w-4 h-4 transition-colors ${
                              weakItems.has(item.id)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-[#3a3a5c] hover:text-[#8888aa]'
                            }`}
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>

                      <div className="w-12 flex items-center justify-center gap-0.5">
                        {expUrl && (
                          <button
                            onClick={() => handleEdit(expKey, `${item.name} 解説`)}
                            title="リンクを編集"
                            className="p-1 rounded-lg hover:bg-[#252540] transition-colors group"
                          >
                            <Pencil className="w-3 h-3 text-[#5a5a7a] group-hover:text-[#9090bb] transition-colors" strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          onClick={() => handleLinkClick(expKey, `${item.name} 解説`)}
                          title={expUrl ? '解説を開く' : '解説のリンクを設定'}
                          className="p-1 rounded-lg hover:bg-[#252540] transition-colors group"
                        >
                          <FileText
                            className={`w-4 h-4 transition-colors ${
                              expUrl
                                ? 'text-[#7c4dff] group-hover:text-[#9d6fff]'
                                : 'text-[#3a3a5c] group-hover:text-[#8888aa]'
                            }`}
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* HTML ビューア（Supabase Storage のファイルを文字化けなく表示） */}
      {htmlViewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a2e]">
          {/* ヘッダー */}
          <div
            className="flex items-center gap-2 px-4 py-3 bg-[#111125] border-b border-[#2a2a4a] shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          >
            <button
              onClick={() => setHtmlViewer(null)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-[#252540] transition-colors text-xs"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              戻る
            </button>
            <span className="text-sm font-medium text-white truncate flex-1">{htmlViewer.title}</span>
          </div>
          {/* コンテンツ */}
          <iframe
            srcDoc={htmlViewer.content}
            className="flex-1 w-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin"
            title={htmlViewer.title}
          />
        </div>
      )}

      {/* HTML ロード中スピナー */}
      {htmlLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-[#7c4dff] animate-spin" />
        </div>
      )}

      {/* Link / File setting modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a30] border border-[#2a2a4a] rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2a2a4a]">
              <div>
                <h3 className="text-sm font-semibold text-white">ファイルを設定</h3>
                <p className="text-xs text-[#8888aa] mt-0.5 truncate max-w-[280px]">{modal.label}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[#252540] transition-colors">
                <X className="w-4 h-4 text-[#8888aa]" strokeWidth={1.5} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#2a2a4a]">
              <button
                onClick={() => setModal(m => m ? { ...m, mode: 'file' } : m)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  isFileMode ? 'text-[#7c4dff] border-b-2 border-[#7c4dff]' : 'text-[#8888aa] hover:text-[#c8c8e8]'
                }`}
              >
                ファイルをアップロード
              </button>
              <button
                onClick={() => setModal(m => m ? { ...m, mode: 'url' } : m)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  !isFileMode ? 'text-[#7c4dff] border-b-2 border-[#7c4dff]' : 'text-[#8888aa] hover:text-[#c8c8e8]'
                }`}
              >
                URLを入力
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {isFileMode ? (
                <div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".html,text/html"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-[#111125] border border-[#7c4dff]/40 rounded-xl">
                      <FileText className="w-4 h-4 text-[#7c4dff] shrink-0" strokeWidth={1.5} />
                      <span className="text-xs text-[#c8c8e8] flex-1 truncate">{selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} className="p-0.5 rounded hover:bg-[#252540] transition-colors">
                        <X className="w-3.5 h-3.5 text-[#8888aa]" strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[#2a2a4a] rounded-xl cursor-pointer hover:border-[#7c4dff]/50 hover:bg-[#7c4dff]/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-[#5a5a7a]" strokeWidth={1.5} />
                      <span className="text-xs text-[#8888aa] text-center">クリックしてHTMLファイルを選択</span>
                    </label>
                  )}
                  {links[modal.key] && (
                    <p className="text-[11px] text-[#5a5a7a] mt-2">※ アップロードすると既存のファイルが上書きされます</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs text-[#9090bb] font-medium block mb-1.5">URL</label>
                  <input
                    type="url"
                    value={modal.inputValue}
                    onChange={e => setModal(m => m ? { ...m, inputValue: e.target.value } : m)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                    placeholder="https://drive.google.com/... または任意のURL"
                    autoFocus
                    className="w-full bg-[#111125] border border-[#2a2a4a] rounded-xl px-3 py-2.5 text-sm text-[#c8c8e8] placeholder-[#4a4a6a] focus:outline-none focus:border-[#7c4dff] transition-colors"
                  />
                </div>
              )}
            </div>

            {saveError && (
              <div className="mx-5 mb-3 px-3 py-2 bg-red-900/30 border border-red-800/50 rounded-xl">
                <p className="text-xs text-red-400">{saveError}</p>
              </div>
            )}

            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl text-sm text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#252540] transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saveDisabled}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#7c4dff] text-white hover:bg-[#6a3de8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving
                  ? (isFileMode ? 'アップロード中…' : '保存中…')
                  : (isFileMode ? 'アップロードして開く' : '保存して開く')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
