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
  const { signInWithEmail, signInWithGoogle, signInAsAdmin } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPasswordField = identity.trim() === 'Shokhzod';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) return;

    setLoading(true);
    setError(null);
    try {
      if (showPasswordField) {
        const success = await signInAsAdmin(identity, password);
        if (success) {
          onClose();
        } else {
          setError('Invalid admin credentials');
        }
      } else {
        // Assume email for magic link
        await signInWithEmail(identity);
        setSent(true);
      }
    } catch (err: any) {
      console.error('Login error:', err);
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
            className="relative w-full max-w-4xl bg-white md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]"
          >
            {/* Form Side */}
            <div className="flex-1 p-8 md:p-12 relative bg-white flex flex-col items-center justify-center">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>

              <div className="w-full max-w-[340px] space-y-8">
                {sent ? (
                  <div className="text-center space-y-6 py-8">
                    <div className="w-20 h-20 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-[#1D9E75] mx-auto">
                      <CheckCircle2 size={40} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">{t('checkEmail')}</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        {t('magicLinkSent')} <span className="font-bold text-gray-900">{identity}</span>.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {t('gotIt')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center md:text-left">
                      <h3 className="text-4xl font-black text-[#0f172a] mb-2">{t('welcomeBack')}</h3>
                      <p className="text-gray-500 font-medium">{t('enterDetailsToContinue')}</p>
                    </div>

                    <div className="space-y-6">
                      <button
                        onClick={() => signInWithGoogle()}
                        className="w-full h-14 bg-white border border-gray-200 text-gray-900 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        <span className="text-sm">{t('continueWithGoogle')}</span>
                      </button>

                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-100"></div>
                        </div>
                        <span className="relative px-3 bg-white text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('orEmail')}</span>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                              type="text"
                              required
                              value={identity}
                              onChange={(e) => setIdentity(e.target.value)}
                              placeholder="name@example.com"
                              className="w-full pl-12 pr-4 h-14 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f39c12]/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('password') || 'Password'}</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                              type="password"
                              required={showPasswordField}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-12 pr-4 h-14 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f39c12]/20 transition-all"
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
                          className="w-full bg-[#ec8d32] text-white h-14 rounded-2xl font-black text-base shadow-lg shadow-orange-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <span>{showPasswordField ? 'Sign in as Admin' : t('signIn')}</span>
                          )}
                        </button>
                      </form>

                      <div className="text-center pt-2">
                        <p className="text-xs font-bold text-gray-400">
                          {t('dontHaveAccount')} <button className="text-[#ec8d32] hover:underline whitespace-nowrap">{t('joinArzoni')}</button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

