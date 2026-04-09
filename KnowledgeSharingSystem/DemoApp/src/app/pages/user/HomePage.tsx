import React from "react";
import { useNavigate } from "react-router";
import { Search, TrendingUp, BookOpen, ChevronRight, Zap, Upload, Star, ArrowRight, Flame, Clock } from "lucide-react";
import { DocumentCard } from "../../components/shared/DocumentCard";
import { PointsDisplay, PointsTierBadge } from "../../components/shared/PointsDisplay";
import { documents, categories, currentUser } from "../../data/mockData";

const continueReading = documents.slice(0, 4);
const trending = documents.filter((d) => d.isTrending).slice(0, 5);

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 max-w-screen-xl mx-auto">
      {/* Hero / Welcome */}
      <div
        className="relative rounded-3xl overflow-hidden p-8 text-white"
        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #1E40AF 55%, #0D9488 100%)", minHeight: "220px" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 10% 30%, white 1px, transparent 1px), radial-gradient(circle at 90% 70%, white 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        <div className="absolute right-0 top-0 w-72 h-full opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1769284062487-f15ae67a3d10?w=600&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute right-0 top-0 w-72 h-full bg-gradient-to-l from-transparent to-blue-900/80" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <PointsDisplay points={currentUser.points} size="sm" />
            <PointsTierBadge points={currentUser.points} />
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Good afternoon, {currentUser.name.split(" ")[0]} 👋
          </h1>
          <p className="text-white/70 text-sm mb-6">
            Continue your learning journey. You have <strong className="text-white">47 points</strong> — keep engaging to unlock full download access at 40+.
          </p>

          {/* Global Search */}
          <div className="relative max-w-lg">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search documents, courses, topics, authors..."
              className="w-full pl-11 pr-32 py-3 rounded-2xl text-sm text-slate-800 bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-slate-400"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}>
              Search
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="absolute right-8 bottom-6 hidden xl:flex gap-3">
          {[
            { icon: Zap, label: "Points", value: currentUser.points, color: "#FCD34D" },
            { icon: Upload, label: "Uploads", value: currentUser.uploads, color: "#34D399" },
            { icon: Star, label: "Upvotes", value: currentUser.upvotes, color: "#F472B6" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-4 py-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.10)", backdropFilter: "blur(8px)" }}>
              <s.icon size={16} style={{ color: s.color }} className="mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Continue Reading */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Continue Reading</h2>
          </div>
          <button onClick={() => navigate("/app/library")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
            View library <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {continueReading.map((doc) => (
            <div key={doc.id} className="relative flex-shrink-0">
              <DocumentCard doc={doc} variant="horizontal" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center">
                <Clock size={10} className="text-white" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-rose-500" />
            <h2 className="text-base font-semibold text-slate-900">Trending This Week</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Live</span>
          </div>
          <button onClick={() => navigate("/app/browse")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Browse all <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {trending.map((doc, i) => (
            <div key={doc.id} className="relative flex-shrink-0">
              <DocumentCard doc={doc} variant="horizontal" />
              <div
                className="absolute -top-2 -left-2 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                style={{ background: i === 0 ? "#DC2626" : i === 1 ? "#EA580C" : "#2563EB" }}
              >
                #{i + 1}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Courses / Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-teal-600" />
            <h2 className="text-base font-semibold text-slate-900">Top Courses For You</h2>
          </div>
          <button onClick={() => navigate("/app/browse")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Explore all <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate("/app/browse")}
              className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-100 hover:shadow-md transition-all duration-200"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                style={{ background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}25)` }}
              >
                {cat.icon}
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{cat.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.count} docs</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Documents Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">Recently Added</h2>
          </div>
          <button onClick={() => navigate("/app/browse")} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.slice(0, 3).map((doc) => (
            <DocumentCard key={doc.id} doc={doc} variant="grid" />
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <div className="rounded-2xl p-6 flex items-center justify-between gap-6" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDFA)", border: "1px solid #A7F3D0" }}>
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Earn More Points by Contributing</h3>
          <p className="text-sm text-slate-600">Upload quality study materials and reach 40 points to unlock full download access.</p>
        </div>
        <button
          onClick={() => navigate("/app/upload")}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}
        >
          Upload Now <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
