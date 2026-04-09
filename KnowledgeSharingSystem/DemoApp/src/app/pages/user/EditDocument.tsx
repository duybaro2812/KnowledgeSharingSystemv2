import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Save, Tag, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { documents, categories } from '../../data/mockData';

export default function EditDocument() {
  const { id } = useParams();
  const doc = documents.find(d => d.id === id) ?? documents[0];
  const navigate = useNavigate();
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description);
  const [tags, setTags] = useState(doc.tags);
  const [tagInput, setTagInput] = useState('');
  const [saved, setSaved] = useState(false);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Edit Document</h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className={`bg-gradient-to-br ${doc.coverColor} h-24 rounded-2xl flex items-center px-6`}>
          <h3 className="text-white font-bold text-lg truncate">{title}</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select defaultValue={doc.category} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none bg-white">
              {categories.map(c => <option key={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Course Code</label>
            <input defaultValue={doc.course} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full">
                {tag}
                <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag and press Enter"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <button onClick={addTag} className="border border-slate-200 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => navigate(-1)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => { setSaved(true); setTimeout(() => navigate('/my-documents'), 1000); }}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm">
            <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
