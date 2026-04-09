import { useState } from 'react';
import { FileCheck, Eye, CheckCircle, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { documents } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

const pending = documents.filter(d => d.status === 'pending');
const allForReview = [...pending, ...documents.slice(0, 2).map(d => ({ ...d, status: 'pending' as const }))];

export default function PendingDocuments() {
  const [selected, setSelected] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [showRejectReason, setShowRejectReason] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const decide = (id: string, action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !showRejectReason) {
      setShowRejectReason(id);
      return;
    }
    setDecisions(prev => ({ ...prev, [id]: action }));
    setShowRejectReason(null);
    setReason('');
  };

  const docs = allForReview.filter(d => !decisions[d.id]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Pending Documents
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{docs.length} documents awaiting review</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Sort by:</span>
          <button className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm">
            Newest First <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {docs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">All caught up!</h3>
          <p className="text-slate-500 text-sm">No documents pending review.</p>
        </div>
      )}

      <div className="space-y-3">
        {docs.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${doc.coverColor} rounded-xl flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{doc.category} · {doc.course} · {doc.pages} pages · {doc.fileSize}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setSelected(selected === doc.id ? null : doc.id)}
                        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{doc.description}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={doc.uploadedBy.initials} color={doc.uploadedBy.avatarColor} size="xs" />
                      <span className="text-sm text-slate-700">{doc.uploadedBy.name}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{doc.uploadedBy.university}</span>
                    </div>
                    <span className="text-xs text-slate-400 ml-auto">Submitted {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reject reason input */}
            {showRejectReason === doc.id && (
              <div className="px-5 pb-4 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-2 mt-3">Rejection reason (visible to uploader):</p>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. This content appears to be from a published textbook..."
                  className="w-full border border-red-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none bg-red-50" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowRejectReason(null)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm">Cancel</button>
                  <button onClick={() => decide(doc.id, 'rejected')} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700">Confirm Rejection</button>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {doc.tags.map(tag => (
                  <span key={tag} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => decide(doc.id, 'rejected')}
                  className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => decide(doc.id, 'approved')}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
