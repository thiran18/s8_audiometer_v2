import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Mail, ArrowLeft, Activity, CheckCircle2 } from 'lucide-react'
import authBg from '../assets/auth-bg.png'

export default function ForgotPassword() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            console.log('Attempting password reset for:', email)
            const { error } = await resetPassword(email)
            if (error) {
                console.error('Supabase reset error:', error)
                throw error
            }
            setSubmitted(true)
        } catch (err) {
            console.error('Catch block error:', err)
            setError(err.message || "An unexpected error occurred. Please try again.")
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
                <div className="w-full md:w-1/2 min-h-screen md:min-h-0 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#1A1D2B]">
                    <div className="max-w-md mx-auto w-full">
                        {!submitted ? (
                            <>
                                <div className="mb-10 text-center md:text-left">
                                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Reset Password</h2>
                                    <p className="text-slate-400 text-lg">
                                        Enter your email address and we'll send you a link to reset your password.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-shake">
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2 px-1">Email address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-4 bg-[#252a3d] border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98]"
                                    >
                                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                                    </button>

                                    <Link to="/login" className="flex items-center justify-center space-x-2 text-slate-400 hover:text-white transition-colors group pt-2">
                                        <ArrowLeft size={18} className="transform group-hover:-translate-x-1 transition-transform" />
                                        <span className="font-medium">Back to Sign In</span>
                                    </Link>
                                </form>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-6 text-green-500">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-4">Check your email</h2>
                                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                    We've sent a password reset link to <span className="text-white font-medium">{email}</span>. Please check your inbox and follow the instructions.
                                </p>
                                <Link
                                    to="/login"
                                    className="block w-full py-4 bg-[#252a3d] hover:bg-[#2d334a] text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
                                >
                                    Return to Sign In
                                </Link>
                                <p className="mt-8 text-sm text-slate-500">
                                    Didn't receive the email? Check your spam folder or{' '}
                                    <button onClick={() => setSubmitted(false)} className="text-blue-500 hover:underline">try again</button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
