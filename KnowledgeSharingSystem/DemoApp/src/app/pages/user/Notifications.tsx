import { useState } from 'react';
import {
  Bell, CheckCheck, Award, Shield, Flag, AlertTriangle,
  MessageSquare, MessageCircle, Info, Trash2
} from 'lucide-react';
import { notifications } from '../../data/mockData';
import { NotifType } from '../../data/mockData';

const notifConfig: Record<NotifType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  approval:   { icon: CheckCheck,    color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  moderation: { icon: Shield,        color: 'text-purple-600',  bg: 'bg-purple-100',  border: 'border-purple-200' },
  report:     { icon: Flag,          color: 'text-red-600',     bg: 'bg-red-100',     border: 'border-red-200' },
  plagiarism: { icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-100',   border: 'border-amber-200' },
  comment:    { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-100',    border: 'border-blue-200' },
  chat:       { icon: MessageCircle, color: 'text-teal-600',    bg: 'bg-teal-100',    border: 'border-teal-200' },
  points:     { icon: Award,         color: 'text-indigo-600',  bg: 'bg-indigo-100',  border: 'border-indigo-200' },
  system:     { icon: Info,          color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200' },
};

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [items, setItems] = useState(notifications);

  const filtered = filter === 'unread' ? items.filter(n => !n.isRead) : items;
  const unreadCount = items.filter(n => !n.isRead).length;

  const markAll = () => setItems(items.map(n => ({ ...n, isRead: true })));
  const markRead = (id: string) => setItems(items.map(n => n.id === id ? { ...n, isRead: true } : n));

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Stay updated on your documents and activity.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-50 transition-all">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
          </div>
        ) : filtered.map(notif => {
          const cfg = notifConfig[notif.type];
          const Icon = cfg.icon;
          return (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={`group bg-white rounded-2xl border ${!notif.isRead ? `${cfg.border} shadow-sm` : 'border-slate-200/80'} p-4 flex items-start gap-4 cursor-pointer hover:shadow-md transition-all ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
            >
              <div className={`w-11 h-11 ${cfg.bg} rounded-2xl flex items-center justify-center flex-shrink-0 border ${cfg.border}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{notif.title}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.isRead && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{notif.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">{timeAgo(notif.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
