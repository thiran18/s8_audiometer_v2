import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'

import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import Results from './pages/Results'
import Patients from './pages/Patients'
import SectionDetail from './pages/SectionDetail'

// Placeholder for Test (Coming in next step)
import Test from './pages/Test'

import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Role-based redirect component
function RoleBasedDashboardRedirect() {
  const { userProfile, loading } = useAuth()

  if (loading) return null

  if (!userProfile) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to={userProfile.role === 'teacher' ? "/teacher-dashboard" : "/dashboard"} replace />
}

// Guard components
function TeacherRoute({ children }) {
  const { userProfile, loading } = useAuth()
  if (loading) return null
  if (userProfile?.role !== 'teacher') return <Navigate to="/dashboard" replace />
  return children
}

function ClinicianRoute({ children }) {
  const { userProfile, loading } = useAuth()
  if (loading) return null
  if (userProfile?.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />
  return children
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />

          {/* Protected Routes with Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<ClinicianRoute><Dashboard /></ClinicianRoute>} />
              <Route path="/teacher-dashboard" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
              <Route path="/section/:sectionId" element={<SectionDetail />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/test" element={<Test />} />
              <Route path="/home" element={<RoleBasedDashboardRedirect />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
