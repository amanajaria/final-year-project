/**
 * teacher/review.js — Pre-submit review screen.
 * Receives records from the swipe view via router params,
 * renders ReviewGrid, and POSTs to /attendance/submit on confirm.
 */
import { useState } from 'react'
import { Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import axios from 'axios'
import ReviewGrid from '../../components/ReviewGrid'
import { useAuth } from '../../context/AuthContext'

export default function ReviewScreen() {
  const { BASE_URL } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [submitting, setSubmitting] = useState(false)

  const records    = JSON.parse(params.recordsJson || '[]')
  const scheduleId = Number(params.scheduleId || 1)
  const date       = params.date || new Date().toISOString().split('T')[0]

  const handleConfirm = async () => {
    if (!records || records.length === 0) {
      Alert.alert('No Records', 'No attendance records to submit.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        schedule_id: scheduleId,
        date,
        entries: records.map(r => ({ student_id: r.student_id, status: r.status })),
      }
      console.log('Submitting attendance:', { schedule_id: scheduleId, num_students: records.length, payload })
      await axios.post(`${BASE_URL}/attendance/submit`, payload)
      Alert.alert(
        '✅ Submitted Successfully',
        `Attendance for ${records.length} students has been recorded.`,
        [{ text: 'Done', onPress: () => router.replace('/teacher') }]
      )
    } catch (err) {
      const data = err?.response?.data
      let msg = 'Submission failed. Please try again.'
      if (data) {
        const d = data.detail ?? data.message ?? data.error ?? data
        if (Array.isArray(d)) {
          msg = d.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('\n')
        } else if (typeof d === 'object') {
          msg = JSON.stringify(d)
        } else if (typeof d === 'string') {
          msg = d
        }
      } else if (err?.message) {
        msg = err.message
      }
      Alert.alert('Submission Error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ReviewGrid
      records={records}
      onConfirm={handleConfirm}
      onBack={() => router.back()}
      loading={submitting}
    />
  )
}
