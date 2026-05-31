import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f1a' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="student/index" />
          <Stack.Screen name="teacher/index" />
          <Stack.Screen name="teacher/home" />
          <Stack.Screen name="teacher/review" />
          <Stack.Screen name="teacher/history" />
          <Stack.Screen name="teacher/classes" />
          <Stack.Screen name="teacher/students" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
