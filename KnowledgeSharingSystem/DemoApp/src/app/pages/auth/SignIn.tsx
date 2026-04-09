import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function SignIn() {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Left – Branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />
        <div className="relative flex flex-col justify-between h-full p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold">NeoShare</span>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Knowledge shared is<br />knowledge multiplied.
            </h2>
            <p className="text-blue-200 text-lg leading-relaxed">
              Join thousands of university students sharing study materials, earning points, and elevating their academic experience.
            </p>

            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { value: '12K+', label: 'Documents' },
                { value: '8.4K', label: 'Students' },
                { value: '140+', label: 'Courses' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-blue-200 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-blue-300 text-sm">© 2025 NeoShare University Platform</p>
        </div>
      </div>

      {/* Right – Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">NeoShare</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
            <p className="text-slate-500">Sign in to your NeoShare account.</p>
          </div>

          {/* Demo Role Switcher */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-xs text-blue-700 font-semibold mb-2">DEMO – Enter as:</p>
            <div className="flex gap-2">
              {[
                { label: 'User (45 pts)', path: '/' },
                { label: 'Moderator', path: '/moderator' },
                { label: 'Admin', path: '/admin' },
              ].map(role => (
                <button key={role.label} onClick={() => navigate(role.path)}
                  className="flex-1 text-xs bg-white border border-blue-200 text-blue-700 rounded-xl py-2 font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">University Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" placeholder="you@university.edu" defaultValue="alex.chen@mit.edu"
                  className="w-full border border-slate-200 bg-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link to="/auth/forgot" className="text-sm text-blue-600 hover:text-blue-700">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" defaultValue="password"
                  className="w-full border border-slate-200 bg-white rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-blue-600" defaultChecked />
              <label htmlFor="remember" className="text-sm text-slate-600">Remember me for 30 days</label>
            </div>

            <button onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
