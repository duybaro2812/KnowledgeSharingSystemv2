import { useState } from 'react';
import { Link, Outlet, useLocation, NavLink } from 'react-router';
import {
  Home, BookOpen, Upload, Library, User, Trophy, Bell, LogOut,
  Search, ChevronDown, Star, Users, FileText, Plus, Settings,
  MessageCircle, Folder, Menu, X, Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { NotificationPanel } from '../common/NotificationPanel';

const navItems = [
  { to: '/',               icon: Home,          label: 'Home' },
  { to: '/browse',         icon: BookOpen,      label: 'Browse' },
  { to: '/my-documents',   icon: FileText,      label: 'My Documents' },
  { to: '/library',        icon: Library,       label: 'My Library' },
  { to: '/qa',             icon: MessageCircle, label: 'Q&A Sessions' },
  { to: '/points',         icon: Trophy,        label: 'Points' },
  { to: '/notifications',  icon: Bell,          label: 'Notifications' },
  { to: '/profile',        icon: User,          label: 'Profile' },
];

function PointsIndicator({ points }: { points: number }) {
  let tier = { label: 'Starter', color: 'text-slate-500', bg: 'bg-slate-100', ring: 'ring-slate-200' };
  if (points >= 40) tier = { label: 'Full Access', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
  else if (points >= 30) tier = { label: 'Reader', color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' };
  
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${tier.bg} ring-1 ${tier.ring}`}>
      <Trophy className={`w-3.5 h-3.5 ${tier.color}`} />
      <span className={`text-sm font-semibold ${tier.color}`}>{points}</span>
      <span className={`text-xs ${tier.color} opacity-70`}>{tier.label}</span>
    </div>
  );
}

export default function UserLayout() {
  const { user, notifCount } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200/80 shadow-sm z-40
        flex flex-col transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">NeoShare</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <Avatar initials={user.initials} color={user.avatarColor} size="lg" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{user.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'moderator' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Points */}
          <PointsIndicator points={user.points} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Followers', value: user.followers },
              { label: 'Uploads',   value: user.uploads },
              { label: 'Upvotes',   value: user.upvotes },
            ].map(stat => (
              <div key={stat.label} className="text-center bg-slate-50 rounded-lg py-2">
                <p className="text-sm font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Button */}
        <div className="px-4 py-3">
          <Link
            to="/upload"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md text-sm"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {item.label === 'Notifications' && notifCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {notifCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-100">
          <Link
            to="/auth/signin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200/80 px-4 lg:px-8 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents, courses, topics…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Points Quick View */}
            <div className="hidden md:flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">{user.points}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {notifCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>

            {/* Avatar */}
            <Link to="/profile">
              <Avatar initials={user.initials} color={user.avatarColor} size="sm" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
