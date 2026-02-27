import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [initError, setInitError] = useState(null)

    // Fetch user profile from database (always runs in background, never blocks UI)
    const refreshProfile = async (userId) => {
        if (!userId) {
            setUserProfile(null)
            return null
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            setUserProfile(data)
            return data
        } catch (error) {
            console.error('Error fetching user profile:', error)
            setUserProfile(null)
            return null
        }
    }

    useEffect(() => {
        let mounted = true

        const initSession = async () => {
            try {
                // Reduced timeout to 2s — Supabase caches session in localStorage so this is usually instant
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => {
                        reject(new Error('Session check timeout'))
                    }, 2000)
                )

                const sessionPromise = supabase.auth.getSession().then(({ data: { session }, error }) => {
                    if (error) throw error
                    if (mounted) {
                        setSession(session)
                        setUser(session?.user ?? null)
                        // Fire profile fetch in background — don't await it
                        if (session?.user) {
                            refreshProfile(session.user.id)
                        }
                    }
                })

                await Promise.race([sessionPromise, timeoutPromise])
            } catch (error) {
                if (mounted) {
                    setInitError(error.message)
                }
            } finally {
                // Unblock the UI immediately — profile loads in background
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        initSession()

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return

            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                // Fetch profile in background — don't await, don't block loading
                refreshProfile(session.user.id)
            } else {
                setUserProfile(null)
            }

            // Unblock the UI right away
            setLoading(false)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        }),
        updatePassword: (newPassword) => supabase.auth.updateUser({
            password: newPassword
        }),
        refreshProfile,
        user,
        session,
        userProfile,
        loading
    }

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="h-screen flex items-center justify-center flex-col space-y-6 px-6 text-center">
                    {!initError ? (
                        <>
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="space-y-2">
                                <p className="text-gray-800 font-semibold text-lg">Initializing Application</p>
                                <p className="text-gray-500 text-sm">Connecting to secure servers...</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-2">
                                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <p className="text-gray-800 font-semibold text-lg">Connection is taking longer than usual</p>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                    Please check your internet connection and try again.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setInitError(null)
                                    setLoading(true)
                                    window.location.reload()
                                }}
                                className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                            >
                                Retry Connection
                            </button>
                        </>
                    )}
                </div>
            ) : children}
        </AuthContext.Provider>
    )
}
