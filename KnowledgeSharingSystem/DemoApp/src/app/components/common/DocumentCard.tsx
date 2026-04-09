import { Link } from 'react-router';
import { Eye, Download, ThumbsUp, FileText, Clock } from 'lucide-react';
import { Document } from '../../data/mockData';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';

interface DocumentCardProps {
  doc: Document;
  showStatus?: boolean;
  compact?: boolean;
}

export function DocumentCard({ doc, showStatus = false, compact = false }: DocumentCardProps) {
  return (
    <Link to={`/document/${doc.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
        {/* Cover */}
        <div className={`bg-gradient-to-br ${doc.coverColor} h-32 relative flex items-end p-4`}>
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full border border-white/30">
              <FileText className="w-3 h-3" />
              {doc.pages} pages
            </span>
          </div>
          {showStatus && (
            <div className="absolute top-3 right-3">
              <StatusBadge status={doc.status} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex-shrink-0">
              {doc.category}
            </span>
            <span className="text-xs text-slate-400">{doc.course}</span>
          </div>

          <h3 className="text-slate-900 font-semibold line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors leading-snug">
            {doc.title}
          </h3>

          {!compact && (
            <p className="text-slate-500 text-sm line-clamp-2 mb-3 leading-relaxed">
              {doc.description}
            </p>
          )}

          {/* Author */}
          <div className="flex items-center gap-2 mb-3">
            <Avatar initials={doc.uploadedBy.initials} color={doc.uploadedBy.avatarColor} size="xs" />
            <span className="text-sm text-slate-600 truncate">{doc.uploadedBy.name}</span>
            <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
              <Clock className="w-3 h-3" />
              {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{doc.views.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{doc.downloads.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{doc.likes.toLocaleString()}</span>
            <span className="ml-auto text-slate-400">{doc.fileSize}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
