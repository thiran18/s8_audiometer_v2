import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'

import Dashboard from './pages/Dashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import Results from './pages/Results'
import Patients from './pages/Patients'
import SectionDetail from './pages/SectionDetail'

import Test from './pages/Test'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Role-based redirect component
function RoleBasedDashboardRedirect() {
  const { userProfile, loading } = useAuth()

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0F111A]">
      <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes with Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<ClinicianRoute><Dashboard /></ClinicianRoute>} />
              <Route path="/teacher-dashboard" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
              <Route path="/section/:sectionId" element={<SectionDetail />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/test" element={<Test />} />
              <Route path="/settings" element={<Settings />} />
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
