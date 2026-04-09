import React from "react";
import { useNavigate } from "react-router";
import { Heart, Download, MessageCircle, Bookmark, Star, Clock, FileText } from "lucide-react";

interface DocCardProps {
  doc: {
    id: string;
    title: string;
    description?: string;
    subject: string;
    course?: string;
    category: string;
    pages: number;
    owner: { name: string; avatar: string };
    likes: number;
    downloads: number;
    comments: number;
    saves?: number;
    thumbnail?: string;
    isTrending?: boolean;
    rating?: number;
    status?: string;
    uploadDate?: string;
  };
  variant?: "grid" | "horizontal" | "compact";
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "#ECFDF5", text: "#059669", label: "Approved" },
  pending: { bg: "#FFFBEB", text: "#D97706", label: "Pending" },
  rejected: { bg: "#FEF2F2", text: "#DC2626", label: "Rejected" },
  suspected: { bg: "#FFF7ED", text: "#EA580C", label: "⚠ Suspected" },
};

const categoryColors: Record<string, string> = {
  "Computer Science": "#2563EB",
  Mathematics: "#7C3AED",
  Physics: "#0891B2",
  Chemistry: "#059669",
  Economics: "#D97706",
  Law: "#DC2626",
  Medicine: "#0D9488",
  Literature: "#B45309",
};

export function DocumentCard({ doc, variant = "grid" }: DocCardProps) {
  const navigate = useNavigate();
  const catColor = categoryColors[doc.subject] || "#2563EB";
  const statusInfo = doc.status ? statusColors[doc.status] : null;

  if (variant === "horizontal") {
    return (
      <div
        onClick={() => navigate(`/app/documents/${doc.id}`)}
        className="flex gap-4 bg-white rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-slate-100 min-w-[320px] max-w-[360px] flex-shrink-0"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div
          className="w-20 h-24 rounded-xl flex-shrink-0 overflow-hidden bg-slate-100"
          style={{ background: `linear-gradient(135deg, ${catColor}20, ${catColor}40)` }}
        >
          {doc.thumbnail ? (
            <img src={doc.thumbnail} alt={doc.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText size={28} style={{ color: catColor }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${catColor}15`, color: catColor }}
            >
              {doc.subject}
            </span>
            {doc.isTrending && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 flex-shrink-0">
                🔥 Trending
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 mt-1 leading-snug">{doc.title}</h4>
          <div className="flex items-center gap-2 mt-2">
            <img src={doc.owner.avatar} alt={doc.owner.name} className="w-5 h-5 rounded-full object-cover" />
            <span className="text-xs text-slate-500 truncate">{doc.owner.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Heart size={11} /> {doc.likes}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Download size={11} /> {doc.downloads}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FileText size={11} /> {doc.pages}p
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        onClick={() => navigate(`/app/documents/${doc.id}`)}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <div
          className="w-10 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${catColor}20, ${catColor}40)` }}
        >
          <FileText size={18} style={{ color: catColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{doc.title}</p>
          <p className="text-xs text-slate-500">{doc.subject} · {doc.pages} pages</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-500">
          <Star size={11} fill="#F59E0B" />
          <span className="font-semibold text-slate-700">{doc.rating || "4.5"}</span>
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div
      onClick={() => navigate(`/app/documents/${doc.id}`)}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group border border-slate-100 hover:border-blue-100 transition-all duration-200"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", ":hover": { boxShadow: "0 8px 24px rgba(0,0,0,0.1)" } }}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden" style={{ background: `linear-gradient(135deg, ${catColor}20, ${catColor}40)` }}>
        {doc.thumbnail && (
          <img
            src={doc.thumbnail}
            alt={doc.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-700">
            {doc.category}
          </span>
          {doc.isTrending && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500 text-white">
              🔥 Hot
            </span>
          )}
        </div>
        {statusInfo && (
          <div className="absolute top-3 right-3">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
            >
              {statusInfo.label}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <Star size={12} fill="#F59E0B" className="text-amber-400" />
          <span className="text-xs font-semibold text-white">{doc.rating || "4.5"}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${catColor}12`, color: catColor }}
          >
            {doc.subject}
          </span>
          {doc.course && <span className="text-xs text-slate-400">{doc.course}</span>}
        </div>
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug mb-3 group-hover:text-blue-600 transition-colors">
          {doc.title}
        </h3>

        {/* Owner */}
        <div className="flex items-center gap-2 mb-3">
          <img src={doc.owner.avatar} alt={doc.owner.name} className="w-6 h-6 rounded-full object-cover" />
          <span className="text-xs text-slate-500">{doc.owner.name}</span>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={10} /> {doc.uploadDate?.slice(0, 10) || "Recently"}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors">
              <Heart size={12} /> {doc.likes}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <MessageCircle size={12} /> {doc.comments}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Bookmark size={12} /> {doc.saves}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Download size={12} /> {doc.downloads}
          </span>
        </div>
      </div>
    </div>
  );
}
