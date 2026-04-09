import { Activity, Lock, Trash2, Shield, Award, Folder, User, ChevronDown, Search } from 'lucide-react';
import { auditLogs } from '../../data/mockData';

const actionIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'User Locked':      { icon: Lock,    color: 'text-red-600',    bg: 'bg-red-50' },
  'Document Deleted': { icon: Trash2,  color: 'text-red-600',    bg: 'bg-red-50' },
  'Role Changed':     { icon: Shield,  color: 'text-purple-600', bg: 'bg-purple-50' },
  'Points Granted':   { icon: Award,   color: 'text-amber-600',  bg: 'bg-amber-50' },
  'Category Created': { icon: Folder,  color: 'text-blue-600',   bg: 'bg-blue-50' },
  'User Deleted':     { icon: User,    color: 'text-red-600',    bg: 'bg-red-50' },
};

export default function AuditLogs() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Audit Logs
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Complete record of admin actions on the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search logs…" className="w-full border border-slate-200 bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
        </div>
        <button className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm text-slate-600 shadow-sm">
          Filter by action <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
        <button className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm text-slate-600 shadow-sm">
          Date range <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Action</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Admin</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Target</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Details</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => {
              const cfg = actionIcons[log.action] ?? { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100' };
              const Icon = cfg.icon;
              return (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{log.adminName}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 font-medium">{log.target}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 max-w-xs truncate">{log.details}</td>
                  <td className="px-5 py-4 text-right text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
