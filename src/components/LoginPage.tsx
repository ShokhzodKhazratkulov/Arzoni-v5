import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, AlertCircle, Lock, ChevronLeft, MapPin } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, signInWithEmail, signInWithGoogle, signInAsAdmin } = useAuth();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, go back or to home
  useEffect(() => {
    if (user) {
      navigate(-1);
    }
  }, [user, navigate]);

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
          navigate(-1);
        } else {
          setError('Invalid admin credentials');
        }
      } else {
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
          <h1 className="text-3xl font-black text-gray-900">{t('welcomeBack')}</h1>
          <p className="text-gray-500 font-medium">{t('loginSubtitle')}</p>
        </div>

        {sent ? (
          <div className="text-center space-y-6 py-4">
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
              onClick={() => navigate('/')}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {t('gotIt')}
            </button>
          </div>
        ) : (
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 h-14 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/20 transition-all"
                  />
                </div>
              </div>

              {showPasswordField && (
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
              )}

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
                  <span>{t('signIn')}</span>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs font-bold text-gray-400">
                {t('noAccount')} <button className="text-[#1D9E75] hover:underline">{t('joinArzoni')}</button>
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
