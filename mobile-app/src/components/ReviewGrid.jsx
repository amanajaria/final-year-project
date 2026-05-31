/**
 * ReviewGrid.jsx
 *
 * Pre-submit review screen showing Present / Absent students in a
 * two-column categorised grid before the teacher dispatches the payload.
 */
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

function StudentChip({ student, status }) {
  const isPresent = status === 'PRESENT'
  return (
    <View style={[styles.chip, isPresent ? styles.chipPresent : styles.chipAbsent]}>
      <View style={[styles.dot, { backgroundColor: isPresent ? '#22c55e' : '#ef4444' }]} />
      <Text style={styles.chipName} numberOfLines={1}>{student.name}</Text>
      {student.roll_no ? <Text style={styles.chipRoll}>{student.roll_no}</Text> : null}
    </View>
  )
}

export default function ReviewGrid({ records, onConfirm, onBack, loading }) {
  const present = records.filter(r => r.status === 'PRESENT')
  const absent  = records.filter(r => r.status === 'ABSENT')
  const pct     = records.length > 0 ? Math.round((present.length / records.length) * 100) : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review Attendance</Text>
      <Text style={styles.sub}>Confirm before submitting to the server</Text>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, styles.summaryPresent]}>
          <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
          <Text style={[styles.summaryNum, { color: '#22c55e' }]}>{present.length}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryCenter}>
          <Text style={styles.pctNum}>{pct}%</Text>
          <Text style={styles.pctLabel}>Attendance</Text>
        </View>
        <View style={[styles.summaryBox, styles.summaryAbsent]}>
          <Ionicons name="close-circle" size={22} color="#ef4444" />
          <Text style={[styles.summaryNum, { color: '#ef4444' }]}>{absent.length}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
      </View>

      {/* Columns */}
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={[styles.colHeader, { color: '#22c55e' }]}>✓ Present</Text>
          {present.map(r => <StudentChip key={r.student_id} student={r.student} status="PRESENT" />)}
          {present.length === 0 && <Text style={styles.emptyCol}>None</Text>}
        </View>
        <View style={styles.column}>
          <Text style={[styles.colHeader, { color: '#ef4444' }]}>✕ Absent</Text>
          {absent.map(r => <StudentChip key={r.student_id} student={r.student} status="ABSENT" />)}
          {absent.length === 0 && <Text style={styles.emptyCol}>None</Text>}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnBack} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={16} color="#8b92b8" />
          <Text style={styles.btnBackText}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnConfirm} onPress={onConfirm} activeOpacity={0.85} disabled={loading}>
          {loading
            ? <Text style={styles.btnConfirmText}>Submitting…</Text>
            : <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.btnConfirmText}>Submit</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content:   { padding: 24, paddingBottom: 40 },
  title:     { color: '#f0f4ff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  sub:       { color: '#8b92b8', fontSize: 13, textAlign: 'center', marginBottom: 24 },

  summaryRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  summaryBox:    { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  summaryPresent:{ backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  summaryAbsent: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'  },
  summaryCenter: { flex: 1, alignItems: 'center' },
  summaryNum:    { fontSize: 28, fontWeight: '800' },
  summaryLabel:  { color: '#8b92b8', fontSize: 11 },
  pctNum:        { color: '#f0f4ff', fontSize: 32, fontWeight: '800' },
  pctLabel:      { color: '#8b92b8', fontSize: 12 },

  columns:   { flexDirection: 'row', gap: 12 },
  column:    { flex: 1 },
  colHeader: { fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  emptyCol:  { color: '#8b92b8', fontSize: 12, fontStyle: 'italic' },

  chip: {
    borderRadius: 10, padding: 8, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipPresent: { backgroundColor: 'rgba(34,197,94,0.08)',  borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)'  },
  chipAbsent:  { backgroundColor: 'rgba(239,68,68,0.08)',  borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'  },
  dot:         { width: 6, height: 6, borderRadius: 3 },
  chipName:    { color: '#f0f4ff', fontSize: 12, fontWeight: '600', flex: 1 },
  chipRoll:    { color: '#8b92b8', fontSize: 10 },

  actions:       { flexDirection: 'row', gap: 12, marginTop: 28 },
  btnBack: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 14,
  },
  btnBackText:    { color: '#8b92b8', fontWeight: '600', fontSize: 15 },
  btnConfirm: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, backgroundColor: '#6270f1', paddingVertical: 14,
    shadowColor: '#6270f1', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  btnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
