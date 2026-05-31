import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

export default function AttendanceHistory() {
  const { BASE_URL } = useAuth()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/attendance/summary`)
        setHistory(res.data.slice(0, 10))
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Attendance History</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        history.length === 0 ? <Text style={styles.empty}>No submissions yet.</Text> : (
          history.map((h, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.name}>{h.name}</Text>
              <Text style={[styles.pct, { color: h.percentage >= 75 ? '#22c55e' : '#ef4444' }]}>{h.percentage}%</Text>
            </View>
          ))
        )
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, paddingTop: 40 },
  title: { color: '#f0f4ff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#8b92b8' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  name: { color: '#c8cdf8' },
  pct: { fontWeight: '700' },
})
