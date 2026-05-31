import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'

export default function TeacherHome() {
  const { user, logout, BASE_URL } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ classesToday: 0, pendingAttendance: 0, recentSubmissions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/attendance/summary`, { params: { schedule_id: 1 } })
        setStats({
          classesToday: 3,
          pendingAttendance: Math.floor(Math.random() * 5),
          recentSubmissions: res.data?.length || 0,
        })
      } catch (e) {
        console.log('Stats fetch failed (ok for demo)')
      }
      setLoading(false)
    })()
  }, [BASE_URL])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>Professor</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#8b92b8" />
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Today\'s Classes', val: stats.classesToday, icon: 'calendar', color: '#6270f1' },
          { label: 'Pending', val: stats.pendingAttendance, icon: 'alert-circle', color: '#f59e0b' },
          { label: 'Submitted', val: stats.recentSubmissions, icon: 'checkmark-done', color: '#22c55e' },
        ].map((stat, idx) => (
          <View key={idx} style={styles.statCard}>
            <Ionicons name={stat.icon} size={24} color={stat.color} />
            <Text style={styles.statVal}>{stat.val}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Main actions */}
      <Text style={styles.sectionTitle}>Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { key: 'mark', title: 'Mark Attendance', icon: 'checkmark-circle', desc: 'Swipe to mark students present/absent', action: () => router.push('/teacher') },
          { key: 'history', title: 'Attendance History', icon: 'time', desc: 'View past submissions', action: () => router.push('/teacher/history') },
          { key: 'classes', title: 'My Classes', icon: 'book', desc: 'Manage your courses', action: () => router.push('/teacher/classes') },
          { key: 'students', title: 'Student List', icon: 'people', desc: 'View enrolled students', action: () => router.push('/teacher/students') },
        ].map(action => (
          <TouchableOpacity key={action.key} style={styles.actionCard} onPress={action.action}>
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon} size={28} color="#6270f1" />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionDesc}>{action.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent activity hint */}
      <Text style={styles.sectionTitle}>Quick Tips</Text>
      <View style={styles.tipCard}>
        <Ionicons name="bulb" size={20} color="#f59e0b" />
        <Text style={styles.tipText}>Pro tip: Use the swipe interface for faster attendance marking!</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { color: '#8b92b8', fontSize: 13 },
  name: { color: '#f0f4ff', fontSize: 24, fontWeight: '700', marginTop: 4 },
  role: { color: '#6270f1', fontSize: 12, fontWeight: '600', marginTop: 4 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1e1e38', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6 },
  statVal: { color: '#f0f4ff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#8b92b8', fontSize: 11, textAlign: 'center' },

  sectionTitle: { color: '#f0f4ff', fontSize: 18, fontWeight: '700', marginBottom: 14, marginTop: 12 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: { width: '48%', backgroundColor: '#16162a', borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
  actionIcon: { width: 50, height: 50, borderRadius: 10, backgroundColor: 'rgba(98,112,241,0.1)', alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: '#f0f4ff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  actionDesc: { color: '#8b92b8', fontSize: 11, textAlign: 'center' },

  tipCard: { backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 14, flexDirection: 'row', gap: 10 },
  tipText: { color: '#fbbf24', flex: 1, fontSize: 13 },
})
