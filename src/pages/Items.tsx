import { useEffect, useState } from 'react'
import { Star, ExternalLink, FileText, Pencil, X, ExternalLink as LinkIcon } from 'lucide-react'
import { useStudyStore } from '../stores/studyStore'

type Item = {
  id: number
  chapter: string
  name: string
  description: string
  explanationUrl: string
}

const ITEMS: Item[] = [
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

const chapters = [...new Set(ITEMS.map(item => item.chapter))]

function getItemsGrouped(): { chapter: string; items: Item[] }[] {
  return chapters.map(chapter => ({
    chapter,
    items: ITEMS.filter(item => item.chapter === chapter),
  }))
}

// localStorage keys
function chapterProblemKey(chapter: string) { return `link:chapter:${chapter}` }
function itemExplanationKey(itemId: number) { return `link:item:${itemId}` }

function loadLinks(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('item_links') || '{}') } catch { return {} }
}
function saveLinks(links: Record<string, string>) {
  localStorage.setItem('item_links', JSON.stringify(links))
}

type ModalState = {
  key: string
  label: string
  inputValue: string
}

export default function Items() {
  const { weakItems, fetchWeakItems, toggleWeakItem } = useStudyStore()
  const [links, setLinks] = useState<Record<string, string>>(loadLinks)
  const [modal, setModal] = useState<ModalState | null>(null)

  useEffect(() => { fetchWeakItems() }, [fetchWeakItems])

  const grouped = getItemsGrouped()
  const weakCount = weakItems.size

  function getLink(key: string): string | null {
    const url = links[key]
    return url && url !== '#' ? url : null
  }

  function handleLinkClick(key: string, label: string) {
    const url = getLink(key)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      setModal({ key, label, inputValue: '' })
    }
  }

  function handleEdit(key: string, label: string) {
    setModal({ key, label, inputValue: links[key] ?? '' })
  }

  function handleSave() {
    if (!modal) return
    const url = modal.inputValue.trim()
    if (!url) return
    const next = { ...links, [modal.key]: url }
    setLinks(next)
    saveLinks(next)
    // open the link immediately after saving
    window.open(url, '_blank', 'noopener,noreferrer')
    setModal(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-white">市場分析 学習項目</h2>
          <p className="text-xs text-[#8888aa] mt-0.5">全{ITEMS.length}項目</p>
        </div>
        {weakCount > 0 && (
          <span className="text-xs px-3 py-1 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800/40">
            苦手マーク {weakCount}項目
          </span>
        )}
      </div>

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
              {/* Chapter header row with 問題集 button */}
              <div className="px-4 py-2 bg-[#111125] border-b border-[#2a2a4a] border-l-4 border-l-[#7c4dff] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#9090bb] tracking-wide">{chapter}</span>
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

      {/* Link setting modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a30] border border-[#2a2a4a] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2a2a4a]">
              <div>
                <h3 className="text-sm font-semibold text-white">リンクを設定</h3>
                <p className="text-xs text-[#8888aa] mt-0.5 truncate max-w-[280px]">{modal.label}</p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-[#252540] transition-colors"
              >
                <X className="w-4 h-4 text-[#8888aa]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Google Drive hint */}
              <div className="bg-[#111125] border border-[#2a2a4a] rounded-xl p-3 flex items-start gap-3">
                <div className="mt-0.5 text-[#7c4dff]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.28 3h11.44l4.28 7-4.28 7H6.28L2 10z" opacity=".3"/>
                    <path d="M12 3 6.28 3 2 10l4.28 7h5.72L7.72 10zm0 0 5.72 0 4.28 7-4.28 7H12l4.28-7z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#c8c8e8] font-medium">PDFをアップロードする場合</p>
                  <p className="text-xs text-[#8888aa] mt-0.5 leading-relaxed">
                    Google DriveにPDFをアップロードして「リンクを知っている全員が閲覧可」に設定し、共有リンクを貼り付けてください。
                  </p>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#7c4dff] hover:text-[#9d6fff] mt-1.5 transition-colors"
                  >
                    <LinkIcon className="w-3 h-3" strokeWidth={1.5} />
                    Google Driveを開く
                  </a>
                </div>
              </div>

              {/* URL input */}
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
            </div>

            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl text-sm text-[#8888aa] hover:text-[#c8c8e8] hover:bg-[#252540] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!modal.inputValue.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#7c4dff] text-white hover:bg-[#6a3de8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                保存して開く
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
