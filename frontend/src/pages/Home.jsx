import React from 'react'
import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import authBg from '../assets/auth-bg.png'

export default function Home() {
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

                {/* Right Side - Actions */}
                <div className="w-full md:w-1/2 min-h-screen md:min-h-0 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#1A1D2B]">
                    <div className="max-w-md mx-auto w-full flex flex-col items-center md:items-start">
                        {/* Logo for Mobile (Desktop Side has it) */}
                        <div className="md:hidden mb-8">
                            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                                <Activity size={40} className="text-white" />
                            </div>
                        </div>

                        <div className="mb-12 text-center md:text-left">
                            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                                HearPulse
                            </h2>
                            <p className="text-lg md:text-xl text-slate-400 font-light leading-relaxed">
                                Professional Digital Audiometer for quick and accurate hearing screening.
                            </p>
                        </div>

                        <div className="w-full space-y-4 pt-4">
                            <Link
                                to="/login"
                                className="block w-full py-5 px-6 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98] text-center"
                            >
                                Sign In to Dashboard
                            </Link>
                        </div>

                        <p className="text-sm text-center md:text-left text-slate-500 mt-16 font-medium">
                            Calibrated for standard headphones.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
