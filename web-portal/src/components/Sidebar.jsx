import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { asArray } from '../lib/safeData'
import {
  LayoutDashboard, Users, GraduationCap, Megaphone,
  LogOut, Zap, BookOpen, MessageSquare, FileText
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/students',     icon: GraduationCap,   label: 'Students'     },
  { to: '/teachers',     icon: Users,           label: 'Teachers'     },
  { to: '/announcements',icon: Megaphone,       label: 'Announcements'},
  { to: '/groups',       icon: MessageSquare,   label: 'Groups'       },
  { to: '/notes',        icon: FileText,        label: 'Notes'        },
]

export default function Sidebar() {
  const { user, logout, BASE_URL } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const fetchPendingCount = () => {
      axios.get(`${BASE_URL}/users/groups/requests`)
        .then(res => {
          const pending = asArray(res?.data).filter(r => r?.status === 'PENDING').length
          setPendingCount(pending)
        })
        .catch(err => {
          console.error("Failed to load sidebar pending count", err)
        })
    }

    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 10000)
    return () => clearInterval(interval)
  }, [user, BASE_URL])

  const allowedNavItems = (NAV_ITEMS || []).filter(({ to }) => {
    if (user?.role !== 'admin' && (to === '/students' || to === '/teachers')) {
      return false
    }
    return true
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      id="main-sidebar"
      className="fixed left-0 top-0 h-full w-64 glass border-r border-[var(--border-glass)] flex flex-col z-40"
      style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(12px)' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-hero-gradient flex items-center justify-center shadow-lg shadow-brand-600/30">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Collegium Net</p>
            <p className="text-[var(--text-muted)] text-xs">
              {user?.role === 'admin' ? 'Admin Portal' : user?.role === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {(allowedNavItems || []).map(({ to, icon: Icon, label }) => {
          const showBadge = label === 'Groups' && user?.role === 'admin' && pendingCount > 0
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} flex items-center justify-between`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={17} />
                <span>{label}</span>
              </div>
              {showBadge && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border border-amber-400 shadow-lg shadow-amber-500/30 mr-1" />
              )}
            </NavLink>
          )
        })}
      </nav>


      {/* User + Logout */}
      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[var(--text-muted)] text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost w-full justify-center gap-2 text-xs">
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
