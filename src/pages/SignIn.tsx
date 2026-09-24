import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Lock, 
  Mail, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useMedia } from '../context/MediaContext';

export const SignIn: React.FC = () => {
  const { login, setAppView } = useMedia();
  const [email, setEmail] = useState('alex@veritasmedia.co');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const ok = await login(email, password);
      if (!ok) {
        setErrorMessage('Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setErrorMessage('A network error occurred while connecting to the authentication service.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    await login('demo@medianavigator.io', 'password123');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#0284C7]/20">
      {/* Background glow accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-[#0284C7]/15 to-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header with back to landing */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h2 className="text-2xl font-extrabold text-[#0B132B] tracking-tight">
          Sign In to Media Navigator
        </h2>
        <p className="text-xs text-[#64748B]">
          Access your connected channels, intelligence signals, and growth audits.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-[#E2E8F0] rounded-2xl sm:px-10 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent transition-all pl-10"
                  required
                />
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-[#0284C7] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent transition-all pl-10 pr-10"
                  required
                />
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#0284C7] rounded border-[#CBD5E1] focus:ring-[#0284C7]"
                />
                <span className="text-xs text-[#64748B]">Remember this device</span>
              </label>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0B132B] text-white text-sm font-semibold hover:bg-[#1C2541] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20 text-xs font-semibold hover:bg-[#0284C7]/15 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Demo Workspace Access</span>
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-[#E2E8F0] text-center space-y-3">
            <p className="text-xs text-[#64748B]">
              Don't have an account?{' '}
              <button
                onClick={() => setAppView('signup')}
                className="font-semibold text-[#0284C7] hover:underline"
              >
                Create Workspace
              </button>
            </p>

            <button
              onClick={() => setAppView('landing')}
              className="text-xs text-[#94A3B8] hover:text-[#475569]"
            >
              ← Back to Landing
            </button>
          </div>
        </div>

        {/* Security Reassurance */}
        <div className="mt-6 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Encrypted with OAuth 2.0 PKCE & official platform guidelines</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B132B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#0B132B]">Reset Your Password</h3>
            <p className="text-xs text-[#64748B]">
              Enter your work email address and we'll send you an encrypted recovery link.
            </p>
            {forgotSent ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                Password recovery link has been dispatched to {email}.
              </div>
            ) : (
              <input
                type="email"
                defaultValue={email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A]"
                placeholder="name@company.com"
              />
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotSent(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-slate-100"
              >
                Close
              </button>
              {!forgotSent && (
                <button
                  onClick={() => setForgotSent(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B132B] text-white hover:bg-[#1C2541]"
                >
                  Send Link
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
