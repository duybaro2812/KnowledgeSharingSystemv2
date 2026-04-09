import { Link } from 'react-router';
import { Bell, CheckCheck, Award, Shield, Flag, AlertTriangle, MessageSquare, MessageCircle, Zap, Info } from 'lucide-react';
import { notifications } from '../../data/mockData';
import { NotifType } from '../../data/mockData';

const notifIcons: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  approval:    { icon: CheckCheck,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
  moderation:  { icon: Shield,          color: 'text-purple-600',  bg: 'bg-purple-50' },
  report:      { icon: Flag,            color: 'text-red-600',     bg: 'bg-red-50' },
  plagiarism:  { icon: AlertTriangle,   color: 'text-amber-600',   bg: 'bg-amber-50' },
  comment:     { icon: MessageSquare,   color: 'text-blue-600',    bg: 'bg-blue-50' },
  chat:        { icon: MessageCircle,   color: 'text-teal-600',    bg: 'bg-teal-50' },
  points:      { icon: Award,           color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  system:      { icon: Info,            color: 'text-slate-600',   bg: 'bg-slate-100' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const recent = notifications.slice(0, 6);

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-700" />
          <span className="font-semibold text-slate-900">Notifications</span>
          <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">3</span>
        </div>
        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">Mark all read</button>
      </div>

      {/* Items */}
      <div className="max-h-[420px] overflow-y-auto">
        {recent.map(notif => {
          const cfg = notifIcons[notif.type];
          const Icon = cfg.icon;
          return (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${!notif.isRead ? 'bg-blue-50/40' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 leading-snug">{notif.title}</p>
                  {!notif.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
        <Link to="/notifications" onClick={onClose} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
