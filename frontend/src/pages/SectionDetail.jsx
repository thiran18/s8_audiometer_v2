import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Users, UserPlus, ArrowLeft, Activity, Calendar, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import Loading from '../components/ui/Loading'

export default function SectionDetail() {
    const { sectionId } = useParams()
    const { user, userProfile } = useAuth()
    const isTeacher = userProfile?.role === 'teacher'
    const navigate = useNavigate()
    const [section, setSection] = useState(null)
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [sectionError, setSectionError] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newStudent, setNewStudent] = useState({
        name: '',
        age: '',
        gender: 'Male'
    })

    useEffect(() => {
        if (user && sectionId) {
            fetchSectionData()
        }
    }, [sectionId, user])

    const fetchSectionData = async () => {
        try {
            setLoading(true)
            // Fetch Section Details
            let secQuery = supabase
                .from('sections')
                .select('*')
                .eq('id', sectionId)

            if (isTeacher) {
                secQuery = secQuery.eq('created_by', user.id)
            }

            const { data: sectionData, error: secError } = await secQuery.single()

            if (secError) throw secError
            setSection(sectionData)

            // Fetch Students in this section
            let stuQuery = supabase
                .from('patients')
                .select(`
                    id,
                    pid,
                    name,
                    age,
                    gender,
                    avatar_url,
                    screenings(id, classification, date, clinical_report)
                `)
                .eq('section_id', sectionId)

            if (isTeacher) {
                stuQuery = stuQuery.eq('created_by', user.id)
            }

            const { data: studentsData, error: stuError } = await stuQuery
                .order('name', { ascending: true })

            if (stuError) throw stuError

            const processedStudents = studentsData.map(student => {
                const latest = (student.screenings || []).sort((a, b) => new Date(b.date) - new Date(a.date))[0]
                return {
                    ...student,
                    latestResult: latest?.classification || 'Pending (Untested)',
                    latestResultId: latest?.id,
                    latestDate: latest?.date,
                    reportNeeded: latest && !latest.clinical_report
                }
            })

            setStudents(processedStudents)
        } catch (error) {
            console.error('Error fetching section details:', error)
            setSectionError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAddStudent = async (e) => {
        e.preventDefault()
        try {
            const { data, error } = await supabase
                .from('patients')
                .insert({
                    name: newStudent.name,
                    age: parseInt(newStudent.age) || null,
                    gender: newStudent.gender,
                    section_id: sectionId,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error

            setShowAddModal(false)
            setNewStudent({ name: '', age: '', gender: 'Male' })
            fetchSectionData()
        } catch (error) {
            alert('Error adding student: ' + error.message)
        }
    }


    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
        const s = status.toLowerCase()
        if (s.includes('normal') || s.includes('grade 0')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        if (s.includes('mild')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        if (s.includes('pending')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    }

    if (loading) return <div className="h-full flex items-center justify-center"><Loading /></div>
    if (!section) return <div className="p-8 text-center text-red-500">Section not found.</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{section.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        {section.school_name} • {students.length} Students
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Class Roll</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition font-medium text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Student</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="min-w-full">
                    {/* Header - Hidden on Mobile */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                        <div className="col-span-4">Student Name</div>
                        <div className="col-span-3">Details</div>
                        <div className="col-span-3">Latest Test</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {sectionError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-l-4 border-red-500">
                                <p className="font-bold">Error loading data</p>
                                <p>{sectionError}</p>
                                <p className="text-sm mt-1">If this says "Column does not exist", please run the <code>migrations_add_pid.sql</code> in Supabase.</p>
                            </div>
                        )}
                        {!sectionError && students.length > 0 ? students.map((stu) => (
                            <div key={stu.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors p-4 md:px-6 md:py-4">
                                <div className="flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center gap-6">
                                    {/* Name Column */}
                                    <div className="md:col-span-4 flex items-center space-x-3">
                                        <div className="w-10 h-10 md:w-8 md:h-8 rounded-full border-2 border-blue-500/10 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                            {stu.avatar_url ? (
                                                <img src={stu.avatar_url} alt={stu.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-blue-600 dark:text-blue-400">{stu.name[0]}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-gray-900 dark:text-white block truncate">{stu.name}</span>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-1.5 py-0.5 rounded shrink-0">{stu.pid || 'No PID'}</span>
                                                <span className="md:hidden text-xs text-gray-500 dark:text-slate-400">{stu.age}y • {stu.gender}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Column - Desktop only */}
                                    <div className="hidden md:block md:col-span-3 text-sm text-gray-500 dark:text-slate-400">
                                        {stu.age}y • {stu.gender}
                                    </div>

                                    {/* Latest Test Column */}
                                    <div className="md:col-span-3 flex md:flex-col items-center md:items-start justify-between md:justify-center">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 md:hidden">Latest Status</span>
                                        <div className="flex flex-col items-end md:items-start">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(stu.latestResult)}`}>
                                                {stu.latestResult}
                                            </span>
                                            {stu.reportNeeded && (
                                                <span className="mt-1 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold px-2 py-0.5 rounded-full">
                                                    Report Needed
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions Column */}
                                    <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 md:pt-0 md:border-t-0">
                                        <div className="flex items-center gap-2">
                                            {stu.latestResultId && (
                                                <Link
                                                    to={`/results/${stu.latestResultId}`}
                                                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="View Results"
                                                >
                                                    <Activity size={18} />
                                                </Link>
                                            )}
                                        </div>
                                        <Link
                                            to={`/test?patientId=${stu.id}`}
                                            className="bg-blue-600 dark:bg-blue-500 text-white md:bg-blue-50 dark:md:bg-blue-900/30 md:text-blue-600 dark:md:text-blue-400 px-4 py-2.5 md:px-3 md:py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 dark:md:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1 flex-1 md:flex-none shadow-sm md:shadow-none"
                                        >
                                            <span>Start Test</span>
                                            <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 italic">
                                No students added to this section yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 dark:border-slate-800">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Student</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">✕</button>
                        </div>
                        <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Student Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    placeholder="Enter name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Age</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600"
                                        value={newStudent.age}
                                        onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                                        placeholder="Age"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Gender</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                        value={newStudent.gender}
                                        onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none"
                                >
                                    Save Student
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
