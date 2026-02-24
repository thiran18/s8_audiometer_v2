import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Loading from './ui/Loading'

export default function ProtectedRoute() {
    const { user, loading } = useAuth()

    if (loading) {
        return <div className="h-screen flex items-center justify-center"><Loading /></div>
    }

    return user ? <Outlet /> : <Navigate to="/login" />
}
