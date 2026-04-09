import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Mail, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react';

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  const navigate = useNavigate();

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) refs[idx + 1].current?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) refs[idx - 1].current?.focus();
  };

  const handleVerify = () => {
    setVerified(true);
    setTimeout(() => navigate('/'), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">NeoShare</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 text-center">
          {verified ? (
            <div className="py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verified!</h2>
              <p className="text-slate-500">Your account is confirmed. Redirecting…</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
              <p className="text-slate-500 mb-2">We sent a 6-digit verification code to</p>
              <p className="text-blue-700 font-semibold mb-8">alex.chen@mit.edu</p>

              {/* OTP inputs */}
              <div className="flex gap-3 justify-center mb-8">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={refs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleInput(idx, e.target.value)}
                    onKeyDown={e => handleKey(idx, e)}
                    className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all focus:outline-none
                      ${digit ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                  />
                ))}
              </div>

              <button onClick={handleVerify}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md mb-4">
                Verify Email
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-sm text-slate-500">
                Didn't receive the code?{' '}
                <button className="text-blue-600 font-medium hover:text-blue-700 inline-flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Resend (2:47)
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
