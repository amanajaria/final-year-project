import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { asArray } from '../lib/safeData'
import StatsCard from '../components/StatsCard'
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Users, TrendingUp, AlertTriangle, Calendar, RefreshCw, Check, X, Clock } from 'lucide-react'

const WEEKLY_DATA = [
  { day: 'Mon', attendance: 87, absent: 13 },
  { day: 'Tue', attendance: 92, absent: 8 },
  { day: 'Wed', attendance: 78, absent: 22 },
  { day: 'Thu', attendance: 95, absent: 5 },
  { day: 'Fri', attendance: 88, absent: 12 },
  { day: 'Sat', attendance: 70, absent: 30 },
]

const DEPT_DATA = [
  { name: 'CSE',  value: 340, color: '#6270f1' },
  { name: 'ECE',  value: 270, color: '#a855f7' },
  { name: 'MECH', value: 195, color: '#ec4899' },
  { name: 'CIVIL',value: 150, color: '#22c55e' },
  { name: 'MBA',  value: 120, color: '#f59e0b' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-white/10 rounded-xl px-4 py-3 text-sm">
      <p className="text-white font-semibold mb-1">{label}</p>
      {(payload || []).map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  )
}

function StudentDashboardView({ user, BASE_URL }) {
  const [logs, setLogs] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [results, setResults] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      axios.get(`${BASE_URL}/attendance/my`),
      axios.get(`${BASE_URL}/announcements/`),
      axios.get(`${BASE_URL}/users/me/results`)
    ])
      .then(([attRes, annRes, resRes]) => {
        setLogs(asArray(attRes?.data))
        setAnnouncements(asArray(annRes?.data).slice(0, 5))
        setResults(resRes?.data ?? null)
        if (user?.semester) {
          setSelectedSemester(Math.min(user.semester, 8))
        } else {
          setSelectedSemester(1)
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load student dashboard data.')
      })
      .finally(() => setLoading(false))
  }, [BASE_URL, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-8 page-enter animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Loading your academic report…</p>
        </div>
        <Spinner className="min-h-[50vh]" label="Loading dashboard…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] page-enter">
        <div className="glass border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto animate-slide-up">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1.5">Load Error</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">{error}</p>
          <button onClick={loadData} className="btn-primary py-2 px-5 text-sm mx-auto shadow-md">
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      </div>
    )
  }

  const safeLogs = asArray(logs)
  const total = safeLogs.length
  const present = safeLogs.filter(l => l?.status === 'PRESENT').length
  const absent = total - present
  const pct = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-8 page-enter animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Welcome back, {user?.name ?? 'Student'}! Here is your academic and attendance report.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatsCard title="Attendance Rate" value={`${pct}%`} color={parseFloat(pct) >= 75 ? "green" : "red"} trend={0} trendLabel="required: 75%" />
        <StatsCard title="Total Classes" value={String(total)} color="brand" />
        <StatsCard title="Classes Attended" value={String(present)} color="green" />
        <StatsCard title="Classes Absent" value={String(absent)} color="red" />
      </div>

      {/* History and Announcements Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance History */}
        <div className="xl:col-span-2 glass border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-5">Attendance History</h2>
          <div className="table-container max-h-[300px] overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class Schedule ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {safeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-[var(--text-muted)] py-6">No attendance records found.</td>
                  </tr>
                ) : (
                  safeLogs.map(log => {
                    if (!log?.id) return null
                    return (
                    <tr key={log.id}>
                      <td className="text-white font-medium">{log.date ? new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="text-[var(--text-muted)]">Schedule ID: {log?.schedule_id ?? '—'}</td>
                      <td>
                        <span className={log?.status === 'PRESENT' ? 'badge badge-green' : 'badge badge-red'}>
                          {log?.status ?? '—'}
                        </span>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Announcements List */}
        <div className="glass border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-5">Recent Announcements</h2>
          {asArray(announcements).length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm text-center py-6">No announcements posted.</p>
          ) : (
            <div className="space-y-3">
              {asArray(announcements).map(ann => {
                if (!ann?.id) return null
                return (
                <div key={ann.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-brand-500/10 transition-colors">
                  <p className="text-white text-xs font-semibold truncate">{ann?.title ?? '—'}</p>
                  <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{ann?.body ?? ''}</p>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Academic Results Report Section */}
      <div className="glass border border-white/10 rounded-2xl p-6 space-y-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Academic Results & Grades</h2>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">Select a semester to view your subject grades, semester GPA, and cumulative CGPA.</p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="sem-select" className="text-[var(--text-muted)] text-sm font-medium">Semester:</label>
            <select
              id="sem-select"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="bg-[#121224] border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-500 transition-all cursor-pointer shadow-md hover:border-white/20"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Display GPA summary for selected semester */}
        {results?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors flex flex-col items-center justify-center text-center">
              <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Semester {selectedSemester} GPA</span>
              <span className="text-3xl font-extrabold text-white mt-1.5">
                {results?.summary?.[`sem${selectedSemester}_gpa`] != null ? results.summary[`sem${selectedSemester}_gpa`].toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors flex flex-col items-center justify-center text-center">
              <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Overall Cumulative CGPA</span>
              <span className="text-3xl font-extrabold text-brand-400 mt-1.5">
                {results?.summary?.cgpa != null ? results.summary.cgpa.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors flex flex-col items-center justify-center text-center">
              <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Enrollment Number</span>
              <span className="text-base font-bold text-white mt-2">
                {results?.summary?.enrollment_no ?? '—'}
              </span>
            </div>
          </div>
        )}

        {/* Tabular view of subjects in the selected semester */}
        <div className="table-container max-h-[400px] overflow-y-auto">
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Semester</th>
                <th>Grade Point (GPA)</th>
                <th>Letter Grade Equivalent</th>
              </tr>
            </thead>
            <tbody>
              {!results?.subject_results || asArray(results.subject_results).filter(s => s?.semester === selectedSemester).length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-[var(--text-muted)] py-6">
                    No academic records found for Semester {selectedSemester}.
                  </td>
                </tr>
              ) : (
                asArray(results?.subject_results)
                  .filter(s => s?.semester === selectedSemester)
                  .map(sub => {
                    if (!sub?.id) return null
                    let letterGrade = 'F';
                    let gradeColor = 'text-red-400';
                    const gpa = sub?.gpa ?? 0
                    if (gpa >= 9.0) {
                      letterGrade = 'O (Outstanding)';
                      gradeColor = 'text-emerald-400 font-semibold';
                    } else if (gpa >= 8.0) {
                      letterGrade = 'A+ (Excellent)';
                      gradeColor = 'text-green-400 font-semibold';
                    } else if (gpa >= 7.0) {
                      letterGrade = 'A (Very Good)';
                      gradeColor = 'text-blue-400 font-semibold';
                    } else if (gpa >= 6.0) {
                      letterGrade = 'B+ (Good)';
                      gradeColor = 'text-indigo-400';
                    } else if (gpa >= 5.0) {
                      letterGrade = 'B (Above Average)';
                      gradeColor = 'text-amber-400';
                    } else if (gpa >= 4.0) {
                      letterGrade = 'C (Average)';
                      gradeColor = 'text-orange-400';
                    }
                    
                    return (
                      <tr key={sub.id} className="hover:bg-white/[0.01]">
                        <td className="text-white font-medium">{sub?.subject_name ?? '—'}</td>
                        <td className="text-[var(--text-muted)]">Semester {sub?.semester ?? '—'}</td>
                        <td className="text-white font-semibold">{gpa.toFixed(2)}</td>
                        <td>
                          <span className={gradeColor}>
                            {letterGrade}
                          </span>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { BASE_URL, user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnns, setLoadingAnns] = useState(true)
  const [error, setError] = useState('')

  // Admin approvals queue & stats
  const [groupRequests, setGroupRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [activeGroupCount, setActiveGroupCount] = useState(4) // 4 local demo groups + DB ones

  // Admin deletion logs state
  const [deletionLogs, setDeletionLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const loadAnnouncements = useCallback(() => {
    setLoadingAnns(true)
    setError('')
    axios.get(`${BASE_URL}/announcements/`)
      .then(r => setAnnouncements(asArray(r?.data).slice(0, 4)))
      .catch(err => {
        setError(err.message || 'Failed to load announcements.')
      })
      .finally(() => setLoadingAnns(false))
  }, [BASE_URL])

  const loadGroupRequests = useCallback(() => {
    if (user?.role !== 'admin') return
    setLoadingRequests(true)
    axios.get(`${BASE_URL}/users/groups/requests`)
      .then(r => {
        const data = asArray(r?.data)
        const pending = data.filter(req => req?.status === 'PENDING')
        const approved = data.filter(req => req?.status === 'APPROVED')
        setGroupRequests(pending)
        setActiveGroupCount(4 + approved.length)
      })
      .catch(err => {
        console.error("Failed to load group requests", err)
      })
      .finally(() => setLoadingRequests(false))
  }, [BASE_URL, user])

  const loadDeletionLogs = useCallback(() => {
    if (user?.role !== 'admin') return
    setLoadingLogs(true)
    axios.get(`${BASE_URL}/users/groups/deleted-logs`)
      .then(res => {
        setDeletionLogs(asArray(res?.data))
      })
      .catch(err => {
        console.error("Failed to load group deletion logs", err)
      })
      .finally(() => setLoadingLogs(false))
  }, [BASE_URL, user])

  useEffect(() => {
    loadAnnouncements()
    loadGroupRequests()
    loadDeletionLogs()
  }, [loadAnnouncements, loadGroupRequests, loadDeletionLogs])

  const handleApproveRequest = (id) => {
    axios.post(`${BASE_URL}/users/groups/requests/${id}/approve`)
      .then(() => {
        loadGroupRequests()
        loadDeletionLogs()
      })
      .catch(err => {
        console.error("Failed to approve group", err)
        alert("Failed to approve study group request.")
      })
  }

  const handleRejectRequest = (id) => {
    axios.post(`${BASE_URL}/users/groups/requests/${id}/reject`)
      .then(() => {
        loadGroupRequests()
        loadDeletionLogs()
      })
      .catch(err => {
        console.error("Failed to reject group", err)
        alert("Failed to reject study group request.")
      })
  }

  if (user?.role === 'student') {
    return <StudentDashboardView user={user} BASE_URL={BASE_URL} />
  }

  return (
    <div className="space-y-8 page-enter animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatsCard title="Total Strength"    value="1,075" icon={Users}         color="brand"  trend={2.4}  trendLabel="this semester" />
        <StatsCard title="Today's Attendance" value="88.3%" icon={TrendingUp}    color="green"  trend={1.1}  trendLabel="vs yesterday" />
        <StatsCard title="Defaulters (< 75%)" value="34"   icon={AlertTriangle} color="red"    trend={-3.2} trendLabel="vs last week" />
        {user?.role === 'admin' ? (
          <StatsCard title="Active Study Groups" value={String(activeGroupCount)} icon={Calendar} color="purple" trend={0} trendLabel="live channels" />
        ) : (
          <StatsCard title="Classes Today"      value="24"   icon={Calendar}      color="purple"                                         />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly Attendance Area Chart */}
        <div className="stat-card xl:col-span-2 glass border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-5">Weekly Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={WEEKLY_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAttend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6270f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6270f1" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#8b92b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8b92b8" tick={{ fontSize: 12 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8b92b8' }} />
              <Area type="monotone" dataKey="attendance" name="Present %" stroke="#6270f1" strokeWidth={2} fill="url(#gradAttend)" dot={{ fill: '#6270f1', r: 4 }} />
              <Area type="monotone" dataKey="absent"     name="Absent %"  stroke="#ef4444" strokeWidth={2} fill="url(#gradAbsent)" dot={{ fill: '#ef4444', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Pie Chart */}
        <div className="stat-card glass border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-5">Strength by Dept.</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={DEPT_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {DEPT_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length
                    ? <div className="glass border border-white/10 rounded-xl px-3 py-2 text-xs text-white">{payload[0].name}: <b>{payload[0].value}</b></div>
                    : null
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {DEPT_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[var(--text-muted)]">{d.name}</span>
                </span>
                <span className="text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group Approvals & Announcements Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column: Group Approvals Queue (Admin Only) */}
        {user?.role === 'admin' && (
          <div className="glass border border-white/10 rounded-2xl p-6 flex flex-col min-h-0 bg-white/[0.01]">
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center justify-between border-b border-white/5 pb-3">
              <span>Study Group Requests</span>
              <span className="badge badge-yellow animate-pulse flex items-center gap-1.5 py-1 px-2.5">
                <Clock size={11} />
                {asArray(groupRequests).length} Pending
              </span>
            </h2>
            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1">
              {loadingRequests ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">Loading requests…</div>
              ) : asArray(groupRequests).length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                  No pending group approvals in the queue.
                </div>
              ) : (
                asArray(groupRequests).map(req => {
                  if (!req?.id) return null
                  return (
                  <div key={req.id} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between gap-4 hover:border-brand-500/25 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm truncate">{req?.name ?? '—'}</span>
                        <span className="text-[9px] font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/10">
                          {req.num_students} Students
                        </span>
                      </div>
                      <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{req.description || 'B.Tech Study Group Setup'}</p>
                      <p className="text-brand-400 text-[10px] mt-1 font-semibold">Submitted by: {req.created_by_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="p-2 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 active:scale-90 transition-all flex items-center justify-center shadow-lg"
                        title="Approve Group"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-2 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 active:scale-90 transition-all flex items-center justify-center shadow-lg"
                        title="Reject Group"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        )}

        {/* Right Column / Full Width: Recent Announcements */}
        <div className={`glass border border-white/10 rounded-2xl p-6 bg-white/[0.01] ${user?.role === 'admin' ? '' : 'xl:col-span-2'}`}>
          <h2 className="text-white font-semibold text-lg mb-4 border-b border-white/5 pb-3">Recent Announcements</h2>
          {loadingAnns ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button onClick={loadAnnouncements} className="btn-ghost py-1.5 px-3 text-xs gap-1.5 mx-auto">
                <RefreshCw size={12} className="animate-spin-hover" /> Retry
              </button>
            </div>
          ) : asArray(announcements).length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm text-center py-6">No announcements yet.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {asArray(announcements).map(ann => {
                if (!ann?.id) return null
                return (
                <div key={ann.id} className="flex items-start gap-4 p-3.5 rounded-xl bg-white/[0.01] border border-white/5 hover:border-brand-500/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0 text-brand-400 text-xs font-bold">
                    {(ann?.title || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{ann?.title ?? '—'}</p>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">{ann?.created_at ? new Date(ann.created_at).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Deletion Audit Logs Table */}
      {user?.role === 'admin' && (
        <div className="glass border border-white/10 rounded-2xl p-6 bg-white/[0.01] animate-slide-up mt-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <span>Group Deletion Audit Logs</span>
            <span className="badge badge-red flex items-center gap-1.5 py-1 px-2.5 text-[10px] font-bold">
              <AlertTriangle size={11} />
              {asArray(deletionLogs).length} Total Deleted
            </span>
          </h2>
          <div className="table-container max-h-[300px] overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>Study Group Name</th>
                  <th>Student Count</th>
                  <th>Created By</th>
                  <th>Deleted By</th>
                  <th>Deleted Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-[var(--text-muted)]">Loading deletion audit logs…</td>
                  </tr>
                ) : asArray(deletionLogs).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-[var(--text-muted)]">No study group deletions logged in the system.</td>
                  </tr>
                ) : (
                  asArray(deletionLogs).map(log => {
                    if (!log?.id) return null
                    const formattedDate = log?.deleted_at ? new Date(log.deleted_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '—'
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.01]">
                        <td className="text-white font-bold text-sm">{log?.name ?? '—'}</td>
                        <td className="text-[var(--text-muted)]">{log?.num_students ?? 0} Students</td>
                        <td className="text-brand-400 font-semibold text-xs">{log?.created_by_name ?? '—'}</td>
                        <td className="text-red-400 font-semibold text-xs">{log?.deleted_by_name ?? '—'}</td>
                        <td className="text-gray-300 text-xs font-mono">{formattedDate}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
