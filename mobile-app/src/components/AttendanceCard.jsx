/**
 * AttendanceCard.jsx
 *
 * A single student card for the swipe deck.
 * Shows avatar, name, roll number, department, and semester.
 * Animates a coloured overlay based on swipe direction feedback.
 */
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function AttendanceCard({ card, swipeDirection }) {
  const present = swipeDirection === 'right'
  const absent  = swipeDirection === 'left'

  const getInitials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <View style={styles.card}>
      {/* Direction overlay */}
      {present && (
        <View style={[styles.overlay, styles.presentOverlay]}>
          <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
          <Text style={[styles.overlayText, { color: '#22c55e' }]}>PRESENT</Text>
        </View>
      )}
      {absent && (
        <View style={[styles.overlay, styles.absentOverlay]}>
          <Ionicons name="close-circle" size={40} color="#ef4444" />
          <Text style={[styles.overlayText, { color: '#ef4444' }]}>ABSENT</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <Text style={styles.avatarText}>{getInitials(card.name)}</Text>
      </View>

      {/* Student Info */}
      <Text style={styles.name}>{card.name}</Text>
      <Text style={styles.rollNo}>{card.roll_no || 'No Roll No.'}</Text>

      <View style={styles.tagRow}>
        {card.department?.code && (
          <View style={styles.tag}>
            <Ionicons name="school-outline" size={12} color="#6270f1" />
            <Text style={styles.tagText}>{card.department.code}</Text>
          </View>
        )}
        {card.semester && (
          <View style={[styles.tag, { borderColor: 'rgba(168,85,247,0.25)', backgroundColor: 'rgba(168,85,247,0.1)' }]}>
            <Ionicons name="layers-outline" size={12} color="#a855f7" />
            <Text style={[styles.tagText, { color: '#a855f7' }]}>Sem {card.semester}</Text>
          </View>
        )}
        {card.section && (
          <View style={[styles.tag, { borderColor: 'rgba(34,197,94,0.25)', backgroundColor: 'rgba(34,197,94,0.1)' }]}>
            <Text style={[styles.tagText, { color: '#22c55e' }]}>Section {card.section}</Text>
          </View>
        )}
      </View>

      {/* Swipe hint */}
      <View style={styles.hintRow}>
        <View style={styles.hintLeft}>
          <Ionicons name="arrow-back" size={14} color="#ef4444" />
          <Text style={[styles.hintText, { color: '#ef4444' }]}>Absent</Text>
        </View>
        <View style={styles.hintRight}>
          <Text style={[styles.hintText, { color: '#22c55e' }]}>Present</Text>
          <Ionicons name="arrow-forward" size={14} color="#22c55e" />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e38',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    width: '100%',
    minHeight: 340,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    zIndex: 10, gap: 8,
  },
  presentOverlay: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 2, borderColor: 'rgba(34,197,94,0.4)' },
  absentOverlay:  { backgroundColor: 'rgba(239,68,68,0.12)',  borderWidth: 2, borderColor: 'rgba(239,68,68,0.4)'  },
  overlayText: { fontSize: 22, fontWeight: '800', letterSpacing: 2 },

  avatarWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(98,112,241,0.2)',
    borderWidth: 2, borderColor: 'rgba(98,112,241,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  avatarText:  { color: '#6270f1', fontSize: 30, fontWeight: '700' },
  name:        { color: '#f0f4ff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  rollNo:      { color: '#8b92b8', fontSize: 14, marginBottom: 16 },

  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(98,112,241,0.1)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(98,112,241,0.25)',
  },
  tagText: { color: '#6270f1', fontSize: 12, fontWeight: '600' },

  hintRow:  { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  hintLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintRight:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { fontSize: 12, fontWeight: '600' },
})
