import { View, Text, ScrollView, StyleSheet } from 'react-native'

export default function MyClasses() {
  const classes = [
    { id: 1, name: 'Data Structures', code: 'CS201', students: 45, section: 'A' },
    { id: 2, name: 'DBMS', code: 'CS202', students: 42, section: 'A' },
    { id: 3, name: 'Operating Systems', code: 'CS203', students: 48, section: 'B' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Classes</Text>
      {classes.map(c => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.name}>{c.name}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{c.code} • Section {c.section}</Text>
            <Text style={styles.metaText}>{c.students} Students</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 20, paddingTop: 40 },
  title: { color: '#f0f4ff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#16162a', borderRadius: 12, padding: 14, marginBottom: 10 },
  name: { color: '#f0f4ff', fontWeight: '600', fontSize: 15 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaText: { color: '#8b92b8', fontSize: 12 },
})
