import { useEffect } from 'react'
import { Star, ExternalLink, FileText } from 'lucide-react'
import { useStudyStore } from '../stores/studyStore'

type Item = {
  id: number
  chapter: string
  name: string
  description: string
  problemUrl: string
  explanationUrl: string
}

const ITEMS: Item[] = [
  // 第I章 マクロ経済学
  { id: 1, chapter: '第I章 マクロ経済学', name: '景気循環', description: '局面、景気動向指数、ビジネス・サーベイ', problemUrl: '#', explanationUrl: '#' },
  { id: 2, chapter: '第I章 マクロ経済学', name: 'SNA統計と物価指標', description: '三面等価の原則、名目と実質、GDPデフレーター、実質GDI、成長率、消費者・企業物価指数', problemUrl: '#', explanationUrl: '#' },
  { id: 3, chapter: '第I章 マクロ経済学', name: '45度線分析（財市場均衡分析）', description: '均衡条件、消費関数、均衡GDPの決定、乗数効果、財政政策の有効性', problemUrl: '#', explanationUrl: '#' },
  { id: 4, chapter: '第I章 マクロ経済学', name: 'IS-LM分析と財政・金融政策', description: '財市場と貨幣市場、政策効果、流動性の罠、タイム・ラグ', problemUrl: '#', explanationUrl: '#' },
  { id: 5, chapter: '第I章 マクロ経済学', name: 'AD-AS分析', description: 'AD曲線とAS曲線、デフレ、インフレ', problemUrl: '#', explanationUrl: '#' },
  { id: 6, chapter: '第I章 マクロ経済学', name: '物価に関するその他の論点', description: '貨幣数量説、フィッシャー方程式、GDPギャップ、フィリップス曲線', problemUrl: '#', explanationUrl: '#' },
  { id: 7, chapter: '第I章 マクロ経済学', name: '経済成長の要因分解', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 8, chapter: '第I章 マクロ経済学', name: '新古典派経済成長モデル（ソロー＝スワンモデル）', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 9, chapter: '第I章 マクロ経済学', name: '財政赤字と公債残高の収束問題', description: '', problemUrl: '#', explanationUrl: '#' },

  // 第II章 金融経済
  { id: 10, chapter: '第II章 金融経済', name: '金融政策のフレームワーク', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 11, chapter: '第II章 金融経済', name: 'マネタリーベースとマネーストック', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 12, chapter: '第II章 金融経済', name: '貨幣乗数', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 13, chapter: '第II章 金融経済', name: '金融調節', description: '日銀当座預金の変動要因、資金需給', problemUrl: '#', explanationUrl: '#' },
  { id: 14, chapter: '第II章 金融経済', name: '金利の期間構造', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 15, chapter: '第II章 金融経済', name: '金融政策と運営ルール', description: 'テイラー・ルール、インフレ・ターゲティング', problemUrl: '#', explanationUrl: '#' },
  { id: 16, chapter: '第II章 金融経済', name: '金融政策の動向', description: '量的緩和、マイナス金利、長短金利操作（イールドカーブ・コントロール）など', problemUrl: '#', explanationUrl: '#' },
  { id: 17, chapter: '第II章 金融経済', name: '景気動向と株価', description: '株価決定モデル、PER、土地の理論価格', problemUrl: '#', explanationUrl: '#' },

  // 第III章 国際金融論
  { id: 18, chapter: '第III章 国際金融論', name: '国際収支', description: '統計の体系', problemUrl: '#', explanationUrl: '#' },
  { id: 19, chapter: '第III章 国際金融論', name: '経常収支', description: '金融収支との関係', problemUrl: '#', explanationUrl: '#' },
  { id: 20, chapter: '第III章 国際金融論', name: '財貯蓄投資差額（ISバランス）', description: '資金過不足、為替と貿易収支', problemUrl: '#', explanationUrl: '#' },
  { id: 21, chapter: '第III章 国際金融論', name: '為替レート', description: '名目・実質、実効為替レート', problemUrl: '#', explanationUrl: '#' },
  { id: 22, chapter: '第III章 国際金融論', name: '為替レート決定理論I（長期）', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 23, chapter: '第III章 国際金融論', name: '為替レート決定理論II（短期）', description: '金利平価説、ポートフォリオ・バランス・アプローチ', problemUrl: '#', explanationUrl: '#' },
  { id: 24, chapter: '第III章 国際金融論', name: '為替介入とその効果', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 25, chapter: '第III章 国際金融論', name: 'オープン・マクロ（IS-LM型小国モデル）', description: '', problemUrl: '#', explanationUrl: '#' },

  // 第IV章 ミクロ経済学
  { id: 26, chapter: '第IV章 ミクロ経済学', name: '消費者の効用最大化', description: '所得効果と価格効果', problemUrl: '#', explanationUrl: '#' },
  { id: 27, chapter: '第IV章 ミクロ経済学', name: '企業の利潤最大化', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 28, chapter: '第IV章 ミクロ経済学', name: '市場均衡と価格の自動調整機能', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 29, chapter: '第IV章 ミクロ経済学', name: '市場均衡と資源配分の効率性', description: '余剰分析、価格規制、市場の失敗（外部性、公共財）', problemUrl: '#', explanationUrl: '#' },
  { id: 30, chapter: '第IV章 ミクロ経済学', name: '不完全競争市場', description: '独占、複占（クールノー均衡）', problemUrl: '#', explanationUrl: '#' },
  { id: 31, chapter: '第IV章 ミクロ経済学', name: '国際貿易と関税', description: '', problemUrl: '#', explanationUrl: '#' },
  { id: 32, chapter: '第IV章 ミクロ経済学', name: 'ライフサイクル仮説', description: '予算制約、消費の平準化、リカードの中立命題', problemUrl: '#', explanationUrl: '#' },
  { id: 33, chapter: '第IV章 ミクロ経済学', name: '情報の経済学', description: '逆選択、モラルハザード、エージェンシー問題', problemUrl: '#', explanationUrl: '#' },
]

const chapters = [...new Set(ITEMS.map(item => item.chapter))]

function getItemsGrouped(): { chapter: string; items: Item[] }[] {
  return chapters.map(chapter => ({
    chapter,
    items: ITEMS.filter(item => item.chapter === chapter),
  }))
}

export default function Items() {
  const { weakItems, fetchWeakItems, toggleWeakItem } = useStudyStore()

  useEffect(() => { fetchWeakItems() }, [fetchWeakItems])

  const grouped = getItemsGrouped()
  const weakCount = weakItems.size

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
        <div className="grid grid-cols-[1fr_auto_auto_auto] bg-[#111125] border-b border-[#2a2a4a] px-4 py-2.5">
          <span className="text-xs text-[#9090bb] font-medium">項目名</span>
          <span className="text-xs text-[#9090bb] font-medium w-12 text-center">苦手</span>
          <span className="text-xs text-[#9090bb] font-medium w-12 text-center">問題集</span>
          <span className="text-xs text-[#9090bb] font-medium w-12 text-center">解説</span>
        </div>

        {grouped.map(({ chapter, items }) => (
          <div key={chapter}>
            <div className="px-4 py-2 bg-[#111125] border-b border-[#2a2a4a] border-l-4 border-l-[#7c4dff] flex items-center">
              <span className="text-xs font-semibold text-[#9090bb] tracking-wide">{chapter}</span>
            </div>

            {items.map((item, rowIndex) => (
              <div
                key={item.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] px-4 py-3 border-b border-[#2a2a4a] items-center transition-colors hover:bg-[rgba(124,77,255,0.05)] ${
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

                <div className="w-12 flex justify-center">
                  <a href={item.problemUrl} target="_blank" rel="noopener noreferrer"
                    title="問題集を開く" className="p-1 rounded-lg hover:bg-[#252540] transition-colors group">
                    <ExternalLink className="w-4 h-4 text-[#8888aa] group-hover:text-[#7c4dff] transition-colors" strokeWidth={1.5} />
                  </a>
                </div>

                <div className="w-12 flex justify-center">
                  <a href={item.explanationUrl} target="_blank" rel="noopener noreferrer"
                    title="解説を開く" className="p-1 rounded-lg hover:bg-[#252540] transition-colors group">
                    <FileText className="w-4 h-4 text-[#8888aa] group-hover:text-[#7c4dff] transition-colors" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
