import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Edit2, Trash2, Eye, Download, ThumbsUp, MoreVertical, FileText, TrendingUp } from 'lucide-react';
import { documents, currentUser } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';

const myDocs = documents.filter(d => d.uploadedBy.id === currentUser.id);

const statCards = [
  { label: 'Total Uploads', value: myDocs.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Total Views', value: myDocs.reduce((a, d) => a + d.views, 0).toLocaleString(), icon: Eye, color: 'text-teal-600', bg: 'bg-teal-50' },
  { label: 'Total Downloads', value: myDocs.reduce((a, d) => a + d.downloads, 0).toLocaleString(), icon: Download, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Total Likes', value: myDocs.reduce((a, d) => a + d.likes, 0).toLocaleString(), icon: ThumbsUp, color: 'text-rose-600', bg: 'bg-rose-50' },
];

export default function MyDocuments() {
  const [filter, setFilter] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = myDocs.filter(d => filter === 'all' || d.status === filter);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
          <p className="text-slate-500 text-sm mt-0.5">{myDocs.length} documents uploaded</p>
        </div>
        <Link to="/upload" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Upload New
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {['all', 'approved', 'pending', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all">
            {/* Cover */}
            <div className={`w-16 h-16 bg-gradient-to-br ${doc.coverColor} rounded-xl flex-shrink-0 flex items-center justify-center`}>
              <FileText className="w-6 h-6 text-white/80" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={doc.status} />
                <span className="text-xs text-slate-400">{doc.category}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">{doc.course}</span>
              </div>
              <h3 className="font-semibold text-slate-900 truncate">{doc.title}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{doc.pages} pages · {doc.fileSize} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex items-center gap-5">
              {[
                { icon: Eye, value: doc.views.toLocaleString(), label: 'views' },
                { icon: Download, value: doc.downloads.toLocaleString(), label: 'downloads' },
                { icon: ThumbsUp, value: doc.likes, label: 'likes' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-semibold">{s.value}</span>
                    </div>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 relative">
              <Link to={`/document/${doc.id}`} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors">
                <Eye className="w-4 h-4" />
              </Link>
              <Link to={`/edit/${doc.id}`} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors">
                <Edit2 className="w-4 h-4" />
              </Link>
              <button className="p-2 hover:bg-red-50 rounded-xl text-slate-500 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">No {filter === 'all' ? '' : filter} documents</h3>
            <p className="text-slate-500 text-sm mb-4">Upload your first document to get started</p>
            <Link to="/upload" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Upload Document
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
