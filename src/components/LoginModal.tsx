import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, ArrowRight, CheckCircle2, AlertCircle, Shield, User, Lock, Globe } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMethod = 'google' | 'magic' | 'credentials';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[500px]"
          >
            <div className="p-8 md:p-12 relative flex flex-col items-center justify-center">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>

              <div className="w-full max-w-[340px] space-y-8">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-[#0f172a] mb-2">
                    {isSignUp ? 'Join Arzoni' : t('welcomeBack')}
                  </h3>
                  <p className="text-gray-500 font-medium">
                    {isSignUp ? 'Create your profile' : t('loginSubtitle')}
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
                        <p className="leading-tight">{error}</p>
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
                        type="button"
                      >
                        {isSignUp ? t('signIn') : t('joinArzoni')}
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

