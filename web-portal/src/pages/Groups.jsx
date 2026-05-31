import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { MessageSquare, Send, Hash, Users, Sparkles, Plus, Search, X, Check, Filter, AlertCircle, Clock, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { asArray } from '../lib/safeData'

const INITIAL_GROUPS = [
  { id: 'general', name: 'Collegium Net Discussion', description: 'Central lobby for all Collegium Net members', members: 1748 },
  { id: 'cse-core', name: 'CSE-Core Semester 4', description: 'Core study group for Computer Science fourth semester', members: 120 },
  { id: 'ai-research', name: 'AI & Deep Learning', description: 'Discussion on artificial intelligence developments', members: 85 },
  { id: 'maths-prep', name: 'Mathematics prep group', description: 'Formula preparation and exam revisions', members: 230 },
]

const INITIAL_MESSAGES = {
  general: [
    { id: 1, sender: 'Dr. Arjun Joshi', role: 'teacher', text: 'Good morning everyone! Please check the latest announcement regarding semester registration deadlines.', time: '09:15 AM' },
    { id: 2, sender: 'Karan Sharma', role: 'student', text: 'Thanks Dr. Joshi, is the portal open for payment?', time: '09:22 AM' },
    { id: 3, sender: 'Dr. Arjun Joshi', role: 'teacher', text: 'Yes Karan, the billing team has activated the gateway links.', time: '09:25 AM' },
  ],
  'cse-core': [
    { id: 1, sender: 'Rahul Singh', role: 'student', text: 'Has anyone completed the DBMS assignment on SQL normalization?', time: 'Yesterday' },
    { id: 2, sender: 'Sneha Singh', role: 'student', text: 'Yes Rahul! I have completed up to 3NF. Can share notes in a bit.', time: 'Yesterday' },
    { id: 3, sender: 'Karan Sharma', role: 'student', text: 'Perfect, let’s meet in the library during the recess!', time: '10:05 AM' },
  ],
  'ai-research': [
    { id: 1, sender: 'Dr. Ananya Jain', role: 'teacher', text: 'Here is an excellent research paper on Vision Transformers for anyone interested.', time: '2 days ago' },
    { id: 2, sender: 'Aditya Sharma', role: 'student', text: 'Thank you ma’am! Reading this for my machine learning project.', time: 'Yesterday' },
  ],
  'maths-prep': [
    { id: 1, sender: 'Priya Joshi', role: 'student', text: 'Does anyone have the cheat sheet for Laplace Transforms?', time: '3 days ago' },
    { id: 2, sender: 'Krishna Gupta', role: 'student', text: 'Uploaded one on the college shared drive last week. Let me reshare the link.', time: '2 days ago' },
  ]
}

export default function Groups() {
  const { user, BASE_URL } = useAuth()
  const [activeGroup, setActiveGroup] = useState('general')
  const [adminTab, setAdminTab] = useState('pending') // 'approved' | 'pending' | 'rejected'
  const roleHeadingClass = user && (user.role === 'admin' || user.role === 'teacher') ? 'text-slate-900' : 'text-white'
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)

  // DB Groups & Requests list
  const [dbRequests, setDbRequests] = useState([])
  const [departments, setDepartments] = useState([])

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedFilterSem, setSelectedFilterSem] = useState('')
  const [selectedFilterDept, setSelectedFilterDept] = useState('')
  const [dbStudents, setDbStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Deletion States
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [deletedDemoGroupIds, setDeletedDemoGroupIds] = useState(new Set())

  // Load active study groups & requests from database
  const loadWorkspace = useCallback(() => {
    setLoading(true)
    Promise.all([
      axios.get(`${BASE_URL}/users/groups/requests`),
      axios.get(`${BASE_URL}/users/departments/all`)
    ])
      .then(([reqRes, deptRes]) => {
        setDbRequests(asArray(reqRes?.data))
        setDepartments(asArray(deptRes?.data))
      })
      .catch(err => {
        console.error("Failed to load collaborative groups workspace", err)
      })
      .finally(() => setLoading(false))
  }, [BASE_URL])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  // Fetch student directory from backend
  const fetchStudents = useCallback(() => {
    setLoadingStudents(true)
    axios.get(`${BASE_URL}/users/students?limit=2000`)
      .then(res => {
        setDbStudents(asArray(res?.data?.students))
      })
      .catch(err => {
        console.error("Failed to load student directory catalog", err)
      })
      .finally(() => setLoadingStudents(false))
  }, [BASE_URL])

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const requests = asArray(dbRequests)
  const deptList = asArray(departments)
  const studentList = asArray(dbStudents)

  // Filter students dynamically based on search, semester, and department
  const filteredStudents = studentList.filter(s => {
    if (!s) return false
    const q = studentSearch.toLowerCase()
    const matchesSearch = (s.name || '').toLowerCase().includes(q) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(q))
    const matchesSem = !selectedFilterSem || s.semester === parseInt(selectedFilterSem, 10)
    const matchesDept = !selectedFilterDept || s.dept_id === parseInt(selectedFilterDept, 10)
    return matchesSearch && matchesSem && matchesDept
  })

  // Check if all filtered students are selected
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id))

  const handleSelectAllFiltered = () => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        // Deselect all filtered
        filteredStudents.forEach(s => next.delete(s.id))
      } else {
        // Select all filtered
        filteredStudents.forEach(s => next.add(s.id))
      }
      return next
    })
  }

  // Submit Group Approval request to Admin
  const handleCreateGroupRequest = (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) {
      alert('Please enter a study group name before submitting.')
      return
    }
    if (selectedStudentIds.size === 0) {
      alert('Select at least one student to include in the group request.')
      return
    }

    axios.post(`${BASE_URL}/users/groups/request`, {
      name: newGroupName,
      description: newGroupDesc || 'B.Tech Study Group',
      num_students: selectedStudentIds.size
    })
      .then(res => {
        // Refresh requests list
        loadWorkspace()
        setShowCreateModal(false)
        setNewGroupName('')
        setNewGroupDesc('')
        setSelectedStudentIds(new Set())
        setSelectedFilterSem('')
        setSelectedFilterDept('')
        setActiveGroup(`request-${res.data.id}`)
      })
      .catch(err => {
        console.error("Failed to submit group request", err)
        alert("Failed to submit group request. Please try again.")
      })
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const now = new Date()
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMessage = {
      id: Date.now(),
      sender: user?.name || 'Anonymous',
      role: user?.role || 'student',
      text: inputText,
      time: formattedTime
    }

    setMessages(prev => ({
      ...prev,
      [activeGroup]: [...(prev[activeGroup] || []), newMessage]
    }))
    setInputText('')
  }

  const handleApproveRequest = (id) => {
    axios.post(`${BASE_URL}/users/groups/requests/${id}/approve`)
      .then(() => {
        loadWorkspace()
        setActiveGroup('general')
      })
      .catch(err => {
        console.error("Failed to approve group", err)
      })
  }

  const handleRejectRequest = (id) => {
    axios.post(`${BASE_URL}/users/groups/requests/${id}/reject`)
      .then(() => {
        loadWorkspace()
        setActiveGroup('general')
      })
      .catch(err => {
        console.error("Failed to reject group", err)
      })
  }

  const handleInitiateDelete = (group) => {
    setGroupToDelete(group)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (!groupToDelete) return

    const isRequestGroup = groupToDelete.id && String(groupToDelete.id).startsWith('request-')
    const isDbBacked = groupToDelete.dbId || isRequestGroup || (groupToDelete.status && groupToDelete.id)

    const reqDbId = groupToDelete.dbId || 
                    (isRequestGroup ? String(groupToDelete.id).replace('request-', '') : null) ||
                    (groupToDelete.status ? groupToDelete.id : null)

    if (isDbBacked && reqDbId) {
      axios.delete(`${BASE_URL}/users/groups/${reqDbId}`)
        .then(() => {
          loadWorkspace()
          setActiveGroup('general')
          setShowDeleteModal(false)
          setGroupToDelete(null)
        })
        .catch(err => {
          console.error("Failed to delete study group", err)
          alert("Failed to delete study group. Please try again.")
        })
    } else {
      // Local demo group deletion
      setDeletedDemoGroupIds(prev => {
        const next = new Set(prev)
        next.add(groupToDelete.id)
        return next
      })
      
      const remainingDemoChannels = INITIAL_GROUPS.filter(g => g.id !== groupToDelete.id && !deletedDemoGroupIds.has(g.id))
      if (remainingDemoChannels.length > 0) {
        setActiveGroup(remainingDemoChannels[0].id)
      } else {
        setActiveGroup('general')
      }
      
      setShowDeleteModal(false)
      setGroupToDelete(null)
    }
  }

  // Approved DB requests mapping
  const approvedDBGroups = (requests || [])
    .filter(r => r?.status === 'APPROVED')
    .map(r => ({
      id: `request-${r?.id}`,
      name: r?.name ?? 'Study Group',
      description: r?.description || 'Approved study channel',
      members: (r?.num_students ?? 0) + 1,
      dbId: r?.id,
      created_by_name: r?.created_by_name ?? '',
      num_students: r?.num_students ?? 0,
    }))

  const totalApprovedGroups = approvedDBGroups.length
  const totalGroupMembers = approvedDBGroups.reduce((sum, g) => sum + (g.members || 0), 0)
  const visibleChannels = user?.role === 'admin'
    ? approvedDBGroups
    : [...INITIAL_GROUPS.filter(g => !deletedDemoGroupIds.has(g.id)), ...approvedDBGroups]

  // Merged active study channels for non-admin users
  const activeChannels = [
    ...INITIAL_GROUPS.filter(g => !deletedDemoGroupIds.has(g.id)),
    ...approvedDBGroups
  ]

  // Distinct requests lists for Admin Dashboard
  const pendingRequests = requests.filter(r => r?.status === 'PENDING')
  const rejectedRequests = requests.filter(r => r?.status === 'REJECTED')
  const totalPendingRequests = pendingRequests.length
  const totalRejectedRequests = rejectedRequests.length

  // Pending/Rejected requests list (retained for fallback visibility)
  const pendingOrRejectedRequests = requests.filter(r => r?.status === 'PENDING' || r?.status === 'REJECTED')

  // Find currently active item
  const isActiveRequestPending = activeGroup?.startsWith('request-') &&
    requests.find(r => `request-${r?.id}` === activeGroup && r?.status !== 'APPROVED')

  const currentActiveGroupItem = activeChannels.find(g => g?.id === activeGroup) ||
    pendingOrRejectedRequests.find(r => `request-${r?.id}` === activeGroup) ||
    activeChannels[0]

  if (loading) {
    return (
      <div className="space-y-6 page-enter animate-fade-in h-[calc(100vh-8rem)] flex flex-col relative">
        <div>
          <h1 className={`text-3xl font-bold ${roleHeadingClass} flex items-center gap-2.5`}>
            <MessageSquare className="text-brand-400" size={28} />
            Collaborative Groups
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Loading study channels…</p>
        </div>
        <Spinner className="flex-1 min-h-[300px]" label="Loading groups…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter animate-fade-in h-[calc(100vh-8rem)] flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${roleHeadingClass} flex items-center gap-2.5`}>
            <MessageSquare className="text-brand-400" size={28} />
            Collaborative Groups
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Discuss topics, share syllabus content, and sync with peers in real-time channels.</p>
        </div>
        {user?.role === 'teacher' && (
          <button
            onClick={() => {
              setShowCreateModal(true)
              fetchStudents()
            }}
            className="btn-primary py-2.5 px-5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-transform"
          >
            <Plus size={16} /> Request New Group
          </button>
        )}
      </div>

      {/* Main Workspace Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel: Groups Sidebar */}
        <div className="lg:col-span-1 glass border border-white/10 rounded-2xl p-4 flex flex-col min-h-0 bg-white/[0.01]">
          
          {/* Section: Live Channels */}
          <h2 className="text-white font-semibold text-base mb-4 px-2 flex items-center justify-between">
            <span>Study Channels</span>
            {user?.role === 'teacher' && (
              <button
                onClick={() => {
                  setShowCreateModal(true)
                  fetchStudents()
                }}
                className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/25 active:scale-95 transition-all flex items-center justify-center animate-pulse"
                title="Create Group Request"
              >
                <Plus size={14} />
              </button>
            )}
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {visibleChannels.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-muted)]">No active study groups have been approved yet.</div>
            ) : (visibleChannels || []).map(group => {
              if (!group?.id) return null
              const isActive = group.id === activeGroup
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                    isActive
                      ? 'bg-brand-600/20 border-brand-500/30 text-white shadow-lg'
                      : 'bg-white/[0.01] border-white/5 text-[var(--text-muted)] hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-white">
                    <Hash size={16} className={isActive ? 'text-brand-400' : 'text-gray-500'} />
                    <span className="truncate">{group.name}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1">{group.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-1">
                    <Users size={10} />
                    <span>{group.members} members</span>
                  </div>
                </button>
              )
            })}

            {/* Section: Pending Group Approvals (Teachers & Admins Only) */}
            {((user?.role === 'teacher' || user?.role === 'admin') && pendingOrRejectedRequests.length > 0) && (
              <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold px-2 block mb-3">Pending Requests</span>
                {(pendingOrRejectedRequests || []).map(req => {
                  if (!req?.id) return null
                  const reqId = `request-${req.id}`
                  const isActive = activeGroup === reqId
                  const isRejected = req.status === 'REJECTED'
                  return (
                    <button
                      key={req.id}
                      onClick={() => setActiveGroup(reqId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                        isActive
                          ? 'bg-brand-600/10 border-brand-500/25 text-white shadow'
                          : 'bg-white/[0.01] border-white/5 text-[var(--text-muted)] hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-sm text-white truncate">
                          <Clock size={14} className={isRejected ? 'text-red-400' : 'text-amber-400 animate-pulse'} />
                          <span className="truncate">{req.name}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isRejected
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{req.num_students} students selected</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Box / Approval State View */}
        <div className="lg:col-span-3 glass border border-white/10 rounded-2xl flex flex-col min-h-0 bg-white/[0.01]">
          {user?.role === 'admin' ? (
            <div className="flex-1 flex flex-col gap-6 p-6 min-h-0 overflow-hidden">
              {/* Dynamic Action-Stat Clickable Cards */}
              <div className="grid gap-4 sm:grid-cols-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setAdminTab('approved')}
                  className={`text-left glass border rounded-2xl p-5 transition-all duration-200 active:scale-98 cursor-pointer ${
                    adminTab === 'approved'
                      ? 'border-brand-500/40 bg-brand-500/5 shadow-lg shadow-brand-500/5'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-2 font-bold">Approved Study Groups</p>
                  <h2 className="text-3xl font-extrabold text-white">{totalApprovedGroups}</h2>
                  <p className="text-[var(--text-muted)] text-[11px] mt-2">Active live study channels.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('pending')}
                  className={`text-left glass border rounded-2xl p-5 transition-all duration-200 active:scale-98 cursor-pointer ${
                    adminTab === 'pending'
                      ? 'border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-2 font-bold">Pending Requests</p>
                  <h2 className="text-3xl font-extrabold text-white">{totalPendingRequests}</h2>
                  <p className="text-[var(--text-muted)] text-[11px] mt-2">Awaiting admin review.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('rejected')}
                  className={`text-left glass border rounded-2xl p-5 transition-all duration-200 active:scale-98 cursor-pointer ${
                    adminTab === 'rejected'
                      ? 'border-red-500/40 bg-red-500/5 shadow-lg shadow-red-500/5'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-2 font-bold">Rejected Requests</p>
                  <h2 className="text-3xl font-extrabold text-white">{totalRejectedRequests}</h2>
                  <p className="text-[var(--text-muted)] text-[11px] mt-2">Declined group setups.</p>
                </button>

                <div className="text-left glass border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider mb-2 font-bold">Total Group Members</p>
                  <h2 className="text-3xl font-extrabold text-white">{totalGroupMembers}</h2>
                  <p className="text-[var(--text-muted)] text-[11px] mt-2">Active students in channels.</p>
                </div>
              </div>

              {/* Dynamic List Component */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {adminTab === 'approved' && (
                  <div className="glass border border-white/10 rounded-2xl p-5 bg-white/[0.02] min-h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                        Approved Study Groups
                      </h3>
                      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">{totalApprovedGroups} Active Channels</span>
                    </div>
                    
                    {approvedDBGroups.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No approved study groups have been activated yet.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(approvedDBGroups || []).map(group => {
                          if (!group?.id) return null
                          return (
                          <div key={group.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all flex flex-col justify-between gap-3">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-white font-extrabold text-sm flex items-center gap-1">
                                  <Hash size={14} className="text-brand-400" />
                                  {group.name}
                                </h4>
                                <span className="text-[10px] text-brand-300 font-bold bg-brand-500/10 border border-brand-500/20 py-0.5 px-2.5 rounded-full flex items-center gap-1">
                                  <Users size={10} /> {group.members} members
                                </span>
                              </div>
                              <p className="text-[var(--text-muted)] text-xs mt-2 line-clamp-2">{group.description}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 text-[10px] text-[var(--text-muted)]">
                              <span>Created by: <b>{group.created_by_name}</b></span>
                              <button
                                type="button"
                                onClick={() => handleInitiateDelete(group)}
                                className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 size={10} /> Delete Group
                              </button>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                )}

                {adminTab === 'pending' && (
                  <div className="glass border border-white/10 rounded-2xl p-5 bg-white/[0.02] min-h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending Approval Requests
                      </h3>
                      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">{totalPendingRequests} Awaiting Action</span>
                    </div>
                    
                    {pendingRequests.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No pending study group requests. All requests have been processed!
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(pendingRequests || []).map(req => {
                          if (!req?.id) return null
                          return (
                          <div key={req.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all flex flex-col justify-between gap-3">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-white font-extrabold text-sm flex items-center gap-1">
                                  <Clock size={14} className="text-amber-400 animate-pulse" />
                                  {req.name}
                                </h4>
                                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 py-0.5 px-2.5 rounded-full">
                                  {req.num_students} students
                                </span>
                              </div>
                              <p className="text-[var(--text-muted)] text-xs mt-2 line-clamp-2">{req.description || 'No description provided.'}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                              <span className="text-[10px] text-[var(--text-muted)]">By: <b>{req.created_by_name}</b></span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(req.id)}
                                  className="text-xs font-bold bg-red-600/15 border border-red-500/20 text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-600/25 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <X size={12} /> Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(req.id)}
                                  className="text-xs font-bold bg-green-600/15 border border-green-500/20 text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-600/25 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <Check size={12} /> Approve
                                </button>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                )}

                {adminTab === 'rejected' && (
                  <div className="glass border border-white/10 rounded-2xl p-5 bg-white/[0.02] min-h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        Rejected Requests Archive
                      </h3>
                      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">{totalRejectedRequests} Terminated</span>
                    </div>
                    
                    {rejectedRequests.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No rejected requests in archive.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(rejectedRequests || []).map(req => {
                          if (!req?.id) return null
                          return (
                          <div key={req.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all flex flex-col justify-between gap-3">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="text-white font-extrabold text-sm flex items-center gap-1">
                                  <X size={14} className="text-red-400" />
                                  {req.name}
                                </h4>
                                <span className="text-[10px] text-red-300 font-bold bg-red-500/10 border border-red-500/20 py-0.5 px-2.5 rounded-full">
                                  Rejected
                                </span>
                              </div>
                              <p className="text-[var(--text-muted)] text-xs mt-2 line-clamp-2">{req.description || 'No description provided.'}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 text-[10px] text-[var(--text-muted)]">
                              <span>Requested by: <b>{req.created_by_name}</b> • <b>{req.num_students}</b> students</span>
                              <button
                                type="button"
                                onClick={() => handleInitiateDelete(req)}
                                className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 size={10} /> Delete Log
                              </button>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : isActiveRequestPending ? (
            /* Pending Request Details Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 page-enter">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-xl ${
                isActiveRequestPending.status === 'REJECTED'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
              }`}>
                {isActiveRequestPending.status === 'REJECTED' ? <AlertCircle size={40} /> : <Clock size={40} className="animate-spin-slow" />}
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-white font-extrabold text-2xl">{isActiveRequestPending.name}</h3>
                <p className="text-[var(--text-muted)] text-sm">{isActiveRequestPending.description || 'B.Tech Study Group Channel'}</p>
                <div className="flex items-center justify-center gap-3 mt-3 text-xs bg-white/5 py-2 px-4 rounded-full border border-white/5 max-w-fit mx-auto">
                  <span className="text-gray-300">Created by: <b>{isActiveRequestPending.created_by_name}</b></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="text-gray-300">Strength: <b>{isActiveRequestPending.num_students} Students</b></span>
                </div>
              </div>

              <div className="glass border border-white/15 rounded-2xl p-6 max-w-md bg-white/[0.01] shadow-inner text-left leading-relaxed">
                <h4 className="text-white text-sm font-bold flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-brand-400" />
                  Approval Workflow Status
                </h4>
                {isActiveRequestPending.status === 'REJECTED' ? (
                  <p className="text-red-300 text-xs">
                    This study group request was **Rejected** by the system Administrator. Please contact the Admin or submit a new setup request with updated student rosters.
                  </p>
                ) : user?.role === 'admin' ? (
                  <div className="space-y-3">
                    <p className="text-amber-300 text-[11px] mb-4 leading-relaxed">
                      Review this group setup request and take action. Approving this group will instantly activate it as a live study channel for all enrolled students.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveRequest(isActiveRequestPending.id)}
                        className="btn-primary py-2 px-4 text-xs font-bold bg-green-600 hover:bg-green-500 shadow flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(isActiveRequestPending.id)}
                        className="btn-ghost py-2 px-4 text-xs font-bold bg-red-600/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-amber-300 text-xs">
                    This study group request has been submitted to the Admin. Once approved, it will automatically activate as a live discussion channel and unlock instant chat logs for the {isActiveRequestPending.num_students} enrolled students!
                  </p>
                )}

                {/* Cancel & Delete Request Button for Creator or Admin */}
                {(user?.role === 'admin' || (user?.role === 'teacher' && isActiveRequestPending.created_by_name === user?.name)) && (
                  <button
                    onClick={() => handleInitiateDelete(isActiveRequestPending)}
                    className="btn-ghost mt-4 py-2 px-4 text-xs font-bold bg-red-600/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer w-full justify-center"
                  >
                    <Trash2 size={13} /> Cancel & Delete Request
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Active Group Chat View */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Active Group Banner */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Hash size={20} className="text-brand-400" />
                  <div>
                    <h3 className="text-white font-bold text-base leading-snug">
                      {currentActiveGroupItem.name}
                    </h3>
                    <p className="text-[var(--text-muted)] text-xs">{currentActiveGroupItem.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <Users size={12} />
                    <span>{currentActiveGroupItem.members} Members</span>
                  </div>
                  {(user?.role === 'admin' || (user?.role === 'teacher' && (!currentActiveGroupItem.dbId && !String(currentActiveGroupItem.id).startsWith('request-') || currentActiveGroupItem.created_by_name === user?.name))) && (
                    <button
                      onClick={() => handleInitiateDelete(currentActiveGroupItem)}
                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      title="Delete Study Group"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {(messages[activeGroup] || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-8">
                    <p className="text-[var(--text-muted)] text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  (messages[activeGroup] || []).map((msg) => {
                    const isMe = msg.sender === user?.name
                    const isSystem = msg.sender === 'System Audit'
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex items-center justify-center py-2">
                          <div className="bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-xs text-brand-300 flex items-center gap-2 max-w-[85%] text-center leading-relaxed">
                            <Sparkles size={12} className="animate-pulse" />
                            <span>{msg.text}</span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-white text-xs font-bold">{msg.sender}</span>
                          <span className="text-[var(--text-muted)] text-[10px] capitalize bg-white/5 px-2 py-0.5 rounded border border-white/5">{msg.role}</span>
                          <span className="text-[var(--text-muted)] text-[9px]">{msg.time}</span>
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed border ${
                          isMe
                            ? 'bg-brand-600/30 border-brand-500/30 text-white rounded-tr-none'
                            : 'bg-white/5 border-white/5 text-gray-200 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Text Input Footer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/[0.01] rounded-b-2xl flex gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message #${currentActiveGroupItem.name}...`}
                  className="flex-1 bg-[#121224] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500 transition-all placeholder:text-gray-500 shadow-inner"
                />
                <button
                  type="submit"
                  className="btn-primary p-3 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 active:scale-95 transition-transform"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4 animate-fade-in">
          <div className="glass border border-white/10 rounded-2xl p-6 w-full max-w-4xl bg-[#111124] shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-brand-400" />
                <h3 className="text-white text-lg font-bold">Request Study Group Setup</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateGroupRequest} className="space-y-4 flex-1 flex flex-col min-h-0">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="group-name" className="block text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Group Name</label>
                  <input
                    type="text"
                    id="group-name"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Microcontrollers Lab"
                    className="w-full bg-[#16162b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500 transition-all placeholder:text-gray-500 shadow-inner"
                  />
                </div>
                <div>
                  <label htmlFor="group-desc" className="block text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Group Description</label>
                  <input
                    type="text"
                    id="group-desc"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="e.g. Lab prep, notes sharing, and discussion thread"
                    className="w-full bg-[#16162b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500 transition-all placeholder:text-gray-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Student Checklist Selection Container */}
              <div className="flex-1 flex flex-col min-h-0 border-t border-white/5 pt-4">
                
                {/* Advanced Semester / Department Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* Semester Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="filter-sem" className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wide">Semester Filter</label>
                    <select
                      id="filter-sem"
                      value={selectedFilterSem}
                      onChange={(e) => setSelectedFilterSem(e.target.value)}
                      className="bg-[#16162b] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500"
                    >
                      <option value="">All Semesters</option>
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="filter-dept" className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wide">Department Filter</label>
                    <select
                      id="filter-dept"
                      value={selectedFilterDept}
                      onChange={(e) => setSelectedFilterDept(e.target.value)}
                      className="bg-[#16162b] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500"
                    >
                      <option value="">All Departments</option>
                      {deptList.map(d => (
                        <option key={d?.id} value={d?.id}>{d?.name ?? '—'} ({d?.code ?? '—'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Search box inside student list */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="modal-search" className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wide">Search Directory</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-500" size={13} />
                      <input
                        id="modal-search"
                        type="text"
                        placeholder="Search student by name..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full bg-[#16162b] border border-white/10 rounded-xl pl-8 pr-4 py-2 text-white text-xs focus:outline-none focus:border-brand-500 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter and Select All Summary */}
                <div className="flex items-center justify-between gap-3 mb-2.5 px-1.5">
                  <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                    <Filter size={12} className="text-brand-400" />
                    Showing {filteredStudents.length} matching students
                  </span>
                  
                  {filteredStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        allFilteredSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/20 bg-white/5'
                      }`}>
                        {allFilteredSelected && <Check size={8} />}
                      </div>
                      <span>Select All {filteredStudents.length} Students</span>
                    </button>
                  )}
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto border border-white/5 rounded-xl bg-white/[0.01] p-3 min-h-[220px] space-y-1.5">
                  {loadingStudents ? (
                    <Spinner className="py-12" label="Loading student directory…" size="sm" />
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[var(--text-muted)]">No matching students found. Adjust your filters above.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(filteredStudents || []).map(student => {
                        if (!student?.id) return null
                        const isChecked = selectedStudentIds.has(student.id)
                        return (
                          <button
                            type="button"
                            key={student.id}
                            onClick={() => toggleStudentSelection(student.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                              isChecked
                                ? 'bg-brand-600/10 border-brand-500/25 text-white shadow-sm'
                                : 'bg-white/[0.01] border-white/5 text-[var(--text-muted)] hover:bg-white/[0.02] hover:border-white/10'
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">{student?.name ?? '—'}</span>
                              <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                Roll: {student.roll_no || 'N/A'} • Sem {student.semester || 'N/A'}
                              </span>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-brand-500 border-brand-500 text-white shadow-md'
                                : 'border-white/20 bg-white/5'
                            }`}>
                              {isChecked && <Check size={10} />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                <span className="text-xs text-[var(--text-muted)]">
                  Total Selected: <b className="text-brand-400 text-sm font-extrabold">{selectedStudentIds.size}</b> students
                </span>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newGroupName.trim()}
                    className="btn-primary py-2 px-6 text-xs font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition-transform"
                  >
                    Submit Group Request
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Bold Red Deletion Warning Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/70 p-4 animate-fade-in">
          <div className="glass border border-red-500/30 rounded-2xl p-6 w-full max-w-md bg-[#161118] shadow-2xl animate-scale-up">
            
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertCircle size={28} />
              <h3 className="text-white text-lg font-extrabold">Confirm Group Deletion</h3>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm leading-relaxed mb-6 font-bold">
              You are deleting this group of {groupToDelete.num_students || groupToDelete.members - 1} number of students and all the files will be deleted.
            </div>

            <p className="text-[var(--text-muted)] text-xs mb-6 leading-relaxed">
              This action is permanent and cannot be undone. All messages, files, and channels related to this study group will be wiped.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setGroupToDelete(null)
                }}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2 px-5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-95 transition-transform cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
