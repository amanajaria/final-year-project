/**
 * teacher/index.js — Core Tinder-Style Swipe Attendance View
 *
 * Features:
 *  • Dropdown filters: Department, Semester, Subject
 *  • Fetches student roster from backend
 *  • react-native-deck-swiper card stack
 *  • Swipe Right → PRESENT (green flash overlay)
 *  • Swipe Left  → ABSENT  (red flash overlay)
 *  • Undo last swipe button
 *  • Progress bar showing how many students are done
 *  • After all cards swiped → navigate to ReviewGrid
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native'
import Swiper from 'react-native-deck-swiper'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import AttendanceCard from '../../components/AttendanceCard'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'

const { width: SW } = Dimensions.get('window')

// ── Demo departments and subjects ──────────────────────────────────────────
const DEPARTMENTS = [
  { id: 1, name: 'Computer Science',    code: 'CSE'  },
  { id: 2, name: 'Electronics & Comm.', code: 'ECE'  },
  { id: 3, name: 'Mechanical',          code: 'MECH' },
]
const SEMESTERS  = [1, 2, 3, 4, 5, 6, 7, 8]
const SUBJECTS   = ['Data Structures', 'DBMS', 'Operating Systems', 'Networks', 'Algorithms']

// ── Main Component ─────────────────────────────────────────────────────────
export default function TeacherSwipeView() {
  const { user, BASE_URL, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  // Filter state
  const [deptId,    setDeptId]    = useState('')
  const [semester,  setSemester]  = useState('')
  const [subject,   setSubject]   = useState('')
  const [scheduleId, setScheduleId] = useState(1) // default schedule id

  // Student data
  const [students,  setStudents]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [started,   setStarted]   = useState(false)

  // Swipe state
  const [cardIndex, setCardIndex] = useState(0)
  const [records,   setRecords]   = useState([])   // [{ student_id, student, status }]
  const [undoStack, setUndoStack] = useState([])
  const [swipeDir,  setSwipeDir]  = useState(null)  // 'left' | 'right'
  const [finished,  setFinished]  = useState(false)

  const swiperRef = useRef(null)

  // ── Fetch students ─────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!deptId || !semester) return
    setLoading(true)
    setStarted(false)
    setRecords([])
    setUndoStack([])
    setCardIndex(0)
    setFinished(false)
    try {
      const res = await axios.get(`${BASE_URL}/users/students`, {
        params: { dept_id: deptId, semester },
      })
      setStudents(res.data.students)
    } catch {
      Alert.alert('Error', 'Could not fetch student list. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [BASE_URL, deptId, semester])

  useEffect(() => { if (deptId && semester) fetchStudents() }, [deptId, semester, fetchStudents])

  // ── Swipe handlers ──────────────────────────────────────────────────────
  const onSwiped = (index, status) => {
    if (index < 0 || index >= students.length) {
      console.warn(`Swiped index ${index} out of bounds (0-${students.length - 1})`)
      return
    }
    const student = students[index]
    if (!student || !student.id) {
      console.error(`Invalid student at index ${index}:`, student)
      return
    }
    const entry   = { student_id: student.id, student, status }
    setRecords(prev => [...prev, entry])
    setUndoStack(prev => [...prev, { index, entry }])
    setSwipeDir(null)
    setCardIndex(index + 1)
  }

  const onSwipedRight = (index) => {
    console.log('Swiped right:', index)
    onSwiped(index, 'PRESENT')
  }
  const onSwipedLeft = (index) => {
    console.log('Swiped left:', index)
    onSwiped(index, 'ABSENT')
  }

  const onAllSwiped = () => {
    console.log('All students swiped. Total records:', records.length)
    setFinished(true)
  }

  const handleUndo = () => {
    if (undoStack.length === 0 || !swiperRef.current) return
    try {
      const last = undoStack[undoStack.length - 1]
      swiperRef.current.swipeBack()
      setRecords(prev => prev.filter((_, i) => i !== prev.length - 1))
      setUndoStack(prev => prev.slice(0, -1))
      setCardIndex(prev => Math.max(0, prev - 1))
      setFinished(false)
    } catch (e) {
      console.error('Undo failed:', e)
    }
  }

  const handleSwipe = (direction) => {
    if (!swiperRef.current) {
      console.warn('Swiper ref not available')
      return
    }
    try {
      if (direction === 'left') {
        swiperRef.current.swipeLeft()
      } else if (direction === 'right') {
        swiperRef.current.swipeRight()
      }
    } catch (e) {
      console.error('Swipe failed:', e)
    }
  }

  const handleSubmit = () => {
    if (records.length === 0) {
      Alert.alert('No Records', 'No attendance has been marked.')
      return
    }
    console.log('Manual submit triggered. Records:', records.length)
    setFinished(true)
  }

  // ── Navigate to review ──────────────────────────────────────────────────
  useEffect(() => {
    if (finished) {
      router.push({ pathname: '/teacher/review', params: {
        recordsJson:  JSON.stringify(records),
        scheduleId:   String(scheduleId),
        date:         new Date().toISOString().split('T')[0],
      }})
    }
  }, [finished])

  // ── Filter Selector ─────────────────────────────────────────────────────
  if (!started) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>Select class details to begin</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.undoBtn}>
            <Ionicons name="log-out-outline" size={20} color="#8b92b8" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.filterSheet}>
          {/* Department */}
          <Text style={styles.filterLabel}>DEPARTMENT</Text>
          <View style={styles.chipRow}>
            {DEPARTMENTS.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.chip, deptId === String(d.id) && styles.chipActive]}
                onPress={() => setDeptId(String(d.id))}
              >
                <Text style={[styles.chipText, deptId === String(d.id) && styles.chipTextActive]}>{d.code}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Semester */}
          <Text style={styles.filterLabel}>SEMESTER</Text>
          <View style={styles.chipRow}>
            {SEMESTERS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, semester === String(s) && styles.chipActive]}
                onPress={() => setSemester(String(s))}
              >
                <Text style={[styles.chipText, semester === String(s) && styles.chipTextActive]}>Sem {s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subject */}
          <Text style={styles.filterLabel}>SUBJECT</Text>
          <View style={styles.chipRow}>
            {SUBJECTS.map((s, idx) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, subject === s && styles.chipActive]}
                onPress={() => { setSubject(s); setScheduleId(idx + 1) }}
              >
                <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <ActivityIndicator color="#6270f1" />
              <Text style={{ color: '#8b92b8', marginTop: 8 }}>Fetching students…</Text>
            </View>
          )}

          {students.length > 0 && !loading && (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setStarted(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle" size={22} color="#fff" />
              <Text style={styles.startBtnText}>Start — {students.length} Students</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    )
  }

  // ── Swipe Deck View ─────────────────────────────────────────────────────
  const progress = cardIndex / students.length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {DEPARTMENTS.find(d => String(d.id) === deptId)?.code} — Sem {semester}
          </Text>
          <Text style={styles.headerSub}>{subject || 'Attendance'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn} disabled={undoStack.length === 0}>
            <Ionicons name="arrow-undo" size={20} color={undoStack.length === 0 ? '#3d3d5c' : '#6270f1'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.undoBtn}>
            <Ionicons name="log-out-outline" size={20} color="#8b92b8" />
          </TouchableOpacity>
        </View>
      </View>


      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {cardIndex} / {students.length} marked
      </Text>

      {/* Deck Swiper - flex: 1 to fill available space */}
      <View style={styles.deckContainer}>
        {students.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#6270f1" size="large" />
            <Text style={{ color: '#8b92b8', marginTop: 12 }}>No students loaded. Check filters.</Text>
          </View>
        ) : (
          <Swiper
            ref={swiperRef}
            cards={students}
            cardIndex={Math.min(cardIndex, students.length - 1)}
            renderCard={(card) => {
              if (!card) return <View style={{ backgroundColor: '#1e1e38', borderRadius: 28 }} />
              return <AttendanceCard card={card} swipeDirection={swipeDir} />
            }}
            onSwipedRight={onSwipedRight}
            onSwipedLeft={onSwipedLeft}
            onAllSwiped={onAllSwiped}
            onSwipedAborted={() => setSwipeDir(null)}
            onTapCard={() => {}}
            backgroundColor="transparent"
            stackSize={3}
            stackSeparation={10}
            stackScale={6}
            cardHorizontalMargin={24}
            animateCardOpacity
            swipeBackCard
            infinite={false}
            overlayLabels={{
              left: {
                title: 'ABSENT',
                style: {
                  label: { color: '#ef4444', fontSize: 22, fontWeight: '800', borderColor: '#ef4444', borderWidth: 2, borderRadius: 8, padding: 8 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 20, marginLeft: -20 },
                },
              },
              right: {
                title: 'PRESENT',
                style: {
                  label: { color: '#22c55e', fontSize: 22, fontWeight: '800', borderColor: '#22c55e', borderWidth: 2, borderRadius: 8, padding: 8 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 20, marginLeft: 20 },
                },
              },
            }}
          />
        )}
      </View>

      {/* Bottom action buttons - fixed at bottom */}
      <View style={styles.actionRow}>
        {!finished ? (
          <>
            <TouchableOpacity style={styles.actionBtnAbsent} onPress={() => handleSwipe('left')} activeOpacity={0.8}>
              <Ionicons name="close" size={32} color="#ef4444" />
              <Text style={styles.actionBtnLabel}>Absent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnPresent} onPress={() => handleSwipe('right')} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={32} color="#22c55e" />
              <Text style={styles.actionBtnLabel}>Present</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Attendance</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 12,
  },
  headerTitle: { color: '#f0f4ff', fontSize: 20, fontWeight: '700' },
  headerSub:   { color: '#8b92b8', fontSize: 13, marginTop: 2 },
  undoBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  progressBar:  { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 24, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#6270f1', borderRadius: 2 },
  progressText: { color: '#8b92b8', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 },

  deckContainer: { flex: 1, paddingHorizontal: 0, paddingVertical: 8 },

  actionRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionBtnAbsent: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 2, borderColor: 'rgba(239,68,68,0.35)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  actionBtnPresent: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 2, borderColor: 'rgba(34,197,94,0.35)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  actionBtnLabel: { color: '#8b92b8', fontSize: 11, fontWeight: '700' },
  submitBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#6270f1', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#6270f1', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Filter sheet styles
  filterSheet:  { padding: 24, paddingBottom: 60 },
  filterLabel:  { color: '#8b92b8', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginTop: 20 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive:    { backgroundColor: 'rgba(98,112,241,0.2)', borderColor: 'rgba(98,112,241,0.5)' },
  chipText:      { color: '#8b92b8', fontSize: 13, fontWeight: '500' },
  chipTextActive:{ color: '#6270f1', fontWeight: '700' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#6270f1', borderRadius: 16, paddingVertical: 16, marginTop: 32,
    shadowColor: '#6270f1', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
