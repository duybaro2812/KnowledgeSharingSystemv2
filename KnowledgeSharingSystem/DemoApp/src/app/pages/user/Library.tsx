import { useState } from 'react';
import { Link } from 'react-router';
import { Bookmark, Trash2, Eye, Clock } from 'lucide-react';
import { documents } from '../../data/mockData';
import { DocumentCard } from '../../components/common/DocumentCard';

const savedDocs = documents.filter(d => d.isSaved);
const recentDocs = documents.slice(0, 5);

export default function Library() {
  const [tab, setTab] = useState<'saved' | 'recent'>('saved');

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Library</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your saved documents and reading history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { key: 'saved', label: 'Saved', icon: Bookmark, count: savedDocs.length },
          { key: 'recent', label: 'Recently Viewed', icon: Clock, count: recentDocs.length },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'saved' ? (
        savedDocs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">No saved documents</h3>
            <p className="text-slate-500 text-sm mb-4">Save documents to read them later</p>
            <Link to="/browse" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              Browse Documents
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {savedDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {recentDocs.map((doc, i) => (
            <Link key={doc.id} to={`/document/${doc.id}`}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all block">
              <div className={`w-14 h-14 bg-gradient-to-br ${doc.coverColor} rounded-xl flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{doc.title}</h3>
                <p className="text-sm text-slate-500">{doc.category} · {doc.course}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {i === 0 ? '2 hours ago' : i === 1 ? 'Yesterday' : `${i + 1} days ago`}
              </div>
              <Eye className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
