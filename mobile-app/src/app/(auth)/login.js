import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'

export default function LoginScreen() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      if (user.role === 'teacher') {
        router.replace('/teacher')
      } else {
        router.replace('/student')
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Invalid credentials. Please try again.'
      Alert.alert('Login Failed', detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background glows */}
      <View style={[styles.glow, { top: -100, left: -80,  backgroundColor: 'rgba(98,112,241,0.18)' }]} />
      <View style={[styles.glow, { bottom: -80, right: -80, backgroundColor: 'rgba(168,85,247,0.14)' }]} />

      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={28} color="#fff" />
          </View>
          <Text style={styles.logoTitle}>Collegium Net</Text>
          <Text style={styles.logoSub}>Student & Teacher Portal</Text>
        </View>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={17} color="#8b92b8" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="you@college.edu"
              placeholderTextColor="#8b92b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={17} color="#8b92b8" style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor="#8b92b8"
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPwd(p => !p)}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8b92b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.btn} onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hint}>Contact your administrator to create an account.</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0f0f1a',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  glow: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
  },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 32,
  },
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 20, marginBottom: 12,
    backgroundColor: '#6270f1', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6270f1', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  logoTitle:  { color: '#f0f4ff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  logoSub:    { color: '#8b92b8', fontSize: 13, marginTop: 2 },
  fieldWrap:  { marginBottom: 16 },
  label:      { color: '#8b92b8', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputRow:   {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  input:      { color: '#f0f4ff', fontSize: 15, flex: 1 },
  btn: {
    backgroundColor: '#6270f1', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#6270f1', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint:    { color: '#8b92b8', fontSize: 12, textAlign: 'center', marginTop: 20 },
})
