import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { asArray } from '../lib/safeData'
import { Plus, Pencil, Trash2, X, Check, Megaphone, AlertTriangle, RefreshCw } from 'lucide-react'

const EMPTY_FORM = { title: '', body: '', target_dept_id: '' }

export default function Announcements() {
  const { BASE_URL, user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const [aRes, dRes] = await Promise.all([
        axios.get(`${BASE_URL}/announcements/`),
        axios.get(`${BASE_URL}/users/departments/all`),
      ])
      setAnnouncements(asArray(aRes?.data))
      setDepts(asArray(dRes?.data))
    } catch (err) {
      setFetchError(err.message || 'Failed to load announcements.')
    } finally { setLoading(false) }
  }, [BASE_URL])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(''); setShowModal(true) }
  const openEdit   = (a) => {
    if (!a) return
    setEditTarget(a)
    setForm({ title: a?.title ?? '', body: a?.body ?? '', target_dept_id: a?.target_dept_id || '' })
    setError(''); setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const payload = { title: form.title, body: form.body, target_dept_id: form.target_dept_id || null }
      if (editTarget) {
        await axios.put(`${BASE_URL}/announcements/${editTarget.id}`, payload)
      } else {
        await axios.post(`${BASE_URL}/announcements/`, payload)
      }
      setShowModal(false); fetchData()
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await axios.delete(`${BASE_URL}/announcements/${id}`)
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete announcement.')
    }
  }

  return (
    <>
      <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Announcements</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Post global or department-specific notices</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Post Announcement</button>
        )}
      </div>

      {fetchError ? (
        <div className="glass border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto my-8 animate-slide-up">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1.5">Failed to Load Announcements</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">{fetchError}</p>
          <button onClick={fetchData} className="btn-primary py-2 px-5 text-sm mx-auto shadow-md">
            <RefreshCw size={14} className="animate-spin-hover" /> Retry Loading
          </button>
        </div>
      ) : loading ? (
        <Spinner className="min-h-[40vh]" label="Loading announcements…" />
      ) : asArray(announcements).length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4">
          <div className="w-20 h-20 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
            <Megaphone size={32} className="text-brand-400" />
          </div>
          <p className="text-[var(--text-muted)]">No announcements yet. Post the first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {asArray(announcements).map(ann => {
            if (!ann?.id) return null
            return (
            <div key={ann.id} className="glass border border-white/10 rounded-2xl p-6 hover:border-brand-500/25 transition-all duration-200 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/25 flex items-center justify-center text-brand-400 flex-shrink-0">
                    <Megaphone size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-semibold text-base">{ann.title}</h3>
                      {ann.target_dept_id ? (
                        <span className="badge badge-blue">{asArray(depts).find(d => d?.id === ann.target_dept_id)?.code || `Dept #${ann.target_dept_id}`}</span>
                      ) : (
                        <span className="badge badge-green">Global</span>
                      )}
                    </div>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed line-clamp-2">{ann.body}</p>
                    <p className="text-[var(--text-muted)] text-xs mt-2">
                      {ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(ann)} className="w-8 h-8 rounded-lg bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 flex items-center justify-center text-brand-400 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(ann.id)} className="w-8 h-8 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 flex items-center justify-center text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editTarget ? 'Edit Announcement' : 'Post Announcement'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Title *</label>
                <input className="input" placeholder="Mid-sem examination schedule" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Message Body *</label>
                <textarea rows={5} className="input resize-none" placeholder="Detailed announcement content…" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Target Department</label>
                <select className="input" value={form.target_dept_id} onChange={e => setForm(p => ({ ...p, target_dept_id: e.target.value }))}>
                  <option value="">All Departments (Global)</option>
                  {asArray(depts).map(d => <option key={d?.id} value={d?.id}>{d?.name ?? '—'}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check size={16} />{editTarget ? 'Update' : 'Post'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
