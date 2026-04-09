import { Users, FileText, Award, TrendingUp, Activity, Shield, AlertTriangle } from 'lucide-react';
import { users, documents, pointEvents } from '../../data/mockData';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const roleData = [
  { name: 'Users', value: users.filter(u => u.role === 'user').length, color: '#2563EB' },
  { name: 'Moderators', value: users.filter(u => u.role === 'moderator').length, color: '#0D9488' },
  { name: 'Admins', value: users.filter(u => u.role === 'admin').length, color: '#7C3AED' },
];

const statusData = [
  { name: 'Approved', value: documents.filter(d => d.status === 'approved').length, color: '#10B981' },
  { name: 'Pending', value: documents.filter(d => d.status === 'pending').length, color: '#F59E0B' },
  { name: 'Rejected', value: documents.filter(d => d.status === 'rejected').length, color: '#EF4444' },
];

const growthData = [
  { month: 'Oct', users: 120, docs: 340 },
  { month: 'Nov', users: 185, docs: 520 },
  { month: 'Dec', users: 240, docs: 680 },
  { month: 'Jan', users: 320, docs: 890 },
  { month: 'Feb', users: 410, docs: 1120 },
  { month: 'Mar', users: 520, docs: 1380 },
];

const statCards = [
  { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12% this month' },
  { label: 'Documents', value: documents.length, icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', trend: '+8% this month' },
  { label: 'Total Points Awarded', value: '2,840', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+15% this month' },
  { label: 'Active Today', value: 143, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'Real-time' },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Full platform overview and management.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{s.trend}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Platform Growth
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Legend />
              <Line type="monotone" dataKey="users" name="Users" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 3 }} />
              <Line type="monotone" dataKey="docs" name="Documents" stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Role distribution */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            User Roles
          </h2>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {roleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {roleData.map(r => (
              <div key={r.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-sm text-slate-600">{r.name}</span>
                <span className="ml-auto text-sm font-semibold text-slate-900">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Doc status breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-4">Document Status Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          {statusData.map(s => (
            <div key={s.name} className="text-center p-4 rounded-2xl" style={{ backgroundColor: `${s.color}12`, border: `1px solid ${s.color}30` }}>
              <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-sm text-slate-600 mt-1">{s.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Needs Attention</h3>
          </div>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>• 1 user account flagged for excessive violations</li>
            <li>• 2 plagiarism alerts require admin review</li>
            <li>• 3 pending point events awaiting approval</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">System Health</h3>
          </div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• ✓ Moderation queue: 17 items</li>
            <li>• ✓ Platform uptime: 99.9%</li>
            <li>• ✓ Storage used: 42% of quota</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
