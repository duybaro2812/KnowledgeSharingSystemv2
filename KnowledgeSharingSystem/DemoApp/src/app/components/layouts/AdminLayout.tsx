import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import {
  Settings, LayoutDashboard, Users, FileText,
  Folder, Activity, Bell, LogOut, Menu, X, BookOpen, Key
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { users } from '../../data/mockData';

const navItems = [
  { to: '/admin',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',      icon: Users,           label: 'User Management' },
  { to: '/admin/categories', icon: Folder,          label: 'Categories' },
  { to: '/admin/audit',      icon: Activity,        label: 'Audit Logs' },
];

const admin = users[5];

export default function AdminLayout() {
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
        bg-gradient-to-b from-indigo-950 to-slate-900
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Key className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold">NeoShare</span>
            <p className="text-violet-400 text-xs font-medium">Admin</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin profile */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar initials={admin.initials} color={admin.avatarColor} size="md" />
            <div>
              <p className="text-white font-medium text-sm">{admin.name}</p>
              <span className="text-xs text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full">Administrator</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 mb-2">Management</p>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all text-sm ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-6">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 mb-2">Quick Access</p>
            <Link to="/moderator" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm">
              <Settings className="w-4 h-4" />
              Moderation
            </Link>
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm">
              <BookOpen className="w-4 h-4" />
              View Platform
            </Link>
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <Link to="/auth/signin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-slate-900">Admin Control Panel</h1>
            <p className="text-xs text-slate-500">Full system access and management</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
              <Bell className="w-4 h-4 text-slate-600" />
            </button>
            <Avatar initials={admin.initials} color={admin.avatarColor} size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
