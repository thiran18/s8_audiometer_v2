import React, { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { User, Mail, Shield, School, Calendar, Sun, Moon, Camera, Trash2 } from 'lucide-react'

export default function Settings() {
    const { user, userProfile, refreshProfile } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const isTeacher = userProfile?.role === 'teacher'

    const handlePhotoUpload = async (event) => {
        try {
            setUploadingPhoto(true)
            const file = event.target.files[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `user-profiles/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            await refreshProfile(user.id)
            alert('Profile photo updated successfully!')
        } catch (error) {
            alert('Error updating profile photo: ' + error.message)
            console.error(error)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleRemovePhoto = async () => {
        if (!window.confirm('Are you sure you want to remove your profile photo?')) return

        try {
            setUploadingPhoto(true)
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id)

            if (error) throw error

            await refreshProfile(user.id)
            alert('Profile photo removed!')
        } catch (error) {
            alert('Error removing photo: ' + error.message)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const renderAvatar = () => {
        if (userProfile?.avatar_url) {
            return (
                <img
                    src={userProfile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                />
            )
        }
        return (
            <div className="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-3xl uppercase">
                {userProfile?.email?.[0] || '?'}
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-outfit">Settings</h1>
                <p className="text-gray-500 dark:text-slate-400 mt-2">Manage your account preferences and profile information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 flex flex-col items-center text-center border border-slate-100 dark:border-slate-700">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-1 mb-4 relative overflow-hidden">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
                                    {renderAvatar()}

                                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 backdrop-blur-[2px]">
                                        {uploadingPhoto ? (
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Camera className="text-white w-6 h-6 mb-1" />
                                                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Update</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            disabled={uploadingPhoto}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {userProfile?.avatar_url && (
                            <button
                                onClick={handleRemovePhoto}
                                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 mb-2"
                            >
                                <Trash2 size={12} />
                                <span>Remove Photo</span>
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userProfile?.email?.split('@')[0]}</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 capitalize px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 font-medium">
                            {userProfile?.role || 'User'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-2">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
                                <div className="flex items-center space-x-3 text-gray-600 dark:text-slate-400">
                                    <Calendar size={18} className="text-blue-500" />
                                    <span className="text-sm">Joined</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                    {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
                                <div className="flex items-center space-x-3 text-gray-600 dark:text-slate-400">
                                    <Shield size={18} className="text-green-500" />
                                    <span className="text-sm">Status</span>
                                </div>
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full uppercase">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Settings Sections */}
                <div className="md:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8 border border-slate-100 dark:border-slate-700 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5 dark:text-white">
                            <User size={120} />
                        </div>

                        <div className="flex items-center space-x-3 mb-8">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                <User size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                                    <Mail size={12} />
                                    <span>Email Address</span>
                                </p>
                                <p className="text-gray-900 dark:text-white font-medium break-all">{userProfile?.email}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                                    <Shield size={12} />
                                    <span>Account Role</span>
                                </p>
                                <p className="text-gray-900 dark:text-white font-medium capitalize">{userProfile?.role}</p>
                            </div>
                            {isTeacher && (
                                <div className="col-span-2 space-y-1">
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                                        <School size={12} />
                                        <span>Institution Name</span>
                                    </p>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <span className="text-gray-900 dark:text-white font-bold">{userProfile?.school_name || 'Not specified'}</span>
                                        <span className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-gray-400 dark:text-slate-500">Verified</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                    {/* Theme Toggle Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-2">Appearance</h3>
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center space-x-3 text-gray-700 dark:text-slate-300">
                                {theme === 'light' ? <Sun size={20} className="text-orange-500" /> : <Moon size={20} className="text-blue-400" />}
                                <span className="text-sm font-bold">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

