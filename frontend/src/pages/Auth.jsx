import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Activity, User, ArrowRight, School } from 'lucide-react'

export default function Auth() {
    const { signIn, signUp, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Determine mode based on URL or default to login
    const isRegister = location.pathname === '/register'

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '', // Only for register
        role: 'clinician' // Default role for register
    })

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isRegister) {
                // REGISTER FLOW
                const { data: { user, session }, error: authError } = await signUp({
                    email: formData.email,
                    password: formData.password,
                })
                if (authError) throw authError

                // Update Profile
                if (user) {
                    const { error: updateError } = await supabase.from('profiles').update({
                        school_name: formData.fullName, // Using school_name field for now as per schema
                        role: formData.role
                    }).eq('id', user.id)

                    if (updateError) throw updateError

                    // Force global state to update before navigating
                    await refreshProfile(user.id)
                }

                if (session) {
                    navigate('/home') // Will redirect based on role
                } else {
                    alert("Registration successful! Please check your email.")
                    navigate('/login')
                }
            } else {
                // LOGIN FLOW
                const { error } = await signIn({
                    email: formData.email,
                    password: formData.password
                })
                if (error) throw error
                navigate('/home') // Will redirect based on role
            }
        } catch (err) {
            console.error("Auth Error:", err)
            let msg = err.message

            // Helpful messages for common errors
            if (msg.includes("rate limit")) {
                msg = "Too many requests. Please wait a few minutes or check your email for a previous confirmation link. \n\n(Tip: If you're the developer, you can disable 'Confirm Email' in Supabase Auth settings to skip this during testing.)"
            } else if (msg.includes("already registered")) {
                msg = "This email is already registered. Please sign in."
            }

            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            {/* Header / Logo Section */}
            <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto mb-4">
                    <img src="/newLOGO.png" alt="HearPulse Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">HearPulse</h1>
                <p className="text-gray-500 mt-2">Mobile-First Digital Audiometry Platform</p>
            </div>

            {/* Main Card */}
            <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden p-8">

                {/* Tab Switcher */}
                <div className="bg-gray-100 p-1 rounded-xl flex mb-8">
                    <Link
                        to="/login"
                        className={`flex-1 text-center py-2.5 text-sm font-semibold rounded-lg transition-all ${!isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/register"
                        className={`flex-1 text-center py-2.5 text-sm font-semibold rounded-lg transition-all ${isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Register
                    </Link>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {isRegister && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="fullName"
                                    type="text"
                                    required={isRegister}
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="block w-full pl-10 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 py-3 bg-white border"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    {isRegister && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Select Your Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'clinician' })}
                                    className={`relative p-4 border-2 rounded-xl transition-all ${formData.role === 'clinician'
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center text-center space-y-2">
                                        <User className={`w-6 h-6 ${formData.role === 'clinician' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${formData.role === 'clinician' ? 'text-blue-900' : 'text-gray-700'}`}>
                                            Clinician
                                        </span>
                                        <span className="text-xs text-gray-500">Full Access</span>
                                    </div>
                                    {formData.role === 'clinician' && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'teacher' })}
                                    className={`relative p-4 border-2 rounded-xl transition-all ${formData.role === 'teacher'
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center text-center space-y-2">
                                        <School className={`w-6 h-6 ${formData.role === 'teacher' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${formData.role === 'teacher' ? 'text-blue-900' : 'text-gray-700'}`}>
                                            Teacher
                                        </span>
                                        <span className="text-xs text-gray-500">View Only</span>
                                    </div>
                                    {formData.role === 'teacher' && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="block w-full pl-10 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 py-3 bg-white border"
                                placeholder="doctor@clinic.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="block w-full pl-10 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 py-3 bg-white border"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:scale-100"
                        >
                            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                        </button>
                    </div>
                </form>

            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-sm text-gray-400">
                Professional Tool for Clinical and School Screenings.
            </p>
        </div>
    )
}

