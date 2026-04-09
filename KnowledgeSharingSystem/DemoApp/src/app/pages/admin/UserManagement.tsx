import { useState } from 'react';
import { Users, Search, Lock, Unlock, Trash2, Edit2, Shield, User, ChevronDown, Plus, Award } from 'lucide-react';
import { users } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [locks, setLocks] = useState<Set<string>>(new Set(users.filter(u => u.isLocked).map(u => u.id)));
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [grantPoints, setGrantPoints] = useState<string | null>(null);
  const [points, setPoints] = useState('');

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleLock = (id: string) => {
    const next = new Set(locks);
    if (next.has(id)) next.delete(id); else next.add(id);
    setLocks(next);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} registered users</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full border border-slate-200 bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
        </div>
        <div className="flex gap-2">
          {['all', 'user', 'moderator', 'admin'].map(role => (
            <button key={role} onClick={() => setRoleFilter(role)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${roleFilter === role ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">User</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">University</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Points</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Status</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const isLocked = locks.has(user.id);
                return (
                  <tr key={user.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isLocked ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={user.initials} color={user.avatarColor} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        user.role === 'moderator' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>{user.role}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.university}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-bold text-slate-900">{user.points}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isLocked
                        ? <StatusBadge status="locked" />
                        : <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Active</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Grant points */}
                        {grantPoints === user.id ? (
                          <div className="flex items-center gap-1.5">
                            <input type="number" value={points} onChange={e => setPoints(e.target.value)} placeholder="pts"
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
                            <button onClick={() => { setGrantPoints(null); setPoints(''); }}
                              className="bg-amber-500 text-white rounded-lg px-2 py-1 text-xs hover:bg-amber-600">Grant</button>
                            <button onClick={() => setGrantPoints(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setGrantPoints(user.id)}
                              className="w-8 h-8 flex items-center justify-center border border-amber-200 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                              title="Grant points">
                              <Award className="w-3.5 h-3.5" />
                            </button>
                            {/* Role toggle */}
                            <button className="w-8 h-8 flex items-center justify-center border border-purple-200 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors" title="Change role">
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            {/* Lock toggle */}
                            <button onClick={() => toggleLock(user.id)}
                              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-colors ${isLocked ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'}`}
                              title={isLocked ? 'Unlock' : 'Lock'}>
                              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                            {/* Delete */}
                            <button className="w-8 h-8 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
