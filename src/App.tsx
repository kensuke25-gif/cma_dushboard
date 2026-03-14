import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Login from './pages/Login'
import { useAuthStore } from './stores/authStore'

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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
