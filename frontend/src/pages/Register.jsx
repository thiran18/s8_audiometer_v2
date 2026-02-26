import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Activity, School, User, Eye, EyeOff } from 'lucide-react'
import authBg from '../assets/auth-bg.png'

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
    const [showPassword, setShowPassword] = useState(false)

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
        <div className="min-h-screen bg-[#1A1D2B] md:bg-[#0F111A] flex font-outfit">
            <div className="w-full flex flex-col md:flex-row border-slate-800/50">
                {/* Left Side - Image/Branding (Desktop Only) */}
                <div className="hidden md:block md:w-1/2 relative">
                    <img
                        src={authBg}
                        alt="Branding"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F111A] via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-12 left-12 right-12 text-white">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                                <Activity size={32} />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">HearPulse</h1>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 min-h-screen md:min-h-0 p-8 sm:p-12 lg:p-16 flex flex-col justify-center overflow-y-auto max-h-screen bg-[#1A1D2B]">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10 text-center md:text-left">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center md:text-left">Create an account</h2>
                            <p className="text-slate-400">
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium underline underline-offset-4">
                                    Log in
                                </Link>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 px-1">School / Clinic Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                        <School size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="schoolName"
                                        required
                                        value={formData.schoolName}
                                        onChange={handleChange}
                                        className="block w-full pl-12 pr-4 py-3.5 bg-[#252a3d] border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                        placeholder="Springfield Elementary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3 px-1">Select Your Role</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: 'clinician' })}
                                        className={`group relative p-4 bg-[#252a3d] border-2 rounded-2xl transition-all duration-300 ${formData.role === 'clinician'
                                            ? 'border-blue-500 ring-4 ring-blue-500/10'
                                            : 'border-slate-800 hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center text-center space-y-2">
                                            <div className={`p-2 rounded-xl transition-colors ${formData.role === 'clinician' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                <User size={20} />
                                            </div>
                                            <span className={`text-sm font-bold ${formData.role === 'clinician' ? 'text-white' : 'text-slate-400'}`}>Clinician</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Full Access</span>
                                        </div>
                                        {formData.role === 'clinician' && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#1A1D2B]">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: 'teacher' })}
                                        className={`group relative p-4 bg-[#252a3d] border-2 rounded-2xl transition-all duration-300 ${formData.role === 'teacher'
                                            ? 'border-blue-500 ring-4 ring-blue-500/10'
                                            : 'border-slate-800 hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center text-center space-y-2">
                                            <div className={`p-2 rounded-xl transition-colors ${formData.role === 'teacher' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                <School size={20} />
                                            </div>
                                            <span className={`text-sm font-bold ${formData.role === 'teacher' ? 'text-white' : 'text-slate-400'}`}>Teacher</span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">View Only</span>
                                        </div>
                                        {formData.role === 'teacher' && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#1A1D2B]">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 px-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="block w-full pl-12 pr-4 py-3.5 bg-[#252a3d] border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                        placeholder="nurse@school.edu"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2 px-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="block w-full pl-12 pr-12 py-3.5 bg-[#252a3d] border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                        placeholder="Min. 6 characters"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98] mt-2"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
