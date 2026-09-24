import React, { useState } from 'react';
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useMedia } from '../context/MediaContext';
import { UserAccount } from '../types';

export const CreateAccount: React.FC = () => {
  const { register, setAppView } = useMedia();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [accountType, setAccountType] = useState<UserAccount['accountType']>('Marketing agency');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accountTypes: UserAccount['accountType'][] = [
    'Creator',
    'Business',
    'Marketing agency',
    'Personal brand',
    'E-commerce',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please provide your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMessage('Please provide a valid work email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!organization.trim()) {
      setErrorMessage('Please provide your brand or organization name.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName,
        email,
        organization,
        accountType,
      });
      // Will navigate to 'onboarding' via context
    } catch {
      setErrorMessage('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#0284C7]/20">
      {/* Background glow accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-[#0284C7]/15 to-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-3">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] tracking-tight">
          Create Your Media Navigator Workspace
        </h2>
        <p className="text-xs text-[#64748B]">
          Connect channels, analyze content patterns, and scale reach with grounded AI intelligence.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl border border-[#E2E8F0] rounded-2xl sm:px-10 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] pl-10"
                    required
                  />
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Brand or Org Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Veritas Media Labs"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] pl-10"
                    required
                  />
                  <Building2 className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] pl-10"
                  required
                />
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] pl-10"
                  required
                />
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {accountTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between border ${
                      accountType === type
                        ? 'bg-[#0B132B] text-white border-[#0B132B]'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-slate-100'
                    }`}
                  >
                    <span>{type}</span>
                    {accountType === type && <CheckCircle2 className="w-3.5 h-3.5 text-[#06B6D4]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 text-[#0284C7] rounded border-[#CBD5E1] mt-0.5"
                  required
                />
                <span className="text-xs text-[#64748B] leading-relaxed">
                  I agree to the Media Navigator <span className="text-[#0284C7] underline">Terms of Service</span> and <span className="text-[#0284C7] underline">Privacy Policy</span>. We only request read-only access to official platform APIs.
                </span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0B132B] text-white text-sm font-semibold hover:bg-[#1C2541] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <span>Setting up workspace...</span>
                ) : (
                  <>
                    <span>Continue to Brand Setup</span>
                    <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-[#E2E8F0] text-center space-y-3">
            <p className="text-xs text-[#64748B]">
              Already have an account?{' '}
              <button
                onClick={() => setAppView('signin')}
                className="font-semibold text-[#0284C7] hover:underline"
              >
                Sign In
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

        <div className="mt-6 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Strict OAuth token confidentiality · No unsolicited posts</span>
        </div>
      </div>
    </div>
  );
};
