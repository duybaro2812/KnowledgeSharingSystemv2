import { useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, EyeOff } from 'lucide-react';
import { comments, documents } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

const pendingComments = [
  ...comments.filter(c => c.status === 'pending'),
  ...comments[0].replies.filter(r => r.status === 'pending'),
  // Simulate more
  { ...comments[2], id: 'c-fake1', content: 'WHERE IS THE ANSWERS TO ALL THESE QUESTIONS lol someone help', status: 'pending' as const, likes: 0, author: { ...comments[2].author, id: 'u99', name: 'New User', initials: 'NU', avatarColor: '#64748B' } },
  { ...comments[2], id: 'c-fake2', content: 'Buy cheap essay services at fastessays.xyz – guarantee A+ results!', status: 'pending' as const, likes: 0 },
];

export default function PendingComments() {
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected' | 'hidden'>>({});

  const decide = (id: string, action: 'approved' | 'rejected' | 'hidden') => {
    setDecisions(prev => ({ ...prev, [id]: action }));
  };

  const pending = pendingComments.filter(c => !decisions[c.id]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          Pending Comments
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">{pending.length} comments awaiting moderation</p>
      </div>

      {pending.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="font-medium text-slate-900">No comments pending review!</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map(comment => {
          const doc = documents.find(d => d.id === comment.documentId);
          return (
            <div key={comment.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar initials={comment.author.initials} color={comment.author.avatarColor} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-900">{comment.author.name}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">on "{doc?.title}"</span>
                      <StatusBadge status="pending" />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-sm text-slate-800 leading-relaxed">{comment.content}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-end gap-2">
                <button onClick={() => decide(comment.id, 'hidden')}
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                  <EyeOff className="w-3.5 h-3.5" /> Hide
                </button>
                <button onClick={() => decide(comment.id, 'rejected')}
                  className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Remove
                </button>
                <button onClick={() => decide(comment.id, 'approved')}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
