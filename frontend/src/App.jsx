import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'

// Lazy loaded pages
const Home = React.lazy(() => import('./pages/Home'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'))
const Results = React.lazy(() => import('./pages/Results'))
const Patients = React.lazy(() => import('./pages/Patients'))
const SectionDetail = React.lazy(() => import('./pages/SectionDetail'))
const Test = React.lazy(() => import('./pages/Test'))
const Settings = React.lazy(() => import('./pages/Settings'))
const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'))

const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-[#0F111A]">
    <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
  </div>
)

// Role-based redirect component
function RoleBasedDashboardRedirect() {
  const { userProfile, loading } = useAuth()

  if (loading) return <PageLoader />

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
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />
    </Router>
  )
}

export default App
