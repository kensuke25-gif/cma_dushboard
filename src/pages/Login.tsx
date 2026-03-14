import { LogIn } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle)

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1e1e3a] rounded-[20px] border border-[#2a2a4a] p-8 shadow-2xl">
        {/* ロゴ / タイトル */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-[20px] bg-[rgba(124,77,255,0.15)] border border-[#7c4dff]/30 flex items-center justify-center">
            <LogIn className="w-7 h-7 text-[#7c4dff]" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-white">CMA 学習ダッシュボード</h1>
          <p className="text-sm text-[#8888aa] mt-2">証券アナリスト2次試験</p>
        </div>

        {/* ログインボタン */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-[20px] bg-white hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors shadow"
        >
          {/* Google SVGアイコン */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>

        <p className="text-xs text-[#8888aa] text-center mt-6">
          ログインすることで、すべてのデバイスで<br />学習データが共有されます
        </p>
      </div>
    </div>
  )
}
