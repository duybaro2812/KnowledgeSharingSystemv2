import React, { useState } from "react";
import { Bookmark, Search, Grid3X3, List, Clock, Star, Filter } from "lucide-react";
import { DocumentCard } from "../../components/shared/DocumentCard";
import { documents } from "../../data/mockData";

const saved = documents.slice(0, 4);
const recent = documents.slice(1, 5);

export function MyLibrary() {
  const [tab, setTab] = useState<"saved" | "recent" | "downloaded">("saved");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const tabDocs = tab === "saved" ? saved : tab === "recent" ? recent : documents.slice(2, 6);
  const filtered = tabDocs.filter((d) => !search || d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">My Library</h1>
          <p className="text-sm text-slate-500">Your saved, recently viewed, and downloaded documents</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {[
            { id: "saved", label: "Saved", icon: Bookmark, count: saved.length },
            { id: "recent", label: "Recently Viewed", icon: Clock, count: recent.length },
            { id: "downloaded", label: "Downloaded", icon: Star, count: 4 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <t.icon size={13} />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all w-48"
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setView("grid")} className={`p-1.5 rounded-lg ${view === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}>
              <Grid3X3 size={14} />
            </button>
            <button onClick={() => setView("list")} className={`p-1.5 rounded-lg ${view === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}>
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length > 0 ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} variant={view === "grid" ? "grid" : "horizontal"} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Bookmark size={28} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-2">Nothing saved yet</h3>
          <p className="text-sm text-slate-400">Browse documents and save the ones you want to revisit</p>
        </div>
      )}
    </div>
  );
}
