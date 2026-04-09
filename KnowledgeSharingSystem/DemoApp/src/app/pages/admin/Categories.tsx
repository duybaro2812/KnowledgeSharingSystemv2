import { useState } from 'react';
import { Folder, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, BookOpen, ChevronRight } from 'lucide-react';
import { categories } from '../../data/mockData';

export default function Categories() {
  const [cats, setCats] = useState(categories);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#2563EB');

  const toggleActive = (id: string) => {
    setCats(cats.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const addCategory = () => {
    if (!newName.trim()) return;
    setCats([...cats, {
      id: `cat-${Date.now()}`,
      name: newName,
      slug: newName.toLowerCase().replace(/\s+/g, '-'),
      description: newDesc,
      documentCount: 0,
      color: newColor,
      isActive: true,
    }]);
    setNewName('');
    setNewDesc('');
    setAddOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            Category Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{cats.length} categories configured</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {/* Add form */}
      {addOpen && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-blue-900 mb-4">New Category</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Engineering"
                className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1" />
                <input value={newColor} onChange={e => setNewColor(e.target.value)} className="flex-1 border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of this category"
              className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAddOpen(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-white">Cancel</button>
            <button onClick={addCategory} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">Create Category</button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cats.map(cat => (
          <div key={cat.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${cat.isActive ? 'border-slate-200/80' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${cat.color}18`, border: `1px solid ${cat.color}30` }}>
                <Folder className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                  {!cat.isActive && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">Inactive</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{cat.description}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">{cat.documentCount} documents</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">/{cat.slug}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button className="w-8 h-8 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(cat.id)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-colors ${cat.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                  {cat.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
