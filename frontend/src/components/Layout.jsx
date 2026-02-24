import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
    LayoutDashboard,
    Users,
    Activity,
    Settings,
    LogOut,
    Menu,
    X,
    BookOpen
} from 'lucide-react'

export default function Layout() {
    const { signOut, user, userProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    // Role-based navigation items
    const isTeacher = userProfile?.role === 'teacher'

    const navItems = [
        { name: 'Dashboard', path: isTeacher ? '/teacher-dashboard' : '/dashboard', icon: LayoutDashboard },
        { name: isTeacher ? 'Students' : 'Patients', path: '/patients', icon: Users },
        { name: 'Screening', path: '/test', icon: Activity },
        { name: 'Settings', path: '/settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
                <div className="p-6 flex items-center space-x-3">
                    <div className="w-10 h-10">
                        <img src="/newLOGO.png" alt="HearPulse Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">HearPulse</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Desktop Header with User Profile */}
                <header className="hidden md:flex bg-white border-b border-gray-200 items-center justify-end px-8 py-3">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                                <div className="flex items-center space-x-1">
                                    {isTeacher && <BookOpen className="w-3 h-3 text-gray-400" />}
                                    <p className="text-xs text-gray-500 capitalize">{userProfile?.role || 'User'}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b border-gray-200 flex items-center justify-between p-4 sticky top-0 z-40">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8">
                            <img src="/newLOGO.png" alt="HearPulse Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-lg font-bold text-gray-900">HearPulse</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 -mr-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-white overflow-y-auto">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8">
                                        <img src="/newLOGO.png" alt="HearPulse Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-lg font-bold">Menu</span>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 p-4">
                                <nav className="space-y-2">
                                    {navItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive = location.pathname === item.path
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center space-x-4 p-4 rounded-xl transition-colors ${isActive
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                                <span className="text-lg font-semibold">{item.name}</span>
                                            </Link>
                                        )
                                    })}
                                </nav>

                                <div className="mt-8 pt-8 border-t border-gray-100 space-y-4 px-2">
                                    <div className="flex items-center space-x-3 py-2">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                                            {user?.email?.[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                                            <p className="text-xs text-gray-500 capitalize">{userProfile?.role || 'User'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center space-x-4 p-4 w-full text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-6 h-6" />
                                        <span className="text-lg font-bold">Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
