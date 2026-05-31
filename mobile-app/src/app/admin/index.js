import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform, StatusBar, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { Ionicons } from '@expo/vector-icons'

export default function AdminDashboard() {
  const { user, logout, BASE_URL } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [annRes, deptRes] = await Promise.all([
          axios.get(`${BASE_URL}/announcements/`),
          axios.get(`${BASE_URL}/users/departments/all`),
        ])
        setAnnouncements(annRes.data.slice(0, 5))
        setDepts(deptRes.data)
      } catch {}
      setLoading(false)
    })()
  }, [BASE_URL])

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Administrator Portal 🛡️</Text>
          <Text style={styles.name}>{user?.name || "System Admin"}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Overview Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Stats Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>CSE</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>ECE</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>MECH</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </View>

      {/* Departments list */}
      <Text style={styles.sectionTitle}>Enrolled Departments</Text>
      {loading ? (
        <ActivityIndicator color="#6270f1" />
      ) : depts.length === 0 ? (
        <Text style={styles.noData}>No departments found.</Text>
      ) : (
        <View style={styles.deptCard}>
          {depts.map((d, index) => (
            <View key={d.id} style={[styles.deptItem, index === depts.length - 1 && { borderBottomWidth: 0 }]}>
              <Ionicons name="business" size={18} color="#6270f1" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deptName}>{d.name}</Text>
                <Text style={styles.deptCode}>{d.code}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Active</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Announcements */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent System Announcements</Text>
      {loading ? (
        <ActivityIndicator color="#6270f1" />
      ) : announcements.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="megaphone-outline" size={24} color="#8b92b8" />
          <Text style={styles.emptyText}>No announcements posted yet.</Text>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content:   { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting:   { color: '#8b92b8', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  name:       { color: '#f0f4ff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  logoutBtn:  { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' },

  card:       { backgroundColor: '#1e1e38', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, marginBottom: 24 },
  cardTitle:  { color: '#f0f4ff', fontSize: 15, fontWeight: '700', marginBottom: 20, letterSpacing: 0.2 },
  statsRow:   { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statBox:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 14, alignItems: 'center' },
  statValue:  { color: '#6270f1', fontSize: 18, fontWeight: '800' },
  statLabel:  { color: '#8b92b8', fontSize: 11, marginTop: 4, fontWeight: '500' },

  sectionTitle: { color: '#f0f4ff', fontSize: 16, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3 },
  noData:       { color: '#8b92b8', fontSize: 13, textAlign: 'center', marginVertical: 10 },

  deptCard:   { backgroundColor: '#1e1e38', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 8, paddingHorizontal: 16 },
  deptItem:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  deptName:   { color: '#f0f4ff', fontSize: 14, fontWeight: '600' },
  deptCode:   { color: '#8b92b8', fontSize: 11, marginTop: 2 },
  badge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  badgeText:  { color: '#22c55e', fontSize: 10, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText:{ color: '#8b92b8', fontSize: 13 },

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
})
