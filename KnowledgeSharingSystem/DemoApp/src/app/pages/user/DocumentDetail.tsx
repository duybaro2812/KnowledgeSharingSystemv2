import { useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  ThumbsUp, ThumbsDown, Bookmark, Download, Share2, Flag, MessageSquare,
  MessageCircle, ChevronDown, ChevronUp, Send, Lock, Unlock, Star,
  Eye, FileText, Clock, Tag, ChevronRight, CheckCircle, Zap
} from 'lucide-react';
import { documents, comments as allComments, currentUser } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CommentItem({ comment, depth = 0 }: { comment: typeof allComments[0]; depth?: number }) {
  const [showReplies, setShowReplies] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <div className={depth > 0 ? 'ml-8 mt-3 border-l-2 border-slate-100 pl-4' : ''}>
      <div className="flex gap-3">
        <Avatar initials={comment.author.initials} color={comment.author.avatarColor} size="sm" />
        <div className="flex-1">
          <div className={`rounded-2xl px-4 py-3 ${comment.status === 'pending' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-900">{comment.author.name}</span>
              <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
              {comment.status === 'pending' && <StatusBadge status="pending" />}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
          </div>
          <div className="flex items-center gap-4 mt-1.5 px-1">
            <button className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> {comment.likes}
            </button>
            <button onClick={() => setReplyOpen(!replyOpen)} className="text-xs text-slate-500 hover:text-blue-600">
              Reply
            </button>
            {comment.replies.length > 0 && (
              <button onClick={() => setShowReplies(!showReplies)} className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1">
                {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {replyOpen && (
            <div className="flex gap-2 mt-2">
              <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="xs" />
              <div className="flex-1 flex gap-2">
                <input placeholder="Write a reply…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
                <button className="bg-blue-600 text-white rounded-xl px-3 py-2 hover:bg-blue-700 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReplies && comment.replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

function DocumentViewer({ points, isOwner }: { points: number; isOwner: boolean }) {
  if (isOwner || points >= 40) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5"><div className="w-3 h-3 bg-red-400 rounded-full" /><div className="w-3 h-3 bg-amber-400 rounded-full" /><div className="w-3 h-3 bg-emerald-400 rounded-full" /></div>
            <span className="text-sm text-slate-300 ml-2">advanced-algorithms.pdf</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-900/40 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Unlock className="w-3 h-3" /> Full Access
            </span>
            <span className="text-xs text-slate-400">Page 1 / 142</span>
          </div>
        </div>
        <div className="p-8 min-h-[500px] bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Chapter 1: Introduction to Algorithm Analysis</h2>
            <p className="text-slate-700 leading-relaxed">
              Algorithm analysis is the determination of the amount of time and space resources required to execute an algorithm. Usually, the efficiency or running time of an algorithm is stated as a function relating the input length to the number of steps, known as <em>time complexity</em>.
            </p>
            <p className="text-slate-700 leading-relaxed">
              The time required by an algorithm falls under three types: Best case (minimum time), Average case (expected time), and Worst case (maximum time). We denote these using Big-O notation...
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-mono text-blue-900">
                T(n) = O(f(n)) if ∃ c, n₀ such that T(n) ≤ c·f(n) for all n ≥ n₀
              </p>
            </div>
            <p className="text-slate-700 leading-relaxed">
              In this chapter, we will explore the following complexity classes and their relationships: O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n²) quadratic, O(2ⁿ) exponential...
            </p>
            <div className="bg-slate-100 rounded-xl p-4 space-y-2">
              <div className="h-3 bg-slate-300 rounded w-full" />
              <div className="h-3 bg-slate-300 rounded w-4/5" />
              <div className="h-3 bg-slate-300 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (points >= 30) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">
        <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-300">advanced-algorithms.pdf</span>
          <span className="text-xs text-blue-400 bg-blue-900/40 border border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Eye className="w-3 h-3" /> Read Only
          </span>
        </div>
        <div className="p-8 min-h-[400px] bg-gradient-to-b from-white to-slate-50 relative">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Chapter 1: Introduction to Algorithm Analysis</h2>
            <p className="text-slate-700 leading-relaxed">
              Algorithm analysis is the determination of the amount of time and space resources required to execute an algorithm...
            </p>
            <p className="text-slate-400 blur-sm select-none leading-relaxed">
              The time required by an algorithm falls under three types: Best case minimum time Average case expected time and Worst case maximum time. We denote these using Big-O notation...
            </p>
          </div>
          {/* Soft download lock overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-sm">
              <Download className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Earn 10+ more points to unlock downloads</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Locked (<30 pts)
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-300">advanced-algorithms.pdf</span>
        <span className="text-xs text-amber-400 bg-amber-900/40 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Lock className="w-3 h-3" /> Locked
        </span>
      </div>
      <div className="relative overflow-hidden" style={{ minHeight: 400 }}>
        {/* Blurred bg */}
        <div className="p-8 filter blur-sm select-none pointer-events-none opacity-30">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold">Chapter 1: Introduction to Algorithm Analysis</h2>
            <p>Algorithm analysis is the determination of the amount of time and space resources...</p>
            <p>The time required by an algorithm falls under three types: Best case, Average case, and Worst case...</p>
          </div>
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="text-center max-w-sm mx-auto px-6">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Document Locked</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              You need at least <strong className="text-slate-700">30 points</strong> to read this document. Earn points by uploading your own materials!
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-amber-700 font-medium">Your progress</span>
                <span className="text-sm font-bold text-amber-700">{points} / 30 pts</span>
              </div>
              <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (points / 30) * 100)}%` }} />
              </div>
            </div>
            <Link to="/upload"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm mb-3">
              <Zap className="w-4 h-4" /> Upload a Document (+10 pts)
            </Link>
            <p className="text-xs text-slate-400">You can still comment, reply, and ask questions below!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const doc = documents.find(d => d.id === id) ?? documents[0];
  const docComments = allComments.filter(c => c.documentId === doc.id);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(doc.isLiked ?? false);
  const [saved, setSaved] = useState(doc.isSaved ?? false);
  const [qaOpen, setQaOpen] = useState(false);
  
  const userPoints = currentUser.points;
  const isOwner = doc.uploadedBy.id === currentUser.id;
  const canDownload = isOwner || currentUser.role !== 'user' || userPoints >= 40;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/browse" className="hover:text-blue-600">Browse</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-blue-600">{doc.category}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 truncate max-w-xs">{doc.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Header */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-br ${doc.coverColor} h-40 relative`}>
              <div className="absolute inset-0 flex items-end p-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full border border-white/30">{doc.category}</span>
                    <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full border border-white/30">{doc.course}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <h1 className="text-2xl font-bold text-white leading-tight">{doc.title}</h1>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 leading-relaxed mb-4">{doc.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {doc.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                    <Tag className="w-3 h-3" />{tag}
                  </span>
                ))}
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 pb-4 border-b border-slate-100">
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {doc.pages} pages</span>
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {doc.views.toLocaleString()} views</span>
                <span className="flex items-center gap-1.5"><Download className="w-4 h-4" /> {doc.downloads.toLocaleString()} downloads</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(doc.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button onClick={() => setLiked(!liked)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${liked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                  <ThumbsUp className="w-4 h-4" /> {doc.likes + (liked ? 1 : 0)}
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-slate-300 text-sm font-medium transition-all">
                  <ThumbsDown className="w-4 h-4" /> {doc.dislikes}
                </button>
                <button onClick={() => setSaved(!saved)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${saved ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-amber-500' : ''}`} /> {saved ? 'Saved' : 'Save'}
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-slate-300 text-sm font-medium transition-all">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 text-sm transition-all ml-auto">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </div>
            </div>
          </div>

          {/* Document Viewer */}
          <DocumentViewer points={userPoints} isOwner={isOwner} />

          {/* Comments */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Comments ({docComments.filter(c => c.status === 'approved').length})
            </h3>

            {/* New comment */}
            <div className="flex gap-3 mb-6">
              <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" />
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment or question about this document…"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all resize-none"
                />
                {commentText && (
                  <div className="flex justify-end mt-2">
                    <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Post Comment
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comment list */}
            <div className="space-y-4">
              {docComments.map(c => <CommentItem key={c.id} comment={c} />)}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Author card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Document Owner</h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar initials={doc.uploadedBy.initials} color={doc.uploadedBy.avatarColor} size="lg" />
              <div>
                <p className="font-semibold text-slate-900">{doc.uploadedBy.name}</p>
                <p className="text-xs text-slate-500">{doc.uploadedBy.department}</p>
                <p className="text-xs text-slate-400">{doc.uploadedBy.university}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{doc.uploadedBy.bio}</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { v: doc.uploadedBy.uploads,  l: 'Uploads' },
                { v: doc.uploadedBy.followers, l: 'Followers' },
                { v: doc.uploadedBy.upvotes,   l: 'Upvotes' },
              ].map(s => (
                <div key={s.l} className="text-center bg-slate-50 rounded-xl py-2">
                  <p className="text-sm font-bold text-slate-900">{s.v}</p>
                  <p className="text-xs text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
            <button className="w-full border border-blue-200 text-blue-700 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors">
              Follow
            </button>
          </div>

          {/* Download */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Download</h3>
            {canDownload ? (
              <div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-3 text-center">
                  <p className="text-xs text-emerald-700 font-medium">Full access enabled</p>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                {!isOwner && (
                  <p className="text-xs text-slate-400 text-center mt-2">Costs {doc.downloadCost} points · You have {userPoints} pts</p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-slate-100 rounded-2xl p-4 mb-3">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Need {userPoints < 30 ? '30' : '40'} points to download</p>
                </div>
                <Link to="/points" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Earn more points →</Link>
              </div>
            )}
          </div>

          {/* Ask Question */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Ask the Owner</h3>
            {!qaOpen ? (
              <div>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">Have a question about this document? Start a private Q&A session with {doc.uploadedBy.name.split(' ')[0]}.</p>
                <button onClick={() => setQaOpen(true)}
                  className="w-full border-2 border-dashed border-blue-200 text-blue-600 py-3 rounded-xl text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Start Q&A Session
                </button>
              </div>
            ) : (
              <div>
                <textarea placeholder={`Ask ${doc.uploadedBy.name.split(' ')[0]} a question about this document…`}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none mb-2" />
                <div className="flex gap-2">
                  <button onClick={() => setQaOpen(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                  <button className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Send</button>
                </div>
              </div>
            )}
          </div>

          {/* Doc info */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Document Info</h3>
            <div className="space-y-2.5">
              {[
                { l: 'File Size', v: doc.fileSize },
                { l: 'Pages', v: `${doc.pages} pages` },
                { l: 'Course', v: doc.course },
                { l: 'Uploaded', v: new Date(doc.uploadedAt).toLocaleDateString() },
              ].map(item => (
                <div key={item.l} className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{item.l}</span>
                  <span className="text-sm font-medium text-slate-900">{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
