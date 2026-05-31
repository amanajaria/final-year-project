import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'

export default function AttendanceScreen(){
  const { BASE_URL } = useAuth()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/attendance/my`)
        setLogs(res.data || [])
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Attendance Sheet</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        logs.length === 0 ? (
          <Text style={styles.empty}>No attendance records found.</Text>
        ) : (
          logs.map(l => (
            <View key={l.id} style={styles.row}>
              <Text style={styles.left}>{l.date}</Text>
              <Text style={[styles.right, { color: l.status === 'PRESENT' ? '#22c55e' : '#ef4444' }]}>{l.status}</Text>
            </View>
          ))
        )
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0f0f1a' },
  content: { padding:20, paddingTop:40 },
  title: { color:'#f0f4ff', fontSize:20, fontWeight:'700', marginBottom:12 },
  empty:{ color:'#8b92b8' },
  row:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderColor:'rgba(255,255,255,0.03)' },
  left:{ color:'#c8cdf8' },
  right:{ fontWeight:'700' }
})
