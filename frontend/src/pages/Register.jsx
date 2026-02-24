import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Activity, School, User } from 'lucide-react'

export default function Register() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        schoolName: '',
        role: 'clinician' // Default role
    })

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Sign Up
            const { data: { user, session }, error: authError } = await signUp({
                email: formData.email,
                password: formData.password,
            })

            if (authError) throw authError

            // 2. Update Profile with School Name and Role (if we have a user)
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        school_name: formData.schoolName,
                        role: formData.role
                    })
                    .eq('id', user.id)

                if (profileError) {
                    console.error("Profile update failed:", profileError)
                    // Continue anyway, it's not critical for login
                }
            }

            // 3. Redirect
            if (session) {
                navigate('/home') // Will redirect based on role
            } else {
                // Email confirmation case
                alert("Registration successful! Please check your email for confirmation link.")
                navigate('/login')
            }

        } catch (error) {
            if (error.status === 429 || error.message?.includes('rate limit')) {
                setError("Too many requests. Please wait a few minutes or check your email for a previous confirmation link. \n\n(Tip: If you're the developer, you can disable 'Confirm Email' in Supabase Auth settings to skip this during testing.)")
            } else {
                setError(error.message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Activity className="text-white w-8 h-8" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create Account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Register your school or clinic
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                                School / Clinic Name
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <School className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="schoolName"
                                    name="schoolName"
                                    type="text"
                                    required
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-2 border"
                                    placeholder="Springfield Elementary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Select Your Role
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'clinician' })}
                                    className={`relative p-4 border-2 rounded-lg transition-all ${formData.role === 'clinician'
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
                                    className={`relative p-4 border-2 rounded-lg transition-all ${formData.role === 'teacher'
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

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-2 border"
                                    placeholder="nurse@school.edu"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-2 border"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating Account...' : 'Register'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
