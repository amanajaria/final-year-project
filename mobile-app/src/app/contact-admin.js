import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function ContactAdmin(){
  const { user } = useAuth()
  const email = 'admin@collegium.net'
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Contact Admin</Text>
      <Text style={styles.body}>If you need help with attendance, results, or groups, reach out to your institute administrator.</Text>
      <TouchableOpacity style={styles.mailBtn} onPress={() => Linking.openURL(`mailto:${email}?subject=Help%20request%20from%20${encodeURIComponent(user?.name||'student')}`)}>
        <Text style={styles.mailText}>Email Admin</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Office hours: Mon–Fri 10:00–16:00</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0f0f1a' },
  content:{ padding:20, paddingTop:40 },
  title:{ color:'#f0f4ff', fontSize:20, fontWeight:'700', marginBottom:12 },
  body:{ color:'#c8cdf8', marginBottom:20 },
  mailBtn:{ backgroundColor:'#6270f1', padding:12, borderRadius:10, alignItems:'center' },
  mailText:{ color:'#fff', fontWeight:'700' },
  note:{ color:'#8b92b8', marginTop:12 }
})
