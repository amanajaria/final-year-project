import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { asArray } from '../lib/safeData'
import {
  FileText, Plus, Search, Edit3, Save, Trash2, Calendar,
  Sparkles, BookOpen, RefreshCw, Globe, Lock, X, CheckCircle,
  AlertTriangle, Info, Filter
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — shown only when the API is unreachable
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_NOTES = [
  {
    id: '__mock_1',
    title: 'DBMS Lecture 3 — Database Normalization',
    category: 'DBMS',
    is_public: false,
    content:
      '# Database Normalization\n\nDatabase normalization is the process of structuring a relational database in accordance with a series of so-called normal forms.\n\n### 1NF\n- Each cell must be atomic.\n- Each record must be unique.\n\n### 2NF\n- Must be in 1NF.\n- No partial dependencies on a composite key.\n\n### 3NF\n- Must be in 2NF.\n- No transitive functional dependencies.',
    created_by_id: 0,
    creator_name: 'You (offline)',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '__mock_2',
    title: 'DSA — DP vs Greedy Algorithms',
    category: 'Data Structures',
    is_public: true,
    content:
      '# Dynamic Programming vs Greedy\n\n**Greedy:** Locally optimal choice at each stage.\n**DP:** Breaks problem into subproblems, caches results.\n\nUse DP when overlapping subproblems exist.',
    created_by_id: 0,
    creator_name: 'You (offline)',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '__mock_3',
    title: 'Laplace Transform Cheat Sheet',
    category: 'Mathematics',
    is_public: false,
    content:
      '# Laplace Transforms\n\n1. L{1} = 1/s\n2. L{eᵃᵗ} = 1/(s−a)\n3. L{tⁿ} = n!/sⁿ⁺¹\n4. L{sin(at)} = a/(s²+a²)\n5. L{cos(at)} = s/(s²+a²)',
    created_by_id: 0,
    creator_name: 'You (offline)',
    created_at: new Date(Date.now() - 518400000).toISOString(),
    updated_at: new Date(Date.now() - 518400000).toISOString(),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification system
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts || !toasts.length) return null
  const cfg = {
    success: { icon: CheckCircle, cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    error:   { icon: AlertTriangle, cls: 'bg-red-500/10 border-red-500/30 text-red-300' },
    info:    { icon: Info, cls: 'bg-brand-500/10 border-brand-500/30 text-brand-300' },
  }
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 w-80">
      {(toasts || []).map(t => {
        if (!t) return null
        const { icon: Icon, cls } = cfg[t.type] || cfg.info
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg animate-fade-in ${cls}`}
          >
            <Icon size={16} className="flex-shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed flex-1">{t.message || ''}</span>
            <button onClick={() => onRemove && onRemove(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TABS = [
  { key: 'mine',   label: 'My Notes',     icon: Lock  },
  { key: 'public', label: 'Shared Notes', icon: Globe },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Notes() {
  const { BASE_URL, user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const noteTitleClass = user && (user.role === 'admin' || user.role === 'teacher') ? 'text-slate-900' : 'text-white'

  // ── data state ─────────────────────────────────────────────────────────────
  const [myNotes, setMyNotes]       = useState([])
  const [publicNotes, setPublicNotes] = useState([])
  const [isOffline, setIsOffline]   = useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]         = useState('mine')
  const [activeNoteId, setActiveNoteId]   = useState(null)
  const [searchQuery, setSearchQuery]     = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loadingMine, setLoadingMine]     = useState(true)
  const [loadingPublic, setLoadingPublic] = useState(false)
  const [saving, setSaving]               = useState(false)

  // ── editor state ───────────────────────────────────────────────────────────
  const [isEditing, setIsEditing]         = useState(false)
  const [editTitle, setEditTitle]         = useState('')
  const [editCategory, setEditCategory]   = useState('')
  const [editContent, setEditContent]     = useState('')
  const [editIsPublic, setEditIsPublic]   = useState(false)

  // ── derived ────────────────────────────────────────────────────────────────
  const visibleNotes = activeTab === 'mine' ? asArray(myNotes) : asArray(publicNotes)
  const activeNote   = visibleNotes.find(n => n?.id === activeNoteId) ?? null
  const isMockNote   = typeof activeNoteId === 'string' && activeNoteId.startsWith('__mock')
  const isOwnNote    = activeNote?.created_by_id === user?.id

  // ── category list derived from current tab's notes ──────────────────────
  const categories = [...new Set((visibleNotes || []).map(n => n?.category).filter(Boolean))].sort()

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch my notes
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMyNotes = useCallback(async (silent = false) => {
    if (!silent) setLoadingMine(true)
    try {
      const res = await axios.get(`${BASE_URL}/notes/`)
      const list = asArray(res?.data)
      setMyNotes(list)
      setIsOffline(false)
      if (list.length > 0 && activeTab === 'mine') {
        setActiveNoteId(prev => prev ?? list[0]?.id)
      }
    } catch (err) {
      if (!isOffline) {
        // First failure — fall back to mock data
        setMyNotes(MOCK_NOTES)
        setIsOffline(true)
        setActiveNoteId(MOCK_NOTES[0].id)
        addToast(
          'Could not reach the server. Showing offline demo notes. Your changes will not be saved.',
          'error'
        )
      }
    } finally {
      if (!silent) setLoadingMine(false)
    }
  }, [BASE_URL, isOffline, activeTab, addToast])

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch public notes
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPublicNotes = useCallback(async () => {
    setLoadingPublic(true)
    try {
      const res = await axios.get(`${BASE_URL}/notes/public`)
      setPublicNotes(asArray(res?.data))
    } catch (err) {
      addToast('Failed to load shared notes.', 'error')
    } finally {
      setLoadingPublic(false)
    }
  }, [BASE_URL, addToast])

  useEffect(() => { fetchMyNotes() }, [fetchMyNotes])

  // Load public notes only when that tab is opened for the first time
  const publicFetchedRef = useRef(false)
  useEffect(() => {
    if (activeTab === 'public' && !publicFetchedRef.current) {
      publicFetchedRef.current = true
      fetchPublicNotes()
    }
  }, [activeTab, fetchPublicNotes])

  // ─────────────────────────────────────────────────────────────────────────
  // Tab / note selection
  // ─────────────────────────────────────────────────────────────────────────
  const handleTabChange = tab => {
    setActiveTab(tab)
    setActiveNoteId(null)
    setIsEditing(false)
    setSearchQuery('')
    setCategoryFilter('')
  }

  const handleSelectNote = note => {
    setActiveNoteId(note.id)
    setIsEditing(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Editing
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartEdit = () => {
    if (!activeNote) return
    setEditTitle(activeNote.title)
    setEditCategory(activeNote.category)
    setEditContent(activeNote.content)
    setEditIsPublic(activeNote.is_public)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    if (isOffline) {
      addToast('Cannot create notes while offline.', 'error')
      return
    }
    try {
      const res = await axios.post(`${BASE_URL}/notes/`, {
        title: 'New Note',
        category: 'General',
        content: '# New Note\n\nStart typing your content here...',
        is_public: false,
      })
      const newNote = res?.data
      if (!newNote?.id) {
        addToast('Invalid response from server.', 'error')
        return
      }
      setMyNotes(prev => [newNote, ...asArray(prev)])
      setActiveTab('mine')
      setActiveNoteId(newNote.id)
      setEditTitle(newNote.title)
      setEditCategory(newNote.category)
      setEditContent(newNote.content)
      setEditIsPublic(newNote.is_public)
      setIsEditing(true)
    } catch (err) {
      addToast(err.message || 'Failed to create note.', 'error')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save (update)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!editTitle.trim()) {
      addToast('Note title cannot be empty.', 'error')
      return
    }
    if (isOffline || isMockNote) {
      // Update local state only
      setMyNotes(prev =>
        asArray(prev).map(n =>
          n?.id === activeNoteId
            ? { ...n, title: editTitle, category: editCategory, content: editContent, is_public: editIsPublic }
            : n
        )
      )
      setIsEditing(false)
      addToast('Saved locally (offline mode).', 'info')
      return
    }
    setSaving(true)
    try {
      const res = await axios.put(`${BASE_URL}/notes/${activeNoteId}`, {
        title: editTitle,
        category: editCategory || 'General',
        content: editContent,
        is_public: editIsPublic,
      })
      const updated = res?.data
      if (!updated) {
        addToast('Invalid response from server.', 'error')
        return
      }
      setMyNotes(prev => asArray(prev).map(n => (n?.id === activeNoteId ? updated : n)))
      // If the note was made public, refresh public feed
      if (editIsPublic) {
        publicFetchedRef.current = false
      }
      setIsEditing(false)
      addToast('Note saved successfully.', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to save note.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteNote = async id => {
    if (!window.confirm('Permanently delete this note?')) return
    if (isOffline || (typeof id === 'string' && id.startsWith('__mock'))) {
      const remaining = asArray(myNotes).filter(n => n?.id !== id)
      setMyNotes(remaining)
      setActiveNoteId(remaining[0]?.id ?? null)
      setIsEditing(false)
      addToast('Note removed (offline mode).', 'info')
      return
    }
    try {
      await axios.delete(`${BASE_URL}/notes/${id}`)
      const remaining = asArray(myNotes).filter(n => n?.id !== id)
      setMyNotes(remaining)
      setActiveNoteId(remaining[0]?.id ?? null)
      setIsEditing(false)
      addToast('Note deleted.', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to delete note.', 'error')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quick public toggle (no full editor open)
  // ─────────────────────────────────────────────────────────────────────────
  const handleTogglePublic = async note => {
    if (isOffline || isMockNote) {
      setMyNotes(prev => asArray(prev).map(n => (n?.id === note?.id ? { ...n, is_public: !n.is_public } : n)))
      addToast(`Note is now ${!note.is_public ? 'public' : 'private'} (offline mode).`, 'info')
      return
    }
    try {
      const res = await axios.put(`${BASE_URL}/notes/${note.id}`, { is_public: !note.is_public })
      const updated = res?.data
      if (!updated) {
        addToast('Invalid response from server.', 'error')
        return
      }
      setMyNotes(prev => asArray(prev).map(n => (n?.id === note?.id ? updated : n)))
      publicFetchedRef.current = false   // invalidate public cache
      addToast(`Note is now ${updated.is_public ? 'shared publicly' : 'private'}.`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to update visibility.', 'error')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered list
  // ─────────────────────────────────────────────────────────────────────────
  const filteredNotes = (visibleNotes || []).filter(note => {
    if (!note) return false
    const q = searchQuery.toLowerCase()
    const title = (note.title || '').toLowerCase()
    const category = (note.category || '').toLowerCase()
    const matchSearch = !q || title.includes(q) || category.includes(q)
    const matchCat = !categoryFilter || category === categoryFilter.toLowerCase()
    return matchSearch && matchCat
  })

  const isLoading = activeTab === 'mine' ? loadingMine : loadingPublic

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-5 page-enter animate-fade-in h-[calc(100vh-5rem)] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <h1 className={`text-2xl font-bold ${noteTitleClass} flex items-center gap-2.5`}>
              <FileText className="text-brand-400" size={24} />
              Academic Notes
            </h1>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">
              Capture lectures, formulae, and study plans — share them with the class.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchMyNotes(true); if (activeTab === 'public') fetchPublicNotes() }}
              className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-[var(--text-muted)] hover:text-white hover:border-white/20 transition-all active:scale-95"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={handleCreateNote}
              className="btn-primary py-2.5 px-4 text-xs font-semibold shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> New Note
            </button>
          </div>
        </div>

        {/* ── Offline banner ── */}
        {isOffline && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex-shrink-0">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>Offline mode — showing demo data. Connect to your backend to save changes.</span>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/8 rounded-xl p-1 w-fit flex-shrink-0">
          {(TABS || []).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === key
                  ? 'bg-brand-600/25 text-white border border-brand-500/30 shadow-md'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={13} />
              {label}
              {key === 'mine' && (
                <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">
                  {myNotes?.length || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Main dual-panel ── */}
        {isLoading ? (
          <Spinner className="flex-1 min-h-[200px]" label="Loading notes…" />
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Left panel: list ── */}
            <div className="lg:col-span-1 glass border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-0 bg-white/[0.01]">

              {/* Search */}
              <div className="relative mb-2.5">
                <Search className="absolute left-3 top-3 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search title or category…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121224] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-500 transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Category filter */}
              {(categories || []).length > 1 && (
                <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                  <Filter size={11} className="text-gray-500" />
                  <button
                    onClick={() => setCategoryFilter('')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all ${
                      !categoryFilter
                        ? 'bg-brand-600/20 border-brand-500/30 text-brand-300'
                        : 'bg-white/[0.02] border-white/5 text-[var(--text-muted)] hover:border-white/10'
                    }`}
                  >
                    All
                  </button>
                  {(categories || []).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(prev => prev === cat ? '' : cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all ${
                        categoryFilter === cat
                          ? 'bg-brand-600/20 border-brand-500/30 text-brand-300'
                          : 'bg-white/[0.02] border-white/5 text-[var(--text-muted)] hover:border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Notes list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                {(filteredNotes || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-2">
                    <FileText size={28} className="text-gray-600" />
                    <p className="text-[var(--text-muted)] text-xs">
                      {searchQuery || categoryFilter ? 'No matching notes.' : 'No notes yet.'}
                    </p>
                  </div>
                ) : (
                  (filteredNotes || []).map(note => {
                    if (!note) return null
                    const isActive = note.id === activeNoteId
                    return (
                      <button
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                          isActive
                            ? 'bg-brand-600/20 border-brand-500/30'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-semibold text-sm text-white truncate leading-tight">
                            {note.title || 'Untitled'}
                          </span>
                          {note.is_public ? (
                            <Globe size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" title="Public" />
                          ) : (
                            <Lock size={11} className="text-gray-500 flex-shrink-0 mt-0.5" title="Private" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded">
                            {note.category || 'General'}
                          </span>
                          {activeTab === 'public' && note.creator_name && (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              by {note.creator_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <Calendar size={9} />
                          <span>{formatDate(note.updated_at || note.created_at)}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── Right panel: viewer / editor ── */}
            <div className="lg:col-span-2 glass border border-white/10 rounded-2xl flex flex-col min-h-0 bg-white/[0.01]">
              {activeNote ? (
                <div className="flex-1 flex flex-col min-h-0">

                  {/* Header banner */}
                  <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 flex-shrink-0">
                        <BookOpen size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex gap-2 flex-wrap items-center">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              placeholder="Note title"
                              className="bg-[#121224] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-brand-500 min-w-[180px]"
                            />
                            <input
                              type="text"
                              value={editCategory}
                              onChange={e => setEditCategory(e.target.value)}
                              placeholder="Category"
                              className="bg-[#121224] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand-500 w-28"
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-white font-semibold text-base truncate">{activeNote?.title || 'Untitled'}</h3>
                            <p className="text-[var(--text-muted)] text-xs">
                              {activeNote?.category || 'General'}
                              {activeTab === 'public' && activeNote?.creator_name
                                ? ` • by ${activeNote.creator_name}`
                                : ''}
                              {' '}• {formatDate(activeNote?.updated_at)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">

                      {/* Visibility toggle — only for own notes */}
                      {(activeTab === 'mine' || isOwnNote) && !isEditing && (
                        <button
                          onClick={() => handleTogglePublic(activeNote)}
                          title={activeNote.is_public ? 'Make private' : 'Share publicly'}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all active:scale-95 ${
                            activeNote.is_public
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                              : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {activeNote.is_public ? <Globe size={12} /> : <Lock size={12} />}
                          {activeNote.is_public ? 'Public' : 'Private'}
                        </button>
                      )}

                      {/* Visibility toggle inside editor */}
                      {isEditing && (
                        <button
                          onClick={() => setEditIsPublic(p => !p)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                            editIsPublic
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
                          }`}
                        >
                          {editIsPublic ? <Globe size={12} /> : <Lock size={12} />}
                          {editIsPublic ? 'Public' : 'Private'}
                        </button>
                      )}

                      {/* Edit / Save / Cancel — only for own notes */}
                      {(activeTab === 'mine' || isOwnNote) && (
                        isEditing ? (
                          <>
                            <button
                              onClick={handleSaveNote}
                              disabled={saving}
                              className="btn-primary py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow disabled:opacity-60"
                            >
                              {saving ? (
                                <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Save size={12} />
                              )}
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-all active:scale-95"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleStartEdit}
                            className="btn-ghost py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 border border-white/5 bg-white/5 hover:border-white/15"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        )
                      )}

                      {/* Delete — only for own notes */}
                      {(activeTab === 'mine' || isOwnNote) && !isEditing && (
                        <button
                          onClick={() => handleDeleteNote(activeNote.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full h-full bg-transparent text-gray-200 text-sm focus:outline-none resize-none font-mono leading-relaxed"
                        placeholder="Type markdown or plain text…"
                        autoFocus
                      />
                    ) : (
                      <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs border-b border-white/5 pb-2 mb-4">
                          <Sparkles size={11} className="text-brand-400 animate-pulse" />
                          <span>
                            {activeTab === 'public'
                              ? `Shared by ${activeNote.creator_name || 'a user'}`
                              : 'Notebook View'}
                          </span>
                        </div>
                        {activeNote?.content ?? ''}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <FileText size={22} />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {activeTab === 'mine' ? 'No note selected' : 'No shared note selected'}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">
                      {activeTab === 'mine'
                        ? 'Pick a note from the list or create a new one.'
                        : 'Browse shared notes from the list on the left.'}
                    </p>
                  </div>
                  {activeTab === 'mine' && (
                    <button onClick={handleCreateNote} className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 mt-1">
                      <Plus size={13} /> New Note
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  )
}
