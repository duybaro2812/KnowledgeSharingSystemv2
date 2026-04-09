import { useState } from 'react';
import { Link } from 'react-router';
import { Edit2, MapPin, Calendar, Trophy, Users, FileText, ThumbsUp, BookOpen } from 'lucide-react';
import { currentUser, documents, users } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { DocumentCard } from '../../components/common/DocumentCard';

const myDocs = documents.filter(d => d.uploadedBy.id === currentUser.id && d.status === 'approved');

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(currentUser.bio);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        {/* Cover */}
        <div className="h-36 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M 0 30 L 15 0 L 30 30\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'1\'/%3E%3C/svg%3E")' }} />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="ring-4 ring-white rounded-2xl shadow-lg">
              <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="xl" />
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{currentUser.name}</h1>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">{currentUser.role}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{currentUser.university}</span>
                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{currentUser.department}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {new Date(currentUser.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <button onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              <Edit2 className="w-4 h-4" />
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Bio */}
          {editing ? (
            <div className="mb-4">
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                className="w-full max-w-xl border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              <button onClick={() => setEditing(false)} className="mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Save</button>
            </div>
          ) : (
            <p className="text-slate-600 max-w-xl mb-4">{bio}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            {[
              { icon: Trophy, value: currentUser.points, label: 'Points', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: Users, value: currentUser.followers, label: 'Followers', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: FileText, value: currentUser.uploads, label: 'Uploads', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: ThumbsUp, value: currentUser.upvotes, label: 'Upvotes', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`flex items-center gap-2.5 ${stat.bg} px-4 py-2.5 rounded-xl`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <div>
                    <p className="text-base font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Published Documents */}
      <div>
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Published Documents ({myDocs.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
        </div>
      </div>
    </div>
  );
}
