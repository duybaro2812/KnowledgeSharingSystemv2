interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending:         { label: 'Pending',          classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved:        { label: 'Approved',         classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  rejected:        { label: 'Rejected',         classes: 'bg-red-50 text-red-700 border border-red-200' },
  hidden:          { label: 'Hidden',           classes: 'bg-slate-100 text-slate-600 border border-slate-200' },
  open:            { label: 'Open',             classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  closed:          { label: 'Closed',           classes: 'bg-slate-100 text-slate-600 border border-slate-200' },
  reviewed:        { label: 'Reviewed',         classes: 'bg-purple-50 text-purple-700 border border-purple-200' },
  dismissed:       { label: 'Dismissed',        classes: 'bg-slate-100 text-slate-500 border border-slate-200' },
  approved_anyway: { label: 'Approved Anyway',  classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  locked:          { label: 'Locked',           classes: 'bg-red-50 text-red-700 border border-red-200' },
  upload:          { label: 'Upload',           classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  download_received: { label: 'Download',       classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  download_spent:  { label: 'Spent',            classes: 'bg-rose-50 text-rose-700 border border-rose-200' },
  upvote_received: { label: 'Upvote',           classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  admin_grant:     { label: 'Admin Grant',      classes: 'bg-purple-50 text-purple-700 border border-purple-200' },
  qa_rating:       { label: 'Q&A Rating',       classes: 'bg-teal-50 text-teal-700 border border-teal-200' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? { label: status, classes: 'bg-slate-100 text-slate-600 border border-slate-200' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
