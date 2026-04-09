import { FileCheck, MessageSquare, Award, Flag, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { documents, comments, reports, plagiarismAlerts, pointEvents } from '../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const weeklyData = [
  { day: 'Mon', approved: 8, rejected: 2, pending: 3 },
  { day: 'Tue', approved: 12, rejected: 1, pending: 5 },
  { day: 'Wed', approved: 6, rejected: 3, pending: 2 },
  { day: 'Thu', approved: 14, rejected: 0, pending: 8 },
  { day: 'Fri', approved: 10, rejected: 2, pending: 4 },
  { day: 'Sat', approved: 5, rejected: 1, pending: 1 },
  { day: 'Sun', approved: 3, rejected: 0, pending: 2 },
];

const statCards = [
  { label: 'Pending Docs', value: 4, icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', link: '/moderator/documents' },
  { label: 'Pending Comments', value: 7, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', link: '/moderator/comments' },
  { label: 'Point Events', value: 3, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', link: '/moderator/points' },
  { label: 'Reports', value: reports.filter(r => r.status === 'pending').length, icon: Flag, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', link: '/moderator/reports' },
  { label: 'Plagiarism Alerts', value: plagiarismAlerts.filter(p => p.status === 'pending').length, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', link: '/moderator/plagiarism' },
];

const recentActivity = [
  { action: 'Approved', target: 'Advanced Algorithms (d1)', time: '2h ago', type: 'approve' },
  { action: 'Rejected', target: 'Constitutional Law (d10) – Copyright', time: '3h ago', type: 'reject' },
  { action: 'Comment Removed', target: 'Spam comment on Organic Chemistry', time: '5h ago', type: 'reject' },
  { action: 'Points Approved', target: '+10 pts for Alex Chen upload', time: '6h ago', type: 'approve' },
  { action: 'Plagiarism Flagged', target: 'Philosophy of Mind – 78% match', time: '8h ago', type: 'flag' },
  { action: 'Approved', target: 'Quantum Mechanics (d3)', time: '1d ago', type: 'approve' },
];

export default function ModDashboard() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Moderation Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Overview of platform content needing review.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm p-4 hover:shadow-md transition-all cursor-pointer`}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Weekly Moderation Activity
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px #0001' }} />
              <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recent Actions
          </h2>
          <div className="space-y-3">
            {recentActivity.map((act, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  act.type === 'approve' ? 'bg-emerald-100' : act.type === 'reject' ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  {act.type === 'approve' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    : act.type === 'reject' ? <XCircle className="w-3.5 h-3.5 text-red-600" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{act.action}</p>
                  <p className="text-xs text-slate-500 truncate">{act.target}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
