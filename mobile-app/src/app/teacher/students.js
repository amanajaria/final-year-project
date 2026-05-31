import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

export default function TeacherStudents() {
  const { BASE_URL } = useAuth()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/users/students`, { params: { dept_id: 1, semester: 4 } })
        setStudents(res.data.students || [])
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Student List</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        students.length === 0 ? <Text style={styles.empty}>No students found.</Text> : (
          students.map(s => (
            <View key={s.id} style={styles.row}>
              <View>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.roll}>{s.roll_no}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Active</Text>
              </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  name: { color: '#f0f4ff', fontWeight: '600' },
  roll: { color: '#8b92b8', fontSize: 12, marginTop: 2 },
  badge: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#22c55e', fontSize: 11, fontWeight: '600' },
})
