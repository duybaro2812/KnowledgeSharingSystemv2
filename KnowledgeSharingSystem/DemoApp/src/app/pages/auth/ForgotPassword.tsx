import { Link, useNavigate } from 'react-router';
import { BookOpen, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">NeoShare</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8">
          <Link to="/auth/signin" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>

          <div className="mb-8">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset your password</h1>
            <p className="text-slate-500">Enter your university email and we'll send you reset instructions.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">University Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" placeholder="you@university.edu"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
              </div>
            </div>

            <button onClick={() => navigate('/auth/reset')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md">
              Send Reset Link
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              We'll send a secure reset link valid for 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
