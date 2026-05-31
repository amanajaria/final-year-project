import React from 'react'
import { Redirect } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const { user, loading, isAuthenticated } = useAuth()

  console.log("[Index Router] Render - loading:", loading, "isAuthenticated:", isAuthenticated, "user:", user)

  // While loading the session from storage, show a dark loading spinner
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#6270f1" />
      </View>
    )
  }

  // Guard: If not authenticated, route to the login screen
  if (!isAuthenticated) {
    return <Redirect href="/login" />
  }

  // Guard: Route user to the appropriate screen depending on their role
  if (user?.role === 'teacher') {
    return <Redirect href="/teacher/home" />
  }

  return <Redirect href="/student" />
}
