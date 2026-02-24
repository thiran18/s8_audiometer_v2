
import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, Play } from 'lucide-react'

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">

                    <div className="w-24 h-24 mx-auto mb-4">
                        <img src="/newLOGO.png" alt="HearPulse Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    HearPulse
                </h1>
                <p className="text-gray-500 text-lg">
                    Professional Digital Audiometer for quick and accurate hearing screening.
                </p>

                <div className="space-y-3 pt-4">
                    <Link
                        to="/login"
                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Sign In to Dashboard
                    </Link>
                    <Link
                        to="/test"
                        className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors border border-gray-200"
                    >
                        Start Guest Screening
                    </Link>
                </div>

                <p className="text-xs text-center text-gray-400 mt-8">
                    Calibrated for standard headphones.
                </p>
            </div>
        </div>
    )
}
