/**
 * student/index.js — Student Dashboard
 *
 * Displays:
 *  • Profile header with name/dept/semester
 *  • Animated ring progress chart (attendance %)
 *  • Subject-wise attendance breakdown
 *  • Announcements feed from backend
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, Platform, StatusBar, ActivityIndicator, Image,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import SimpleLineChart from '../../components/SimpleLineChart'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { Ionicons } from '@expo/vector-icons'

// Animated ring chart
function RingChart({ percentage, size = 160, strokeWidth = 12, color = '#6270f1' }) {
  const radius    = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const animVal   = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animVal, { toValue: percentage, duration: 1200, useNativeDriver: false }).start()
  }, [percentage])

  // strokeDashoffset drives the ring fill directly via raw calculation below

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          stroke="rgba(255,255,255,0.07)"
          fill="transparent"
        />
      </Svg>

      {/* Animated foreground — use a regular Circle updated via JS */}
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          stroke={percentage >= 75 ? '#22c55e' : percentage >= 60 ? '#f59e0b' : '#ef4444'}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percentage / 100)}
          strokeLinecap="round"
        />
      </Svg>

      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: '#f0f4ff', fontSize: 30, fontWeight: '800' }}>{percentage}%</Text>
        <Text style={{ color: '#8b92b8', fontSize: 11 }}>Attendance</Text>
      </View>
    </View>
  )
}

export default function StudentDashboard() {
  const { user, logout, BASE_URL } = useAuth()
  const router = useRouter()
  const [attendance, setAttendance] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const overallPct = attendance.length > 0
    ? Math.round(attendance.reduce((acc, a) => acc + a.percentage, 0) / attendance.length)
    : 0

  useEffect(() => {
    ;(async () => {
      try {
        const [attRes, annRes] = await Promise.all([
          axios.get(`${BASE_URL}/attendance/my`),
          axios.get(`${BASE_URL}/announcements/`),
        ])
        // Group by schedule to get per-subject stats
        const logs = attRes.data
        const grouped = {}
        logs.forEach(log => {
          const k = log.schedule_id
          if (!grouped[k]) grouped[k] = { schedule_id: k, total: 0, present: 0 }
          grouped[k].total++
          if (log.status === 'PRESENT') grouped[k].present++
        })
        const summary = Object.values(grouped).map(g => ({
          ...g,
          percentage: g.total > 0 ? Math.round((g.present / g.total) * 100) : 0,
        }))
        setAttendance(summary)
        setAnnouncements(annRes.data.slice(0, 6))
      } catch {}
      setLoading(false)
    })()
  }, [BASE_URL])

  const handleLogout = async () => { await logout(); router.replace('/(auth)/login') }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'} 👋</Text>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.sub}>{user?.dept_id ? `Enrol: ${user?.roll_no || 'N/A'}` : ''}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Image source={{ uri: user?.profile_pic || 'https://via.placeholder.com/80' }} style={styles.avatar} />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtnSmall}>
            <Ionicons name="log-out-outline" size={18} color="#8b92b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Attendance Ring */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Attendance</Text>
        <View style={styles.ringRow}>
          {loading ? <ActivityIndicator color="#6270f1" size="large" /> : (
            <RingChart percentage={overallPct} />
          )}
          <View style={styles.ringInfo}>
            <View style={styles.ringInfoItem}>
              <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.ringInfoText}>
                {overallPct >= 75 ? '✓ On track' : overallPct >= 60 ? '⚠ Borderline' : '✕ Deficient'}
              </Text>
            </View>
            <Text style={styles.ringInfoSub}>
              {overallPct >= 75
                ? 'Keep it up! You are meeting the 75% threshold.'
                : overallPct >= 60
                ? 'You need to improve attendance soon.'
                : 'Critical! Risk of being barred from exams.'}
            </Text>
          </View>
        </View>

        {/* Small charts: attendance trend + results */}
        <View style={styles.chartsRow}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Attendance Trend</Text>
            <SimpleLineChart data={attendance.slice(0,6).map(a => a.percentage || 0)} width={200} height={72} />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Result Trend</Text>
            <SimpleLineChart data={attendance.slice(0,6).map(a => Math.min(100, (a.percentage || 0) + 5))} width={200} height={72} stroke="#22c55e" fill="rgba(34,197,94,0.06)" />
          </View>
        </View>

        {/* Timeframe selector */}
        <View style={styles.timeframeRow}>
          {['This Week', 'This Month', 'Semester'].map((t, idx) => (
            <TouchableOpacity
              key={t}
              onPress={() => { /* future: filter by timeframe */ }}
              style={[styles.timeBtn, idx === 0 && styles.timeBtnActive]}
            >
              <Text style={[styles.timeBtnText, idx === 0 && styles.timeBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Per-subject rows */}
        {attendance.slice(0, 4).map((a, i) => (
          <View key={i} style={styles.subjectRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subjectName}>Subject {a.schedule_id}</Text>
              <View style={styles.subjectBar}>
                <View style={[styles.subjectFill, { width: `${a.percentage}%`, backgroundColor: a.percentage >= 75 ? '#22c55e' : '#ef4444' }]} />
              </View>
            </View>
            <Text style={[styles.subjectPct, { color: a.percentage >= 75 ? '#22c55e' : '#ef4444' }]}>
              {a.percentage}%
            </Text>
          </View>
        ))}
      </View>

      {/* Announcements */}
      <Text style={styles.sectionTitle}>Announcements</Text>
      {loading ? (
        <ActivityIndicator color="#6270f1" style={{ marginTop: 20 }} />
      ) : announcements.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="megaphone-outline" size={28} color="#8b92b8" />
          <Text style={styles.emptyText}>No announcements</Text>
        </View>
      ) : (
        announcements.map(ann => (
          <View key={ann.id} style={styles.annCard}>
            <View style={styles.annDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.annTitle}>{ann.title}</Text>
              <Text style={styles.annBody} numberOfLines={2}>{ann.body}</Text>
              <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        ))
      )}

      {/* Quick action tiles */}
      <View style={styles.tilesRow}>
        {[
          { key: 'attendance', label: 'Attendance Sheet', icon: 'calendar-outline' },
          { key: 'groups', label: 'Groups', icon: 'people-outline' },
          { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
          { key: 'downloads', label: 'Downloads', icon: 'download-outline' },
          { key: 'chat', label: 'Chat Teacher', icon: 'chatbubble-ellipses-outline' },
          { key: 'results', label: 'Semester Results', icon: 'bar-chart-outline' },
        ].map(tile => (
          <TouchableOpacity key={tile.key} style={styles.tile} onPress={() => router.push(`/${tile.key}`)}>
            <Ionicons name={tile.icon} size={22} color="#cbd5ff" />
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contact admin footer */}
      <View style={styles.contactFooter}>
        <Text style={styles.contactText}>Need help? </Text>
        <TouchableOpacity onPress={() => router.push('/contact-admin')}>
          <Text style={styles.contactLink}>Contact Admin</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content:   { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting:   { color: '#8b92b8', fontSize: 13 },
  name:       { color: '#f0f4ff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  sub:        { color: '#8b92b8', fontSize: 12, marginTop: 4 },
  avatar:     { width: 56, height: 56, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  logoutBtnSmall: { marginTop: 6, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  logoutBtn:  { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  card:       { backgroundColor: '#1e1e38', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, marginBottom: 24 },
  cardTitle:  { color: '#f0f4ff', fontSize: 16, fontWeight: '700', marginBottom: 20 },

  ringRow:      { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 },
  ringInfo:     { flex: 1 },
  ringInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  ringInfoText: { color: '#f0f4ff', fontWeight: '600', fontSize: 14 },
  ringInfoSub:  { color: '#8b92b8', fontSize: 12, lineHeight: 18 },

  subjectRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  subjectName: { color: '#8b92b8', fontSize: 12, marginBottom: 5 },
  subjectBar:  { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  subjectFill: { height: '100%', borderRadius: 3 },
  subjectPct:  { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },

  timeframeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  timeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  timeBtnActive: { backgroundColor: 'rgba(98,112,241,0.14)' },
  timeBtnText: { color: '#c8cdf8', fontSize: 13 },
  timeBtnTextActive: { color: '#6270f1', fontWeight: '700' },

  sectionTitle: { color: '#f0f4ff', fontSize: 18, fontWeight: '700', marginBottom: 14 },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText:{ color: '#8b92b8', fontSize: 14 },

  annCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: '#1e1e38', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 14, marginBottom: 10,
  },
  annDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6270f1', marginTop: 5 },
  annTitle:{ color: '#f0f4ff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  annBody: { color: '#8b92b8', fontSize: 13, lineHeight: 18 },
  annDate: { color: '#6270f1', fontSize: 11, marginTop: 6 },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18, marginBottom: 18 },
  tile: { width: '48%', backgroundColor: '#16162a', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileLabel: { color: '#cbd5ff', fontSize: 13, marginTop: 8, textAlign: 'center' },
  contactFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  contactText: { color: '#8b92b8' },
  contactLink: { color: '#6270f1', fontWeight: '700' },
  chartsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  chartCard: { backgroundColor: '#151526', padding: 10, borderRadius: 12, width: '48%', alignItems: 'center' },
  chartTitle: { color: '#c8cdf8', fontSize: 12, marginBottom: 8 }
})
