import React, { useState } from "react";
import { Search, SlidersHorizontal, Grid3X3, List, ChevronDown, X } from "lucide-react";
import { DocumentCard } from "../../components/shared/DocumentCard";
import { documents, categories } from "../../data/mockData";

const sortOptions = ["Most Recent", "Most Popular", "Highest Rated", "Most Downloaded"];
const typeOptions = ["All Types", "Lecture Notes", "Study Guide", "Cheat Sheet", "Textbook Summary", "Case Study"];

export function DocumentBrowse() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("Most Recent");
  const [type, setType] = useState("All Types");

  const filtered = documents.filter((d) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.subject.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || d.subject === activeCategory;
    const matchType = type === "All Types" || d.category === type;
    return matchSearch && matchCat && matchType;
  });

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Browse Documents</h1>
        <p className="text-sm text-slate-500">{documents.length.toLocaleString()} documents available across all subjects</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 mb-6 border border-slate-100" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <select value={type} onChange={(e) => setType(e.target.value)} className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
              {typeOptions.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
              {sortOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-all ${view === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
              <Grid3X3 size={15} />
            </button>
            <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveCategory("All")}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCategory === "All" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            All Subjects
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCategory === cat.name ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              style={activeCategory === cat.name ? { backgroundColor: cat.color } : {}}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> documents
          {activeCategory !== "All" && <span> in <span className="font-semibold text-slate-700">{activeCategory}</span></span>}
        </p>
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <SlidersHorizontal size={14} /> Advanced filters
        </button>
      </div>

      {/* Document Grid */}
      {filtered.length > 0 ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} variant={view === "grid" ? "grid" : "horizontal"} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-2">No documents found</h3>
          <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
