import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function GroupsScreen(){
  const { BASE_URL } = useAuth()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/groups/`)
        setGroups(res.data || [])
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Groups</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        groups.length === 0 ? <Text style={styles.empty}>No groups available.</Text> : (
          groups.map(g => (
            <View key={g.id} style={styles.card}>
              <Text style={styles.gname}>{g.name}</Text>
              <Text style={styles.gmeta}>{g.approved ? 'Approved' : 'Pending'}</Text>
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
  card:{ backgroundColor:'#16162a', padding:12, borderRadius:10, marginBottom:10 },
  gname:{ color:'#f0f4ff', fontWeight:'600' },
  gmeta:{ color:'#8b92b8', marginTop:6 }
})
