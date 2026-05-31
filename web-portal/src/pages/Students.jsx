import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import TableSkeleton from '../components/TableSkeleton'
import { asArray } from '../lib/safeData'
import { Plus, Search, Pencil, Trash2, X, Check, AlertTriangle, RefreshCw, MoreVertical, Eye, Copy } from 'lucide-react'

const EMPTY_FORM = { name: '', email: '', password: '', dept_id: '', semester: '', section: '', roll_no: '' }

export default function Students() {
  const { BASE_URL } = useAuth()
  const [students, setStudents] = useState([])
  const [depts, setDepts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterSem, setFilterSem] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [bulkModalType, setBulkModalType] = useState(null)
  const [bulkValue, setBulkValue] = useState('')
  const [showRevealConfirm, setShowRevealConfirm] = useState(false)
  const [revealTarget, setRevealTarget] = useState(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [revealedPassword, setRevealedPassword] = useState('')
  const [revealError, setRevealError] = useState('')
  const [revealing, setRevealing] = useState(false)

  const [loadingMore, setLoadingMore] = useState(false)
  const [selectAllAll, setSelectAllAll] = useState(false)

  const fetchData = useCallback(async (skip = 0, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setFetchError('')
    try {
      const params = {
        limit: 200,
        skip: skip
      }
      if (search)     params.search = search
      if (filterDept) params.dept_id = filterDept
      if (filterSem)  params.semester  = filterSem
      
      const [deptRes, studRes] = await Promise.all([
        append ? Promise.resolve(null) : axios.get(`${BASE_URL}/users/departments/all`),
        axios.get(`${BASE_URL}/users/students`, { params })
      ])
      
      if (deptRes) {
        setDepts(asArray(deptRes?.data))
      }

      const payload = studRes?.data
      const list = asArray(payload?.students)

      if (append) {
        setStudents(prev => {
          const existingIds = new Set(asArray(prev).map(x => x?.id))
          const newRecords = list.filter(x => x?.id != null && !existingIds.has(x.id))
          return [...asArray(prev), ...newRecords]
        })
      } else {
        setStudents(list)
        setSelectedIds([])
      }
      setTotal(payload?.total ?? 0)
    } catch (err) {
      setFetchError(err.message || 'Failed to load students data.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [BASE_URL, search, filterDept, filterSem])

  useEffect(() => {
    fetchData(0, false)
  }, [fetchData])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(''); setShowModal(true) }
  const openEdit   = (s)  => {
    if (!s) return
    setEditTarget(s)
    setForm({ name: s?.name ?? '', email: s?.email ?? '', password: '', dept_id: s?.dept_id || '', semester: s?.semester || '', section: s?.section || '', roll_no: s?.roll_no || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editTarget) {
        await axios.patch(`${BASE_URL}/users/${editTarget.id}`, {
          name: form.name, dept_id: form.dept_id || null,
          semester: form.semester || null, section: form.section || null, roll_no: form.roll_no || null,
        })
      } else {
        await axios.post(`${BASE_URL}/auth/register`, {
          ...form,
          role: 'student',
          dept_id: form.dept_id || null,
          semester: form.semester ? Number(form.semester) : null,
        })
      }
      setShowModal(false)
      fetchData(0, false)
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student? This action cannot be undone.')) return
    try {
      await axios.delete(`${BASE_URL}/users/${id}`)
      fetchData(0, false)
    } catch (err) {
      alert(err.message || 'Failed to delete student.')
    }
  }

  const handleToggleSelect = (id) => {
    setSelectAllAll(false)
    setSelectedIds(prev => asArray(prev).includes(id) ? asArray(prev).filter(x => x !== id) : [...asArray(prev), id])
  }

  const handleToggleAll = () => {
    const list = asArray(students)
    const allSelected = list.length > 0 && list.every(s => s?.id != null && selectedIds.includes(s.id))
    if (allSelected) {
      setSelectedIds([])
      setSelectAllAll(false)
    } else {
      setSelectedIds(list.map(s => s.id).filter(Boolean))
      setSelectAllAll(false)
    }
  }

  const handleBulkDelete = async () => {
    const count = selectAllAll ? total : selectedIds.length
    if (!window.confirm(`Are you sure you want to delete the ${count} selected students? This action cannot be undone.`)) return
    setSaving(true)
    try {
      await axios.post(`${BASE_URL}/users/bulk`, {
        student_ids: selectAllAll ? [] : selectedIds,
        all_matching: selectAllAll,
        dept_id: filterDept ? Number(filterDept) : null,
        semester: filterSem ? Number(filterSem) : null,
        search: search || null,
        operation: 'delete'
      })
      setSelectedIds([])
      setSelectAllAll(false)
      fetchData(0, false)
      alert("Bulk delete completed successfully.")
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to remove selected students.")
    } finally {
      setSaving(false)
      setShowBulkMenu(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkValue) {
      alert("Please select or enter a value.")
      return
    }
    setSaving(true)
    try {
      let op = ''
      if (bulkModalType === 'dept') op = 'change_dept'
      else if (bulkModalType === 'sem') op = 'change_sem'
      else if (bulkModalType === 'sec') op = 'change_sec'

      await axios.post(`${BASE_URL}/users/bulk`, {
        student_ids: selectAllAll ? [] : selectedIds,
        all_matching: selectAllAll,
        dept_id: filterDept ? Number(filterDept) : null,
        semester: filterSem ? Number(filterSem) : null,
        search: search || null,
        operation: op,
        value: String(bulkValue)
      })

      setSelectedIds([])
      setSelectAllAll(false)
      setBulkModalType(null)
      setBulkValue('')
      fetchData(0, false)
      alert("Bulk update completed successfully.")
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to update selected students.")
    } finally {
      setSaving(false)
      setShowBulkMenu(false)
    }
  }

  const handleRevealPassword = async () => {
    if (!adminPassword) {
      setRevealError('Admin password is required.')
      return
    }
    setRevealing(true)
    setRevealError('')
    try {
      const res = await axios.post(`${BASE_URL}/users/${revealTarget.id}/reveal-password`, {
        admin_password: adminPassword,
      })
      setRevealedPassword(res.data.password)
      setShowRevealConfirm(false)
      setAdminPassword('')
    } catch (err) {
      setRevealError(err.response?.data?.detail || 'Incorrect admin password or failed to verify.')
    } finally {
      setRevealing(false)
    }
  }

  const filtered = asArray(students)
  const selectionCount = selectAllAll ? total : asArray(selectedIds).length
  const isPageFullySelected = filtered.length > 0 && filtered.every(s => s?.id != null && selectedIds.includes(s.id))
  const showSelectAllBanner = (isPageFullySelected && filtered.length < total) || selectAllAll

  if (loading && filtered.length === 0 && !fetchError) {
    return (
      <div className="space-y-6 page-enter">
        <div>
          <h1 className="text-3xl font-bold text-white">Students</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Loading student records…</p>
        </div>
        <Spinner className="min-h-[50vh]" label="Loading students…" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Students</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {filtered.length === total && !search && !filterDept && !filterSem ? (
              `${total} total students enrolled`
            ) : (
              `Showing ${filtered.length} of ${total} students found`
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectionCount > 0 && (
            <div className="relative">
              <button 
                onClick={() => setShowBulkMenu(!showBulkMenu)} 
                className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20"
              >
                <MoreVertical size={14} className="text-brand-400" /> {selectionCount} Selected
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#16162b] border border-white/10 p-1.5 shadow-2xl z-30 animate-slide-up space-y-0.5">
                  <button 
                    onClick={() => { setBulkModalType('dept'); setShowBulkMenu(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-white hover:bg-white/5 transition-colors"
                  >
                    Change Department
                  </button>
                  <button 
                    onClick={() => { setBulkModalType('sem'); setShowBulkMenu(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-white hover:bg-white/5 transition-colors"
                  >
                    Change Semester
                  </button>
                  <button 
                    onClick={() => { setBulkModalType('sec'); setShowBulkMenu(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-white hover:bg-white/5 transition-colors"
                  >
                    Change Section
                  </button>
                  <div className="h-px bg-white/10 my-1" />
                  <button 
                    onClick={handleBulkDelete} 
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={13} /> Remove Selected
                  </button>
                </div>
              )}
            </div>
          )}
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {fetchError ? (
        <div className="glass border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto my-8 animate-slide-up">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1.5">Failed to Load Students</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">{fetchError}</p>
          <button onClick={fetchData} className="btn-primary py-2 px-5 text-sm mx-auto shadow-md">
            <RefreshCw size={14} className="animate-spin-hover" /> Retry Loading
          </button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input id="student-search" className="input pl-9 w-60" style={{ paddingLeft: '2.5rem' }} placeholder="Search name, email, roll…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select id="filter-dept" className="input w-48" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {asArray(depts).map(d => <option key={d?.id} value={d?.id}>{d?.name ?? '—'}</option>)}
            </select>
            <select id="filter-sem" className="input w-40" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {/* Table */}
          {showSelectAllBanner && filtered.length < total && (
            <div className="bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl px-4 py-3 text-xs mb-4 flex items-center justify-between animate-slide-up">
              <span>
                {!selectAllAll ? (
                  <>
                    All <strong className="text-white font-semibold">{filtered.length}</strong> students on this page are selected.{' '}
                    <button
                      onClick={() => setSelectAllAll(true)}
                      className="underline text-brand-400 hover:text-brand-300 font-bold ml-1"
                    >
                      Select all {total} students matching this query
                    </button>
                  </>
                ) : (
                  <>
                    All <strong className="text-white font-semibold">{total}</strong> students matching this query are selected.{' '}
                    <button
                      onClick={() => { setSelectedIds([]); setSelectAllAll(false); }}
                      className="underline text-brand-400 hover:text-brand-300 font-bold ml-1"
                    >
                      Clear selection
                    </button>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <input 
                      type="checkbox" 
                      className="rounded bg-white/5 border border-white/10 text-brand-500 focus:ring-0 cursor-pointer"
                      checked={selectAllAll || (filtered.length > 0 && filtered.every(s => selectedIds.includes(s.id)))}
                      onChange={handleToggleAll}
                    />
                  </th>
                  <th>Student</th><th>Roll No</th><th>Department</th><th>Sem</th><th>Section</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-[var(--text-muted)] py-10">No students found.</td></tr>
                ) : (
                  filtered.map(s => {
                    if (!s?.id) return null
                    return (
                    <tr key={s.id}>
                      <td>
                        <input 
                          type="checkbox"
                          className="rounded bg-white/5 border border-white/10 text-brand-500 focus:ring-0 cursor-pointer"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => handleToggleSelect(s.id)}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-600/25 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                            {(s?.name || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{s?.name ?? '—'}</p>
                            <p className="text-[var(--text-muted)] text-xs">{s?.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{s.roll_no || '—'}</span></td>
                      <td><span className="text-[var(--text-muted)] text-sm">{s?.department?.code || '—'}</span></td>
                      <td><span className="text-[var(--text-muted)] text-sm">{s.semester || '—'}</span></td>
                      <td><span className="text-[var(--text-muted)] text-sm">{s.section || '—'}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setRevealTarget(s); setShowRevealConfirm(true); setRevealError(''); setRevealedPassword(''); setAdminPassword(''); }} className="w-8 h-8 rounded-lg bg-yellow-600/15 hover:bg-yellow-600/25 border border-yellow-500/20 flex items-center justify-center text-yellow-400 transition-colors" title="Reveal Password">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/20 flex items-center justify-center text-brand-400 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="w-8 h-8 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 flex items-center justify-center text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>

          {filtered.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => fetchData(filtered.length, true)}
                disabled={loadingMore}
                className="btn-ghost px-6 py-2.5 text-xs font-semibold hover:border-brand-500/30 transition-all flex items-center gap-2"
              >
                {loadingMore ? (
                  <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Load More Students'
                )}
              </button>
            </div>
          )}
        </>
      )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editTarget ? 'Edit Student' : 'Add New Student'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Full Name *</label>
                  <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Roll Number</label>
                  <input className="input" placeholder="CSE2021001" value={form.roll_no} onChange={e => setForm(p => ({ ...p, roll_no: e.target.value }))} />
                </div>
              </div>

              {!editTarget && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Email *</label>
                    <input type="email" className="input" placeholder="student@college.edu" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Password *</label>
                    <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Department</label>
                  <select className="input" value={form.dept_id} onChange={e => setForm(p => ({ ...p, dept_id: e.target.value }))}>
                    <option value="">Select Dept.</option>
                    {asArray(depts).map(d => <option key={d?.id} value={d?.id}>{d?.name ?? '—'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Semester</label>
                  <select className="input" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}>
                    <option value="">—</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Section</label>
                  <input className="input" placeholder="A" maxLength={5} value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> {editTarget ? 'Update' : 'Create'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {bulkModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setBulkModalType(null); setBulkValue(''); }} />
          <div className="relative glass border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {bulkModalType === 'dept' && 'Change Department'}
                {bulkModalType === 'sem' && 'Change Semester'}
                {bulkModalType === 'sec' && 'Change Section'}
              </h2>
              <button onClick={() => { setBulkModalType(null); setBulkValue(''); }} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] transition-colors"><X size={16} /></button>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
                  You are updating <span className="text-brand-400 font-bold">{selectionCount}</span> selected students.
            </p>

            <div className="space-y-4">
              {bulkModalType === 'dept' && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Select Department</label>
                  <select className="input mt-1.5" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                    <option value="">Choose Dept.</option>
                    {asArray(depts).map(d => <option key={d?.id} value={d?.id}>{d?.name ?? '—'}</option>)}
                  </select>
                </div>
              )}

              {bulkModalType === 'sem' && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Select Semester</label>
                  <select className="input mt-1.5" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                    <option value="">Choose Sem.</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              )}

              {bulkModalType === 'sec' && (
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Select or Enter Section</label>
                  <select className="input mt-1.5" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                    <option value="">Choose Sec.</option>
                    {['A', 'B', 'C', 'D', 'E'].map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setBulkModalType(null); setBulkValue(''); }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleBulkUpdate} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> Apply</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Admin Password Modal */}
      {showRevealConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowRevealConfirm(false); setAdminPassword(''); }} />
          <div className="relative glass border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Eye size={20} className="text-yellow-400" /> Verify Identity</h2>
              <button onClick={() => { setShowRevealConfirm(false); setAdminPassword(''); }} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
              To reveal <span className="text-white font-semibold">{revealTarget?.name}</span>'s password, please enter your Admin Password for security verification.
            </p>

            {revealError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">{revealError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Admin Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRevealPassword(); }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowRevealConfirm(false); setAdminPassword(''); }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleRevealPassword} disabled={revealing} className="btn-primary flex-1 justify-center bg-yellow-600 hover:bg-yellow-500 shadow-yellow-600/30">
                {revealing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Verify & Reveal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revealed Password Display Modal */}
      {revealedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRevealedPassword('')} />
          <div className="relative glass border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Check size={20} className="text-green-400" /> Password Revealed</h2>
              <button onClick={() => setRevealedPassword('')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
              Successfully decrypted password for <span className="text-white font-semibold">{revealTarget?.name}</span>.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="font-mono text-xl font-bold tracking-wider text-green-400 select-all">
                {revealedPassword}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(revealedPassword)
                  alert('Password copied to clipboard!')
                }}
                className="w-10 h-10 rounded-xl bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/20 flex items-center justify-center text-brand-400 transition-colors"
                title="Copy Password"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="flex mt-8">
              <button onClick={() => setRevealedPassword('')} className="btn-primary flex-1 justify-center">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
