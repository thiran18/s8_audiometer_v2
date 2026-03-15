
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, User, FileText, ChevronRight, Eye, Trash2, X, School, BookOpen, Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import toast from 'react-hot-toast'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Users } from 'lucide-react'

export default function Patients() {
    const { user, userProfile } = useAuth()
    const isTeacher = userProfile?.role === 'teacher'

    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [editMode, setEditMode] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [confirmModalState, setConfirmModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: 'Confirm',
        isDestructive: true
    })

    // New Patient Form
    const [newPatient, setNewPatient] = useState({
        name: '',
        age: '',
        gender: 'Male',
        notes: ''
    })

    useEffect(() => {
        if (user) {
            fetchPatients()
        }
    }, [user, userProfile])

    const fetchPatients = async () => {
        if (!user) return
        try {
            let query = supabase
                .from('patients')
                .select('*, pid, screenings(count), sections(name, school_name)')

            if (isTeacher) {
                query = query.eq('created_by', user.id)
            }

            const { data, error } = await query.order('created_at', { ascending: false })

            if (error) throw error
            setPatients(data)
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Error fetching patients:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePatient = async (e) => {
        e.preventDefault()
        try {
            // Duplicate Check
            const isDuplicate = patients.some(p =>
                p.name.toLowerCase() === newPatient.name.trim().toLowerCase()
            );

            if (isDuplicate) {
                setConfirmModalState({
                    isOpen: true,
                    title: 'Possible Duplicate',
                    message: `Patient "${newPatient.name}" may already exist. Create anyway?`,
                    confirmText: 'Create Anyway',
                    isDestructive: false,
                    onConfirm: () => {
                        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                        proceedWithCreatePatient();
                    }
                });
                return;
            }

            await proceedWithCreatePatient();
        } catch (error) {
            toast.error(error.message)
        }
    }

    const proceedWithCreatePatient = async () => {
        try {

            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('patients')
                .insert({
                    created_by: user.id,
                    name: newPatient.name,
                    age: newPatient.age ? parseInt(newPatient.age) : null,
                    gender: newPatient.gender,
                    notes: newPatient.notes
                })

            if (error) throw error

            setShowAddModal(false)
            setNewPatient({ name: '', age: '', gender: 'Male', notes: '' })
            toast.success('Patient created successfully!')
            fetchPatients() // Refresh list
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleUpdatePatient = async (e) => {
        e.preventDefault()
        try {
            setUpdating(true)
            const { error } = await supabase
                .from('patients')
                .update({
                    name: selectedPatient.name,
                    age: selectedPatient.age ? parseInt(selectedPatient.age) : null,
                    gender: selectedPatient.gender,
                    notes: selectedPatient.notes
                })
                .eq('id', selectedPatient.id)

            if (error) throw error

            setEditMode(false)
            toast.success('Patient updated successfully!')
            fetchPatients() // Refresh list
        } catch (error) {
            toast.error('Error updating patient: ' + error.message)
        } finally {
            setUpdating(false)
        }
    }

    const handlePhotoUpload = async (e, patientId) => {
        if (!isTeacher) return
        const file = e.target.files[0]
        if (!file) return

        // Basic size check (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File is too large. Please select an image under 2MB.')
            return
        }

        try {
            setUploadingPhoto(true)
            console.log('--- Photo Upload Start ---')
            console.log('File:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB')

            const fileExt = file.name.split('.').pop()
            const fileName = `${patientId}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            console.log('Uploading to Supabase bucket "avatars"...')
            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) {
                console.error('Storage Upload Error:', uploadError)
                throw uploadError
            }
            console.log('Upload successful:', data)

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            console.log('Generated Public URL:', publicUrl)

            // Update Patient Record
            console.log('Updating database record for patient:', patientId)
            const { error: updateError } = await supabase
                .from('patients')
                .update({ avatar_url: publicUrl })
                .eq('id', patientId)

            if (updateError) {
                console.error('Database Update Error:', updateError)
                throw updateError
            }
            console.log('Database updated successfully!')

            // Update Local State
            if (selectedPatient && selectedPatient.id === patientId) {
                setSelectedPatient({ ...selectedPatient, avatar_url: publicUrl })
            }
            fetchPatients()
            toast.success('Photo uploaded successfully!')
            console.log('--- Photo Upload Finished ---')
        } catch (error) {
            console.error('Final Catch Error:', error)
            toast.error('Error: ' + (error.error_description || error.message || 'Check browser console for details'))
        } finally {
            setUploadingPhoto(false)
        }
    }

    const requestRemovePhoto = (patientId) => {
        setConfirmModalState({
            isOpen: true,
            title: 'Remove Photo',
            message: 'Are you sure you want to remove this photo and use initials instead?',
            confirmText: 'Remove',
            isDestructive: true,
            onConfirm: () => {
                setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                handleRemovePhoto(patientId);
            }
        });
    }

    const handleRemovePhoto = async (patientId) => {
        if (!isTeacher) return
        try {
            setUploadingPhoto(true)
            const { error } = await supabase
                .from('patients')
                .update({ avatar_url: null })
                .eq('id', patientId)

            if (error) throw error

            if (selectedPatient && selectedPatient.id === patientId) {
                setSelectedPatient({ ...selectedPatient, avatar_url: null })
            }
            fetchPatients()
            toast.success('Photo removed.')
        } catch (error) {
            toast.error('Error removing photo: ' + error.message)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const renderAvatar = (patient, size = '11') => {
        if (patient.avatar_url) {
            return (
                <img
                    src={patient.avatar_url}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                />
            )
        }
        return (
            <div className="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold uppercase" style={{ fontSize: size === '11' ? '1rem' : '2.5rem' }}>
                {patient.name?.charAt(0) || '?'}
            </div>
        )
    }

    const requestDeletePatient = (id, name) => {
        setConfirmModalState({
            isOpen: true,
            title: 'Delete Patient',
            message: `Are you sure you want to delete patient "${name}"? This will also delete all their screenings.`,
            confirmText: 'Delete',
            isDestructive: true,
            onConfirm: () => {
                setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                handleDeletePatient(id);
            }
        });
    }

    const handleDeletePatient = async (id) => {
        try {
            const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success('Patient deleted.')
            fetchPatients()
        } catch (error) {
            toast.error('Error deleting patient: ' + error.message)
        }
    }

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isTeacher ? 'School Students' : 'Patients'}</h1>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto justify-center"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {isTeacher ? 'Add Student' : 'Add Patient'}
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-900 placeholder-gray-500 dark:placeholder-slate-500 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search students by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="bg-white dark:bg-slate-800 shadow dark:shadow-none sm:rounded-md border border-transparent dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700 mt-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="px-4 py-4 sm:px-6 flex items-center justify-between pointer-events-none">
                            <div className="flex items-center gap-4 w-full">
                                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                                <div className="space-y-2 w-full max-w-[200px]">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                            <div className="hidden sm:flex items-center gap-2">
                                <Skeleton className="w-8 h-8 rounded-lg" />
                                <Skeleton className="w-8 h-8 rounded-lg" />
                                <Skeleton className="w-20 h-8 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="mt-4">
                    <EmptyState 
                        icon={Users}
                        title={isTeacher ? "No students found" : "No patients found"}
                        description={searchTerm ? "We couldn't find any matches for your search. Try different keywords." : (isTeacher ? "Get started by adding your first student to the roster." : "Get started by adding a new patient profile.")}
                        actionLabel={searchTerm ? "Clear Search" : (isTeacher ? "Add Student" : "Add Patient")}
                        onAction={searchTerm ? () => setSearchTerm('') : () => setShowAddModal(true)}
                    />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 shadow dark:shadow-none overflow-hidden sm:rounded-md border border-transparent dark:border-slate-700">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 border-l-4 border-red-500">
                            <p className="font-bold">Error loading patients</p>
                            <p>{error}</p>
                            <p className="text-sm mt-1">If this says "Column does not exist", please run the <code>migrations_add_pid.sql</code> in Supabase.</p>
                        </div>
                    )}
                    <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                        {filteredPatients.map((patient, index) => (
                            <li key={patient.id} className={`animate-fade-in-up stagger-${Math.min(index + 1, 7)} opacity-0`} style={{ animationFillMode: 'forwards' }}>
                                <div className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors px-4 py-4 sm:px-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                        <div className="flex items-center min-w-0">
                                            <div className="flex-shrink-0 w-11 h-11 border-2 border-blue-500/10 rounded-full overflow-hidden bg-white dark:bg-slate-900 shadow-sm border-blue-100 dark:border-blue-900/30">
                                                {renderAvatar(patient)}
                                            </div>
                                            <div className="ml-4 min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
                                                        {patient.name}
                                                    </p>
                                                    <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono bg-gray-100 dark:bg-slate-900 px-1.5 py-0.5 rounded shrink-0 border border-gray-200 dark:border-slate-800">
                                                        {patient.pid || 'No PID'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                                    {patient.age ? `${patient.age}y` : 'Age N/A'} • {patient.gender}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-2 pl-14 sm:pl-0">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setSelectedPatient(patient)}
                                                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                                <button
                                                    onClick={() => requestDeletePatient(patient.id, patient.name)}
                                                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Delete Patient"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                            <Link
                                                to={`/test?patientId=${patient.id}`}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm active:scale-95"
                                            >
                                                Test Now
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Add Patient Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-transparent dark:border-slate-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Student</h2>
                        <form onSubmit={handleCreatePatient} className="space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={newPatient.name}
                                    onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Age</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={newPatient.age}
                                        onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Gender</label>
                                    <select
                                        className="mt-1 block w-full border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={newPatient.gender}
                                        onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                                    >
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="bg-white dark:bg-slate-800 py-2 px-4 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                                >
                                    Add Student
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Patient Details Modal */}
            {selectedPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity duration-300">
                    <div
                        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-y-auto max-h-[90vh] relative animate-fade-in-up flex flex-col md:flex-row border border-transparent dark:border-slate-700"
                        style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-all duration-200 z-10"
                        >
                            <X size={20} className="text-gray-500 dark:text-slate-400" />
                        </button>

                        {/* Left Sidebar - Profile */}
                        <div className="w-full md:w-[40%] bg-gray-50/50 dark:bg-slate-900/50 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full p-1 border-2 border-blue-500/20 dark:border-blue-500/10 mb-4 flex items-center justify-center relative overflow-hidden bg-white dark:bg-slate-800 shadow-xl shadow-blue-500/5">
                                    {renderAvatar(selectedPatient, '32')}

                                    {/* Upload Overlay - Teachers Only */}
                                    {isTeacher && (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 rounded-full backdrop-blur-[2px]">
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
                                                onChange={(e) => handlePhotoUpload(e, selectedPatient.id)}
                                                disabled={uploadingPhoto}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">{selectedPatient.name}</h2>

                            {/* Pink PID Badge - Matches Reference */}
                            <div className="bg-[#d946ef] text-white px-6 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm mb-6">
                                {selectedPatient.pid || 'NO PID'}
                            </div>

                            {/* Remove Photo Button - Only if avatar exists and is teacher */}
                            {isTeacher && selectedPatient.avatar_url && (
                                <button
                                    onClick={() => requestRemovePhoto(selectedPatient.id)}
                                    className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                                >
                                    <Trash2 size={12} />
                                    <span>Remove Photo</span>
                                </button>
                            )}



                        </div>

                        {/* Right Content - Details */}
                        <div className="w-full md:w-[60%] p-6 md:p-10 bg-white dark:bg-slate-800">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 text-white p-1.5 rounded-full">
                                        <User size={16} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personal Information</h3>
                                </div>
                                {!isTeacher && (
                                    <button
                                        onClick={() => setEditMode(!editMode)}
                                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                    >
                                        {editMode ? 'Cancel Edit' : 'Edit Info'}
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleUpdatePatient} className="grid grid-cols-2 gap-y-6 md:gap-y-8 gap-x-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
                                    {editMode ? (
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                            value={selectedPatient.name}
                                            onChange={e => setSelectedPatient({ ...selectedPatient, name: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.name}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Age</p>
                                    {editMode ? (
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                            value={selectedPatient.age || ''}
                                            onChange={e => setSelectedPatient({ ...selectedPatient, age: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.age || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Gender</p>
                                    {editMode ? (
                                        <select
                                            className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                            value={selectedPatient.gender}
                                            onChange={e => setSelectedPatient({ ...selectedPatient, gender: e.target.value })}
                                        >
                                            <option>Male</option>
                                            <option>Female</option>
                                            <option>Other</option>
                                        </select>
                                    ) : (
                                        <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.gender || '-'}</p>
                                    )}
                                </div>


                                <div className="col-span-2">
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Institution Name</p>
                                    <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                                        {selectedPatient.sections?.school_name || 'Not Available'}
                                    </p>
                                    <div className="mt-2 flex items-center text-xs">
                                        <span className="text-gray-400 dark:text-slate-500 font-medium">Class: </span>
                                        <span className="ml-1 font-bold text-blue-600 dark:text-blue-400">{selectedPatient.sections?.name || '-'}</span>
                                    </div>
                                </div>

                                {editMode && (
                                    <div className="col-span-2 pt-4">
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
                                        >
                                            {updating ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                {...confirmModalState} 
                onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))} 
            />
        </div>
    )
}
