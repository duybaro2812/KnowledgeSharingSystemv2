import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { plagiarismAlerts } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

export default function PlagiarismAlerts() {
  const [decisions, setDecisions] = useState<Record<string, 'approved_anyway' | 'rejected'>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const runCheck = (id: string) => {
    setRunning(id);
    setTimeout(() => {
      setRunning(null);
      setChecked(prev => new Set([...prev, id]));
    }, 2000);
  };

  const decide = (id: string, action: 'approved_anyway' | 'rejected') => {
    setDecisions(prev => ({ ...prev, [id]: action }));
  };

  const matchColor = (pct: number) => {
    if (pct >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (pct >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Plagiarism Alerts
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Documents flagged by the duplicate detection system.</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: '< 40% match – Low risk', color: 'bg-emerald-100 text-emerald-700' },
          { label: '40-69% match – Review carefully', color: 'bg-amber-100 text-amber-700' },
          { label: '70%+ match – High plagiarism risk', color: 'bg-red-100 text-red-700' },
        ].map(l => (
          <span key={l.label} className={`text-xs px-3 py-1.5 rounded-full font-medium ${l.color}`}>{l.label}</span>
        ))}
      </div>

      <div className="space-y-4">
        {plagiarismAlerts.map(alert => {
          const resolved = decisions[alert.id] || (alert.status !== 'pending' ? alert.status : null);
          const hasRun = checked.has(alert.id) || alert.status !== 'pending';
          const isRunning = running === alert.id;

          return (
            <div key={alert.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              resolved === 'rejected' ? 'border-red-200' :
              resolved === 'approved_anyway' ? 'border-amber-200' :
              'border-slate-200/80'
            }`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{alert.documentTitle}</span>
                      {resolved && <StatusBadge status={resolved} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar initials={alert.uploadedBy.initials} color={alert.uploadedBy.avatarColor} size="xs" />
                      <span className="text-sm text-slate-500">by {alert.uploadedBy.name}</span>
                    </div>
                  </div>

                  {/* Match % Badge */}
                  <div className={`text-center px-4 py-2.5 rounded-2xl border text-sm font-bold ${matchColor(alert.matchPercent)}`}>
                    <div className="text-2xl font-extrabold">{alert.matchPercent}%</div>
                    <div className="text-xs font-normal opacity-80">similarity</div>
                  </div>
                </div>

                {/* Similar doc */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Similar to:</p>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-800">{alert.similarDocTitle}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                  </div>
                </div>

                {/* Similarity bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Similarity</span>
                    <span>{alert.matchPercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${alert.matchPercent >= 70 ? 'bg-red-500' : alert.matchPercent >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${alert.matchPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {!resolved && (
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center gap-3">
                  <p className="text-xs text-slate-500 flex-1">Submitted {new Date(alert.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-2">
                    {!hasRun && (
                      <button onClick={() => runCheck(alert.id)}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-blue-100 disabled:opacity-60 transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                        {isRunning ? 'Checking…' : 'Run Duplicate Check'}
                      </button>
                    )}
                    {hasRun && (
                      <>
                        <button onClick={() => decide(alert.id, 'approved_anyway')}
                          className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" /> Approve Anyway
                        </button>
                        <button onClick={() => decide(alert.id, 'rejected')}
                          className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
