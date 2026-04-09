import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCircle2, MessageCircle, Star, MessageSquare, Flag, AlertTriangle, X, Check } from "lucide-react";
import { notifications } from "../../data/mockData";

const iconMap: Record<string, React.ReactNode> = {
  "check-circle": <CheckCircle2 size={15} className="text-emerald-500" />,
  "message-circle": <MessageCircle size={15} className="text-blue-500" />,
  star: <Star size={15} className="text-amber-500" />,
  "message-square": <MessageSquare size={15} className="text-teal-500" />,
  flag: <Flag size={15} className="text-rose-500" />,
  "alert-triangle": <AlertTriangle size={15} className="text-orange-500" />,
};

const typeBgs: Record<string, string> = {
  approval: "#ECFDF5",
  comment: "#EFF6FF",
  points: "#FFFBEB",
  chat: "#F0FDFA",
  report: "#FFF1F2",
  plagiarism: "#FFF7ED",
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-12 w-96 rounded-2xl bg-white z-50 overflow-hidden"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Check size={12} /> Mark all read
                </button>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.slice(0, 6).map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${!notif.read ? "bg-blue-50/40" : ""}`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: typeBgs[notif.type] || "#F1F5F9" }}
                  >
                    {iconMap[notif.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{notif.title}</p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{notif.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => { setOpen(false); navigate("/app/notifications"); }}
                className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1"
              >
                View all notifications →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
