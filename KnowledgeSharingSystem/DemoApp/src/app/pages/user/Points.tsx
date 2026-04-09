import { Trophy, Upload, Download, ThumbsUp, MessageCircle, Shield, TrendingUp, Lock, Unlock, CheckCircle } from 'lucide-react';
import { currentUser, pointEvents } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Avatar } from '../../components/common/Avatar';

const tiers = [
  { min: 0,  max: 29,  label: 'Starter',     color: 'bg-slate-400',  textColor: 'text-slate-700',  desc: 'Comment, reply, ask Q&A — document viewer locked.' },
  { min: 30, max: 39,  label: 'Reader',       color: 'bg-blue-500',   textColor: 'text-blue-700',   desc: 'View full documents (no download). Comment & Q&A.' },
  { min: 40, max: 999, label: 'Full Access',  color: 'bg-emerald-500',textColor: 'text-emerald-700',desc: 'View + download documents. Downloads cost points.' },
];

const earningWays = [
  { icon: Upload,         label: 'Upload a document',        pts: '+10',  color: 'text-blue-600',    bg: 'bg-blue-50' },
  { icon: Download,       label: 'Someone downloads yours',  pts: '+5',   color: 'text-teal-600',    bg: 'bg-teal-50' },
  { icon: ThumbsUp,       label: 'Receive 10 upvotes',       pts: '+2',   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  { icon: MessageCircle,  label: 'Receive 5-star Q&A rating',pts: '+3',   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Shield,         label: 'Admin bonus grant',        pts: 'Varies',color:'text-purple-600',  bg: 'bg-purple-50' },
  { icon: Download,       label: 'Download a document',      pts: '-5',   color: 'text-rose-600',    bg: 'bg-rose-50' },
];

export default function Points() {
  const pts = currentUser.points;
  const currentTier = tiers.find(t => pts >= t.min && pts <= t.max) ?? tiers[0];
  const nextTier = tiers.find(t => t.min > pts);
  const progress = nextTier ? ((pts - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Points & Access</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your points determine what you can access on NeoShare.</p>
      </div>

      {/* Points Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 lg:p-8 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-blue-200 text-sm mb-1">Your Points Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{pts}</span>
              <span className="text-blue-300 text-lg">points</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 border border-white/30">
            <Trophy className="w-8 h-8 text-amber-300" />
          </div>
        </div>

        {/* Current tier */}
        <div className="bg-white/10 rounded-2xl p-4 mb-4 border border-white/20">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">Current Tier: {currentTier.label}</span>
            {nextTier && <span className="text-blue-200 text-sm">Next: {nextTier.label} at {nextTier.min} pts</span>}
          </div>
          <p className="text-blue-200 text-sm mb-3">{currentTier.desc}</p>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          {nextTier && (
            <div className="flex justify-between mt-1">
              <span className="text-xs text-blue-300">{pts} pts</span>
              <span className="text-xs text-blue-300">{nextTier.min} pts</span>
            </div>
          )}
        </div>

        <p className="text-sm text-blue-200">
          {nextTier ? `Earn ${nextTier.min - pts} more points to reach ${nextTier.label}!` : '🎉 You have full platform access!'}
        </p>
      </div>

      {/* Access Tiers */}
      <div>
        <h2 className="font-bold text-slate-900 mb-4">Access Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map(tier => {
            const isActive = pts >= tier.min && pts <= tier.max;
            const isUnlocked = pts >= tier.min;
            return (
              <div key={tier.label} className={`rounded-2xl border p-5 transition-all ${isActive ? 'border-blue-300 bg-blue-50 shadow-md' : isUnlocked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                  <span className="font-semibold text-slate-900">{tier.label}</span>
                  {isActive && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full ml-auto">Current</span>}
                  {!isActive && isUnlocked && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
                  {!isUnlocked && <Lock className="w-4 h-4 text-slate-400 ml-auto" />}
                </div>
                <p className="text-sm text-slate-500 mb-3 leading-relaxed">{tier.desc}</p>
                <p className="text-xs font-semibold text-slate-600">
                  {tier.max === 999 ? `${tier.min}+ points` : `${tier.min}–${tier.max} points`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Earning Ways */}
      <div>
        <h2 className="font-bold text-slate-900 mb-4">How to Earn Points</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {earningWays.map(way => {
            const Icon = way.icon;
            return (
              <div key={way.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${way.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${way.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{way.label}</p>
                </div>
                <span className={`text-sm font-bold ${way.pts.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{way.pts}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="font-bold text-slate-900 mb-4">Transaction History</h2>
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Points</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {pointEvents.map(event => (
                  <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-700">{event.description}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={event.type} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={event.status} /></td>
                    <td className={`px-5 py-3.5 text-right text-sm font-bold ${event.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {event.points > 0 ? '+' : ''}{event.points}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-400">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
