import { Link } from 'react-router';
import { MessageCircle, Plus, Clock, CheckCircle, Star, BookOpen } from 'lucide-react';
import { qaSessions, currentUser } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

function timeAgo(d: string) {
  const hrs = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function QAList() {
  const myAskedSessions = qaSessions.filter(s => s.asker.id === currentUser.id);
  const myOwnerSessions = qaSessions.filter(s => s.owner.id === currentUser.id);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Q&A Sessions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Private 1-on-1 conversations with document owners.</p>
        </div>
      </div>

      {/* Sessions Asked */}
      <div className="mb-8">
        <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-600" />
          Sessions I Started ({myAskedSessions.length})
        </h2>
        <div className="space-y-3">
          {myAskedSessions.map(session => (
            <Link key={session.id} to={`/qa/${session.id}`}
              className="block bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <Avatar initials={session.owner.initials} color={session.owner.avatarColor} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{session.owner.name}</span>
                    <StatusBadge status={session.status} />
                    {session.rating && (
                      <div className="flex items-center gap-1 ml-auto">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= session.rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{session.documentTitle}</span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-1">
                    {session.messages[session.messages.length - 1]?.content}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(session.lastMessageAt)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{session.messages.length} messages</p>
                </div>
              </div>
            </Link>
          ))}
          {myAskedSessions.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500 text-sm">No Q&A sessions started yet. Browse documents to ask questions!</p>
            </div>
          )}
        </div>
      </div>

      {/* Sessions As Owner */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-600" />
          Sessions on My Documents ({myOwnerSessions.length})
        </h2>
        <div className="space-y-3">
          {myOwnerSessions.map(session => (
            <Link key={session.id} to={`/qa/${session.id}`}
              className="block bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <Avatar initials={session.asker.initials} color={session.asker.avatarColor} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{session.asker.name}</span>
                    <span className="text-xs text-slate-400">asked about</span>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="text-xs text-teal-600 mb-2">{session.documentTitle}</p>
                  <p className="text-sm text-slate-600 line-clamp-1">
                    {session.messages[0]?.content}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">{timeAgo(session.lastMessageAt)}</p>
                  {session.status === 'open' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block">Needs reply</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
