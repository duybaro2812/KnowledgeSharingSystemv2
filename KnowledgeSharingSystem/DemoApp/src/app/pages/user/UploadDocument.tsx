import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, FileText, Tag, X, ChevronDown, CheckCircle, ArrowLeft, Plus, Zap } from 'lucide-react';
import { categories } from '../../data/mockData';

export default function UploadDocument() {
  const [tags, setTags] = useState<string[]>(['algorithms', 'complexity']);
  const [tagInput, setTagInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  if (submitted) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-10 text-center w-full">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Document Submitted!</h2>
          <p className="text-slate-500 mb-2">Your document is now under review by our moderators.</p>
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 inline-flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4" /> You'll earn +10 points once it's approved!
          </p>
          <div className="flex gap-3">
            <button onClick={() => setSubmitted(false)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50">
              Upload Another
            </button>
            <button onClick={() => navigate('/my-documents')} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700">
              My Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Document</h1>
          <p className="text-slate-500 text-sm">Share your study materials and earn 10 points</p>
        </div>
        <div className="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Earn +10 points
        </div>
      </div>

      <div className="space-y-5">
        {/* File Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30'}`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" accept=".pdf,.docx,.pptx" className="hidden" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          {file ? (
            <div>
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-emerald-700">{file.name}</p>
              <p className="text-sm text-emerald-600">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-blue-600" />
              </div>
              <p className="font-semibold text-slate-900 mb-1">Drop your file here or click to browse</p>
              <p className="text-sm text-slate-500">Supports PDF, DOCX, PPTX · Max 50MB</p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Title <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. Advanced Algorithms & Complexity Theory – Full Notes"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea placeholder="Describe what's covered in this document. Be specific to help others find it." rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
              <div className="relative">
                <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-white">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Course Code</label>
              <input type="text" placeholder="e.g. CS 6.006" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag and press Enter"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
              />
              <button onClick={addTag} className="border border-slate-200 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Community Guidelines</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            {[
              'Only upload your own work or materials you have permission to share.',
              'Do not upload copyrighted textbooks or exam papers.',
              'Documents must be relevant to university-level academic study.',
              'Uploaded documents are reviewed by moderators before publishing.',
            ].map(rule => (
              <li key={rule} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Submit */}
        <button onClick={() => setSubmitted(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md text-base">
          <Upload className="w-5 h-5" /> Submit for Review
        </button>
      </div>
    </div>
  );
}
