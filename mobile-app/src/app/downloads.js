import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function DownloadsScreen(){
  const { BASE_URL } = useAuth()
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/downloads/`)
        setFiles(res.data || [])
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Downloads</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        files.length === 0 ? <Text style={styles.empty}>No files available.</Text> : (
          files.map(f => (
            <TouchableOpacity key={f.id} style={styles.fileRow} onPress={() => { /* future: download */ }}>
              <Text style={styles.fname}>{f.name}</Text>
              <Text style={styles.fsize}>{f.size || ''}</Text>
            </TouchableOpacity>
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
  fileRow:{ paddingVertical:12, borderBottomWidth:1, borderColor:'rgba(255,255,255,0.03)' },
  fname:{ color:'#c8cdf8' },
  fsize:{ color:'#8b92b8', marginTop:4 }
})
