import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
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
          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password updated!</h2>
              <p className="text-slate-500 mb-6">Your password has been reset successfully.</p>
              <button onClick={() => navigate('/auth/signin')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium">
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Set new password</h1>
                <p className="text-slate-500">Your new password must be different from previous passwords.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={show ? 'text' : 'password'} placeholder="Min. 8 characters"
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
                    <button onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="password" placeholder="Re-enter password"
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all" />
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  {[
                    { met: true,  label: 'At least 8 characters' },
                    { met: false, label: 'Contains uppercase letter' },
                    { met: true,  label: 'Contains a number' },
                    { met: false, label: 'Contains a special character' },
                  ].map(req => (
                    <div key={req.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <span className={`text-xs ${req.met ? 'text-emerald-700' : 'text-slate-500'}`}>{req.label}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => setDone(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md">
                  Reset Password
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
