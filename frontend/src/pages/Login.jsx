import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import authBg from '../assets/auth-bg.png'

export default function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
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

        const { data, error } = await signIn({
            email: formData.email,
            password: formData.password
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Navigate immediately — AuthContext will handle profile in background
            navigate('/home', { replace: true })
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
                            <div className="w-12 h-12">
                                <img src="/newLOGO.png" alt="HearPulse Logo" className="w-full h-full object-contain" />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">HearPulse</h1>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 min-h-screen md:min-h-0 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#1A1D2B]">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 text-center md:text-left">Sign In</h2>
                            <p className="text-slate-400">
                                Already have an account?{' '}
                                <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium underline underline-offset-4">
                                    Register
                                </Link>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
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
                                        name="email"
                                        id="login-email"
                                        required
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="block w-full pl-12 pr-4 py-4 bg-[#252a3d] border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-sm font-medium text-slate-400">Password</label>
                                    <Link to="/forgot-password" size="sm" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
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
                                        className="block w-full pl-12 pr-12 py-4 bg-[#252a3d] border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98] mt-4"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
