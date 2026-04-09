import { useState } from 'react';
import { Award, CheckCircle, XCircle } from 'lucide-react';
import { pointEvents } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Avatar } from '../../components/common/Avatar';
import { users } from '../../data/mockData';

export default function PointEvents() {
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});

  const decide = (id: string, action: 'approved' | 'rejected') => {
    setDecisions(prev => ({ ...prev, [id]: action }));
  };

  const pending = pointEvents.filter(e => e.status === 'pending' && !decisions[e.id]);
  const resolved = pointEvents.filter(e => e.status !== 'pending' || decisions[e.id]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Point Events
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">{pending.length} events pending approval</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Pending Approval</h2>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Event</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Points</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(event => {
                  const user = users.find(u => u.id === event.userId);
                  return (
                    <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {user && <Avatar initials={user.initials} color={user.avatarColor} size="xs" />}
                          <span className="text-sm font-medium text-slate-900">{event.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-xs truncate">{event.description}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={event.type} /></td>
                      <td className={`px-5 py-3.5 text-right text-sm font-bold ${event.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {event.points > 0 ? '+' : ''}{event.points}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => decide(event.id, 'rejected')}
                            className="w-7 h-7 flex items-center justify-center bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => decide(event.id, 'approved')}
                            className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">History</h2>
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">User</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Description</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Points</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map(event => {
                const resolvedStatus = decisions[event.id] ?? event.status;
                return (
                  <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{event.userName}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 max-w-xs truncate">{event.description}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={resolvedStatus} /></td>
                    <td className={`px-5 py-3.5 text-right text-sm font-bold ${event.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {event.points > 0 ? '+' : ''}{event.points}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-400">{new Date(event.createdAt).toLocaleDateString()}</td>
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
