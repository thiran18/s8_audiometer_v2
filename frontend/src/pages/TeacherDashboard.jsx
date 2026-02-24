import React, { useEffect, useState } from 'react'
import { Plus, BookOpen, ChevronRight, School, Users, History, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Loading from '../components/ui/Loading'

export default function TeacherDashboard() {
    const { user, userProfile } = useAuth()
    const [sections, setSections] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newSection, setNewSection] = useState({
        name: '',
        strength: '',
        schoolName: ''
    })
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (user) {
            fetchSections()
        }
        if (userProfile?.school_name) {
            setNewSection(prev => ({ ...prev, schoolName: userProfile.school_name }))
        }
    }, [user, userProfile])

    const fetchSections = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('sections')
                .select(`
                    *,
                    patients(id)
                `)
                .eq('created_by', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setSections(data)
        } catch (error) {
            console.error('Error fetching sections:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSection = async (e) => {
        e.preventDefault()
        try {
            const { error } = await supabase
                .from('sections')
                .insert({
                    name: newSection.name,
                    strength: parseInt(newSection.strength) || 0,
                    school_name: newSection.schoolName || userProfile?.school_name || 'My School',
                    created_by: user.id
                })

            if (error) throw error

            setShowAddModal(false)
            setNewSection({ name: '', strength: '', schoolName: userProfile?.school_name || '' })
            fetchSections()
        } catch (error) {
            alert('Error creating section: ' + error.message)
        }
    }

    const filteredSections = sections.filter(section =>
        section.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="h-full flex items-center justify-center"><Loading /></div>

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Teacher Panel</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage My Classes</h1>
                    <p className="text-sm text-gray-500 mt-1">{userProfile?.school_name}</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3.5 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 font-bold w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create New Section</span>
                </button>
            </div>

            {/* Search Bar - Full width on mobile */}
            <div className="relative w-full sm:max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                    placeholder="Search classes by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Sections Grid - Responsive cols */}
            {filteredSections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSections.map((section) => (
                        <Link
                            key={section.id}
                            to={`/section/${section.id}`}
                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                            <div className="relative">
                                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                                    <School className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{section.name}</h3>
                                <div className="flex items-center space-x-4 text-xs font-medium text-gray-400">
                                    <div className="flex items-center space-x-1">
                                        <Users className="w-3 h-3" />
                                        <span>{section.patients?.length || 0} Registered</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <History className="w-3 h-3" />
                                        <span>Capacity: {section.strength || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center text-blue-600 text-sm font-bold opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
                                    <span>Manage Students</span>
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {searchTerm ? 'No matching classes found' : 'No sections created yet'}
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first class section to start registering students for hearing tests.'}
                    </p>
                    {searchTerm ? (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold text-gray-900 hover:bg-gray-50 transition shadow-sm"
                        >
                            Clear Search
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold text-gray-900 hover:bg-gray-50 transition shadow-sm"
                        >
                            Get Started
                        </button>
                    )}
                </div>
            )}

            {/* Create Section Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-900">New Section</h3>
                            <p className="text-gray-500 mt-1">Create a class or group for tracking</p>
                        </div>
                        <form onSubmit={handleCreateSection} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Section Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={newSection.name}
                                    onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                                    placeholder="e.g. Class 10-A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Institution Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={newSection.schoolName}
                                    onChange={(e) => setNewSection({ ...newSection, schoolName: e.target.value })}
                                    placeholder="Enter school name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Student Strength (Approx)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={newSection.strength}
                                    onChange={(e) => setNewSection({ ...newSection, strength: e.target.value })}
                                    placeholder="e.g. 40"
                                />
                            </div>
                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100"
                                >
                                    Create Section
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
