import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import {
  Shield, LayoutDashboard, FileCheck, MessageSquare, Award,
  Flag, AlertTriangle, BarChart2, Bell, LogOut, Menu, X, BookOpen
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { users } from '../../data/mockData';

const navItems = [
  { to: '/moderator',            icon: LayoutDashboard, label: 'Dashboard',        badge: null },
  { to: '/moderator/documents',  icon: FileCheck,       label: 'Pending Docs',     badge: '4' },
  { to: '/moderator/comments',   icon: MessageSquare,   label: 'Pending Comments', badge: '7' },
  { to: '/moderator/points',     icon: Award,           label: 'Point Events',     badge: '3' },
  { to: '/moderator/reports',    icon: Flag,            label: 'Reports',          badge: '2' },
  { to: '/moderator/plagiarism', icon: AlertTriangle,   label: 'Plagiarism Alerts',badge: '1' },
];

const moderator = users[4];

export default function ModeratorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-40 flex flex-col
        bg-gradient-to-b from-slate-900 to-slate-800
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold">NeoShare</span>
            <p className="text-teal-400 text-xs font-medium">Moderator</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Moderator profile */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar initials={moderator.initials} color={moderator.avatarColor} size="md" />
            <div>
              <p className="text-white font-medium text-sm">{moderator.name}</p>
              <span className="text-xs text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full">Moderator</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 mb-2">Moderation</p>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.to === '/moderator' ? location.pathname === '/moderator' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all text-sm ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 font-medium border border-teal-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{item.badge}</span>
                )}
              </Link>
            );
          })}

          <div className="mt-6">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 mb-2">Platform</p>
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm">
              <BookOpen className="w-4 h-4" />
              View Platform
            </Link>
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10">
          <Link to="/auth/signin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-slate-900">Moderation Center</h1>
            <p className="text-xs text-slate-500">Review and manage platform content</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-medium">17 items pending</span>
            </div>
            <button className="relative w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">5</span>
            </button>
            <Avatar initials={moderator.initials} color={moderator.avatarColor} size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
