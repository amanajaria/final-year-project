import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function ChatScreen(){
  const { BASE_URL, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await axios.get(`${BASE_URL}/chat/teacher/${user.id}`)
        setMessages(res.data || [])
      } catch (e) {}
      setLoading(false)
    })()
  }, [BASE_URL, user])

  const send = async () => {
    if (!text) return
    try {
      await axios.post(`${BASE_URL}/chat/send`, { to: 'teacher', body: text })
      setMessages(prev => [...prev, { id: Date.now(), body: text, me: true }])
      setText('')
    } catch (e) {}
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Teacher</Text>
      {loading ? <ActivityIndicator color="#6270f1" /> : (
        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 12 }}>
          {messages.map(m => (
            <View key={m.id} style={[styles.msg, m.me ? styles.msgMe : styles.msgThem]}>
              <Text style={styles.msgText}>{m.body}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor="#8b92b8" style={styles.input} />
        <TouchableOpacity onPress={send} style={styles.sendBtn}><Text style={{ color:'#fff' }}>Send</Text></TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0f0f1a', paddingTop:40 },
  title:{ color:'#f0f4ff', fontSize:20, fontWeight:'700', padding:20 },
  chatArea:{ flex:1 },
  msg:{ padding:10, borderRadius:8, marginBottom:8, maxWidth:'80%' },
  msgMe:{ backgroundColor:'#6270f1', alignSelf:'flex-end' },
  msgThem:{ backgroundColor:'#1e1e38', alignSelf:'flex-start' },
  msgText:{ color:'#fff' },
  inputRow:{ flexDirection:'row', padding:12, borderTopWidth:1, borderColor:'rgba(255,255,255,0.03)' },
  input:{ flex:1, height:44, backgroundColor:'#16162a', borderRadius:8, paddingHorizontal:12, color:'#fff' },
  sendBtn:{ marginLeft:8, backgroundColor:'#6270f1', paddingHorizontal:12, justifyContent:'center', borderRadius:8 }
})
