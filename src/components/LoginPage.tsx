import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, AlertCircle, Lock, ChevronLeft, MapPin } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, go back or to home
  useEffect(() => {
    if (user) {
      navigate(-1);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        setError('Please check your email to verify your account or sign in if verification is disabled.');
      } else {
        await signIn(email, password);
        navigate(-1);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl p-8 md:p-12 space-y-8 relative"
      >
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#1D9E75] rounded-xl flex items-center justify-center text-white shadow-lg mx-auto mb-4">
            <MapPin size={24} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">
            {isSignUp ? t('joinArzoni') : t('welcomeBack')}
          </h1>
          <p className="text-gray-500 font-medium">
            {isSignUp ? 'Create your profile to start exploring' : t('loginSubtitle')}
          </p>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 h-14 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-4 h-14 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 h-14 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                <AlertCircle size={14} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D9E75] text-white h-14 rounded-2xl font-black text-base shadow-lg shadow-[#1D9E75]/10 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isSignUp ? 'Sign Up' : t('signIn')}</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs font-bold text-gray-400">
              {isSignUp ? 'Already have an account?' : t('noAccount')}{' '}
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#1D9E75] hover:underline"
              >
                {isSignUp ? t('signIn') : t('joinArzoni')}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
