import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { Send, Star, X, CheckCircle, BookOpen, ArrowLeft, MoreVertical, Phone, Info } from 'lucide-react';
import { qaSessions, currentUser } from '../../data/mockData';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

function timeStr(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function RatingModal({ onClose, onRate }: { onClose: () => void; onRate: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Rate this Q&A Session</h3>
        <p className="text-slate-500 mb-6 text-sm">How helpful was this session? Your feedback helps document owners improve.</p>

        <div className="flex justify-center gap-2 mb-6">
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setSelected(s)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star className={`w-10 h-10 transition-colors ${s <= (hover || selected) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>

        {selected > 0 && (
          <p className="text-sm text-slate-600 mb-4">
            {['', 'Not helpful', 'Somewhat helpful', 'Good', 'Very helpful', 'Excellent!'][selected]}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors">
            Skip
          </button>
          <button onClick={() => selected && onRate(selected)}
            disabled={!selected}
            className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:from-amber-500 hover:to-amber-600 transition-all">
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QASession() {
  const { id } = useParams();
  const session = qaSessions.find(s => s.id === id) ?? qaSessions[0];
  const [messages, setMessages] = useState(session.messages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(session.status);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(session.rating ?? 0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isAsker = session.asker.id === currentUser.id;
  const otherUser = isAsker ? session.owner : session.asker;

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, {
      id: `m-${Date.now()}`,
      senderId: currentUser.id,
      content: input.trim(),
      sentAt: new Date().toISOString(),
    }]);
    setInput('');
  };

  const closeSession = () => {
    setStatus('closed');
    setShowCloseConfirm(false);
    if (isAsker) setShowRating(true);
  };

  const handleRate = (n: number) => {
    setRating(n);
    setShowRating(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {showRating && <RatingModal onClose={() => setShowRating(false)} onRate={handleRate} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/qa" className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <Avatar initials={otherUser.initials} color={otherUser.avatarColor} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{otherUser.name}</span>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BookOpen className="w-3.5 h-3.5" />
            <Link to={`/document/${session.documentId}`} className="hover:text-blue-600 transition-colors">
              {session.documentTitle}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rating > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-3 h-3 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
              ))}
            </div>
          )}
          {status === 'open' && (
            <button onClick={() => setShowCloseConfirm(true)}
              className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
              <X className="w-4 h-4" /> Close Session
            </button>
          )}
        </div>
      </div>

      {/* Close confirm */}
      {showCloseConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-red-700 font-medium mb-3">Are you sure you want to close this Q&A session? This action cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowCloseConfirm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm hover:bg-white">Cancel</button>
            <button onClick={closeSession} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-700">Close Session</button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Chat messages */}
        <div className="p-5 space-y-4 min-h-[480px] max-h-[480px] overflow-y-auto bg-gradient-to-b from-slate-50/50 to-white">
          {/* Date divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 px-2">Session started · {new Date(session.createdAt).toLocaleDateString()}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {messages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id;
            const sender = isMe ? currentUser : otherUser;
            const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                  <Avatar initials={sender.initials} color={sender.avatarColor} size="xs" />
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${isMe
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-slate-400 px-1">{timeStr(msg.sentAt)}</span>
                </div>
              </div>
            );
          })}

          {status === 'closed' && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Session closed
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          )}
        </div>

        {/* Input */}
        {status === 'open' ? (
          <div className="border-t border-slate-100 p-4 flex items-end gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder="Type your message… (Enter to send)"
              rows={2}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all resize-none"
            />
            <button onClick={sendMessage}
              className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="border-t border-slate-100 p-4">
            <div className="text-center text-sm text-slate-500">
              This session has been closed.
              {isAsker && !rating && (
                <button onClick={() => setShowRating(true)} className="ml-2 text-amber-600 font-medium hover:text-amber-700">
                  Rate this session →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
