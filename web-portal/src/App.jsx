import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Announcements from './pages/Announcements'
import Groups from './pages/Groups'
import Notes from './pages/Notes'
import Sidebar from './components/Sidebar'
import Spinner from './components/Spinner'
import ErrorBoundary from './components/ErrorBoundary'

function ProtectedLayout() {
  const { isAuthenticated, loading, user } = useAuth()

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      document.body.classList.add('theme-light')
      document.body.classList.remove('theme-dark')
    } else {
      document.body.classList.remove('theme-light')
      document.body.classList.add('theme-dark')
    }
    return () => {
      document.body.classList.remove('theme-light', 'theme-dark')
    }
  }, [user])

  if (loading) return <Spinner className="min-h-screen" label="Loading session…" size="lg" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const themeClass = (user?.role === 'admin' || user?.role === 'teacher') ? 'theme-light' : 'theme-dark';
  return (
    <div className={`flex min-h-screen bg-[var(--bg-primary)] ${themeClass}`}>
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <ErrorBoundary>
          <Routes>
            <Route index element={<Dashboard />} />
            {user?.role === 'admin' && (
              <>
                <Route path="students" element={<Students />} />
                <Route path="teachers" element={<Teachers />} />
              </>
            )}
            <Route path="announcements" element={<Announcements />} />
            <Route path="groups" element={<Groups />} />
            <Route path="notes" element={<Notes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
