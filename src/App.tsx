import { useEffect, type ReactNode, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Quiz from './pages/Quiz'
import Login from './pages/Login'
import { useAuthStore } from './stores/authStore'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
          <div className="text-center text-[#8888aa]">
            <p className="text-lg mb-2">エラーが発生しました</p>
            <button
              onClick={() => window.location.reload()}
              className="text-[#7c4dff] underline text-sm"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7c4dff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ErrorBoundary>
    <BrowserRouter basename="/cma_dushboard">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
          <Route path="/quiz" element={<Quiz />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
