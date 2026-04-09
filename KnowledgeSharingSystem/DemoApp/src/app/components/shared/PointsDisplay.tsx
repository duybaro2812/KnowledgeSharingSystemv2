import React from "react";
import { Zap } from "lucide-react";

interface PointsDisplayProps {
  points: number;
  size?: "sm" | "md" | "lg";
  showTier?: boolean;
}

export function PointsDisplay({ points, size = "md", showTier = false }: PointsDisplayProps) {
  const getTier = (pts: number) => {
    if (pts >= 40) return { label: "Full Access", color: "#059669", bg: "#ECFDF5" };
    if (pts >= 30) return { label: "Limited Access", color: "#D97706", bg: "#FFFBEB" };
    return { label: "Restricted", color: "#DC2626", bg: "#FEF2F2" };
  };

  const tier = getTier(points);

  const sizeClasses = {
    sm: "text-xs gap-1 px-2 py-0.5",
    md: "text-sm gap-1.5 px-2.5 py-1",
    lg: "text-base gap-2 px-3 py-1.5",
  };

  const iconSizes = { sm: 11, md: 13, lg: 15 };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]}`}
        style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
      >
        <Zap size={iconSizes[size]} fill="#2563EB" />
        <span>{points} pts</span>
      </div>
      {showTier && (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full`}
          style={{ backgroundColor: tier.bg, color: tier.color }}
        >
          {tier.label}
        </span>
      )}
    </div>
  );
}

export function PointsTierBadge({ points }: { points: number }) {
  if (points >= 40) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Gold Tier
      </span>
    );
  }
  if (points >= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Silver Tier
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
      Bronze Tier
    </span>
  );
}
