import { useState } from 'react';
import { Search, SlidersHorizontal, Grid3X3, List, ChevronDown, X } from 'lucide-react';
import { DocumentCard } from '../../components/common/DocumentCard';
import { documents, categories } from '../../data/mockData';

const sortOptions = ['Most Recent', 'Most Views', 'Most Downloads', 'Most Liked', 'Oldest'];

export default function Browse() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sort, setSort] = useState('Most Recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = documents.filter(d => {
    const approved = d.status === 'approved';
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !selectedCat || d.category === selectedCat;
    return approved && matchSearch && matchCat;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Browse Documents</h1>
        <p className="text-slate-500">Explore {documents.filter(d => d.status === 'approved').length} approved documents across {categories.length} categories.</p>
      </div>

      {/* Search & Filters bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, category, or tag…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            >
              {sortOptions.map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 border rounded-xl px-4 py-3 text-sm font-medium transition-all shadow-sm ${filtersOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          <div className="flex border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={() => setView('grid')} className={`px-3 py-2.5 ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-2.5 ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-slate-700 self-center mr-2">Category:</span>
            <button
              onClick={() => setSelectedCat(null)}
              className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${!selectedCat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${selectedCat === cat.name ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                style={selectedCat === cat.name ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> documents
          {selectedCat && <span> in <span className="font-semibold text-blue-600">{selectedCat}</span></span>}
          {search && <span> for "<span className="font-semibold">{search}</span>"</span>}
        </p>
      </div>

      {/* Document grid/list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">No documents found</h3>
          <p className="text-slate-500 text-sm">Try a different search term or filter</p>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
          {filtered.map(doc => (
            view === 'grid'
              ? <DocumentCard key={doc.id} doc={doc} />
              : (
                <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all">
                  <div className={`w-14 h-14 bg-gradient-to-br ${doc.coverColor} rounded-xl flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{doc.category}</span>
                      <span className="text-xs text-slate-400">{doc.course}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate">{doc.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">by {doc.uploadedBy.name} · {doc.pages} pages</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">{doc.views.toLocaleString()} views</p>
                    <p className="text-xs text-slate-400">{doc.downloads.toLocaleString()} downloads</p>
                  </div>
                </div>
              )
          ))}
        </div>
      )}
    </div>
  );
}
