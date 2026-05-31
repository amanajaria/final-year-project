import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function NotesScreen(){
  const { BASE_URL } = useAuth()
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/notes/`)
        setNotes(res.data || [])
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notes</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        notes.length === 0 ? <Text style={styles.empty}>No notes found.</Text> : (
          notes.map(n => (
            <View key={n.id} style={styles.noteCard}>
              <Text style={styles.noteTitle}>{n.title}</Text>
              <Text style={styles.noteBody} numberOfLines={2}>{n.content}</Text>
            </View>
          ))
        )
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0f0f1a' },
  content:{ padding:20, paddingTop:40 },
  title:{ color:'#f0f4ff', fontSize:20, fontWeight:'700', marginBottom:12 },
  empty:{ color:'#8b92b8' },
  noteCard:{ backgroundColor:'#16162a', padding:12, borderRadius:10, marginBottom:10 },
  noteTitle:{ color:'#f0f4ff', fontWeight:'600' },
  noteBody:{ color:'#8b92b8', marginTop:6 }
})
