import { useState } from 'react';
import { Flag, CheckCircle, XCircle, Eye } from 'lucide-react';
import { reports } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

export default function Reports() {
  const [decisions, setDecisions] = useState<Record<string, 'reviewed' | 'dismissed'>>({});

  const decide = (id: string, action: 'reviewed' | 'dismissed') => {
    setDecisions(prev => ({ ...prev, [id]: action }));
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Flag className="w-5 h-5 text-red-500" />
          Document Reports
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">User-reported content for review.</p>
      </div>

      <div className="space-y-4">
        {reports.map(report => {
          const status = decisions[report.id] ?? report.status;
          return (
            <div key={report.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${status === 'pending' ? 'border-red-200' : 'border-slate-200/80'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{report.documentTitle}</h3>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium">{report.reason}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
                  <p className="text-sm text-slate-700 leading-relaxed">"{report.details}"</p>
                </div>

                <div className="flex items-center gap-2">
                  <Avatar initials={report.reportedBy.initials} color={report.reportedBy.avatarColor} size="xs" />
                  <span className="text-sm text-slate-500">Reported by <span className="font-medium text-slate-700">{report.reportedBy.name}</span></span>
                </div>
              </div>

              {status === 'pending' && (
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
                  <button onClick={() => decide(report.id, 'dismissed')}
                    className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-sm hover:bg-slate-100">
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </button>
                  <button onClick={() => decide(report.id, 'reviewed')}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-red-700 shadow-sm">
                    <Eye className="w-3.5 h-3.5" /> Take Action
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
