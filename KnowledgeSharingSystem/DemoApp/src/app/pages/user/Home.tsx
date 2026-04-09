import { Link } from 'react-router';
import { Search, TrendingUp, BookOpen, Zap, ArrowRight, ChevronRight, Clock, Star, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentCard } from '../../components/common/DocumentCard';
import { Avatar } from '../../components/common/Avatar';
import { continueReadingDocs, trendingDocs, categories, documents, users } from '../../data/mockData';

const heroImage = "https://images.unsplash.com/photo-1718327453695-4d32b94c90a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMGxpYnJhcnl8ZW58MXx8fHwxNzc1MjkxMjQ4fDA&ixlib=rb-4.1.0&q=80&w=1080";

const featuredCategories = categories.slice(0, 6);

export default function Home() {
  const { user } = useApp();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-10">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 min-h-[280px] flex items-center">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent" />
        <div className="relative z-10 p-8 lg:p-12 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full border border-white/30 font-medium">
              👋 Welcome back, {user.name.split(' ')[0]}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
            What will you learn today?
          </h1>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Access thousands of peer-reviewed study materials. Share what you know, unlock what you need.
          </p>

          {/* Search */}
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents, courses, topics…"
                className="w-full bg-white border-0 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
              />
            </div>
            <button className="bg-white text-blue-700 px-5 py-3.5 rounded-2xl font-medium hover:bg-blue-50 transition-colors shadow-lg text-sm whitespace-nowrap">
              Search
            </button>
          </div>

          {/* Quick tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {['Algorithms', 'Machine Learning', 'Organic Chemistry', 'Calculus'].map(tag => (
              <span key={tag} className="bg-white/10 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition-colors">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Stats floating card */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-4">
            {[
              { label: 'Your Points', value: user.points, icon: Zap, color: 'text-amber-300' },
              { label: 'Uploads', value: user.uploads, icon: BookOpen, color: 'text-teal-300' },
              { label: 'Followers', value: user.followers, icon: Users, color: 'text-blue-300' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{stat.value}</p>
                    <p className="text-blue-200 text-xs">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continue Reading */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Continue Reading
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Pick up where you left off</p>
          </div>
          <Link to="/library" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View library <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {continueReadingDocs.map(doc => (
            <div key={doc.id} className="min-w-[280px] max-w-[280px]">
              <Link to={`/document/${doc.id}`} className="group block">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden hover:-translate-y-0.5">
                  <div className={`bg-gradient-to-br ${doc.coverColor} h-20 relative`}>
                    <div className="absolute bottom-2 left-3 right-3">
                      <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-white h-full rounded-full" style={{ width: `${Math.random() * 60 + 20}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{doc.category}</span>
                    <h3 className="text-sm font-semibold text-slate-900 mt-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">{doc.title}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Avatar initials={doc.uploadedBy.initials} color={doc.uploadedBy.avatarColor} size="xs" />
                      <span className="text-xs text-slate-500 truncate">{doc.uploadedBy.name}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-500" />
              Trending This Week
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Most viewed and downloaded documents</p>
          </div>
          <Link to="/browse" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            Browse all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {trendingDocs.map((doc, i) => (
            <div key={doc.id} className="min-w-[260px] max-w-[260px]">
              <Link to={`/document/${doc.id}`} className="group block">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
                  <div className={`bg-gradient-to-br ${doc.coverColor} h-28 flex items-start p-3`}>
                    <span className="bg-black/30 text-white text-xs font-bold px-2 py-1 rounded-lg">#{i + 1}</span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{doc.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">{doc.views.toLocaleString()} views</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-slate-600">4.{Math.floor(Math.random() * 3 + 6)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Top Courses / Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              Top Course Areas
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Curated categories with the most active content</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {featuredCategories.map(cat => (
            <Link key={cat.id} to={`/browse?category=${cat.slug}`}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md p-4 text-center transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${cat.color}18` }}>
                <div className="w-4 h-4 rounded-md" style={{ backgroundColor: cat.color }} />
              </div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 leading-tight">{cat.name}</p>
              <p className="text-xs text-slate-400">{cat.documentCount} docs</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent uploads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900">Recently Added</h2>
            <p className="text-sm text-slate-500 mt-0.5">Latest approved documents on the platform</p>
          </div>
          <Link to="/browse" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.filter(d => d.status === 'approved').slice(0, 4).map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      </section>
    </div>
  );
}
