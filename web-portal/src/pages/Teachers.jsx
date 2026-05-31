import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import TableSkeleton from '../components/TableSkeleton'
import { asArray } from '../lib/safeData'
import { Plus, Pencil, Trash2, X, Check, AlertTriangle, RefreshCw } from 'lucide-react'

const EMPTY_FORM = { name: '', email: '', password: '', dept_id: '' }

export default function Teachers() {
  const { BASE_URL } = useAuth()
  const [teachers, setTeachers] = useState([])
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
      const [dRes, tRes] = await Promise.all([
        axios.get(`${BASE_URL}/users/departments/all`),
        axios.get(`${BASE_URL}/users/teachers`),
      ])
      setDepts(asArray(dRes?.data))
      setTeachers(asArray(tRes?.data))
    } catch (err) {
      setFetchError(err.message || 'Failed to load teachers data.')
    } finally { setLoading(false) }
  }, [BASE_URL])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(''); setShowModal(true) }
  const openEdit   = (t) => {
    if (!t) return
    setEditTarget(t)
    setForm({ name: t?.name ?? '', email: t?.email ?? '', password: '', dept_id: t?.dept_id || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (editTarget) {
        await axios.patch(`${BASE_URL}/users/${editTarget.id}`, { name: form.name, dept_id: form.dept_id || null })
      } else {
        const res = await axios.post(`${BASE_URL}/auth/register`, {
          name: form.name, email: form.email, password: form.password,
          role: 'teacher', dept_id: form.dept_id || null,
        })
        setTeachers(prev => [...asArray(prev), { id: res?.data?.user_id, name: res?.data?.name ?? form.name, email: form.email, role: 'teacher', dept_id: form.dept_id || null, is_active: true }])
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher? This action cannot be undone.')) return
    try {
      await axios.delete(`${BASE_URL}/users/${id}`)
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete teacher.')
    }
  }

  return (
    <>
      <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Teachers</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage faculty accounts and department assignments</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Teacher</button>
      </div>

      {fetchError ? (
        <div className="glass border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto my-8 animate-slide-up">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1.5">Failed to Load Teachers</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">{fetchError}</p>
          <button onClick={fetchData} className="btn-primary py-2 px-5 text-sm mx-auto shadow-md">
            <RefreshCw size={14} className="animate-spin-hover" /> Retry Loading
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Faculty</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={4} cols={4} />
              ) : asArray(teachers).length === 0 ? (
                <tr><td colSpan={4} className="text-center text-[var(--text-muted)] py-14">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--text-muted)] text-3xl">👩‍🏫</div>
                    <p>No teachers yet. Click "Add Teacher" to create the first one.</p>
                  </div>
                </td></tr>
              ) : (
                asArray(teachers).map(t => {
                  if (!t?.id) return null
                  return (
                  <tr key={t.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/25 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">{(t?.name || '?').charAt(0)}</div>
                        <div>
                          <p className="text-white font-medium text-sm">{t.name}</p>
                          <p className="text-[var(--text-muted)] text-xs">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-[var(--text-muted)] text-sm">{asArray(depts).find(d => d?.id === t?.dept_id)?.name || '—'}</span></td>
                    <td><span className={`badge ${t?.is_active ? 'badge-green' : 'badge-red'}`}>{t?.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 flex items-center justify-center text-brand-400 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(t.id)} className="w-8 h-8 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 flex items-center justify-center text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editTarget ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Full Name *</label>
                <input className="input" placeholder="Dr. Jane Smith" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              {!editTarget && (
                <>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Email *</label>
                    <input type="email" className="input" placeholder="teacher@college.edu" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Password *</label>
                    <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Department</label>
                <select className="input" value={form.dept_id} onChange={e => setForm(p => ({ ...p, dept_id: e.target.value }))}>
                  <option value="">Select Department</option>
                  {asArray(depts).map(d => <option key={d?.id} value={d?.id}>{d?.name ?? '—'}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check size={16} />{editTarget ? 'Update' : 'Create'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
