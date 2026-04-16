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
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [method, setMethod] = useState<AuthMethod>('google');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Shokhzod' && password === 'Shokhzod03@') {
      // Since we don't have a real password auth backend for these specific creds yet,
      // and we are using Supabase Magic Links/Google, we can't easily "log in" without a token.
      // But we can inform the user how to proceed or just show a message.
      // Actually, for a real app, you'd use supabase.auth.signInWithPassword.
      setError('Credentials login is currently for demo display. Please use Google or Magic Link to access your account.');
    } else {
      setError('Invalid credentials. Use Shokhzod / Shokhzod03@');
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
            {/* Left Side - Visual Branding */}
            <div className="hidden md:flex md:w-5/12 bg-gray-900 relative overflow-hidden flex-col justify-between p-12 text-white">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-12">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20">
                    <Globe size={24} className="text-[#1D9E75]" />
                  </div>
                  <span className="text-xl font-black tracking-tight">Arzoni</span>
                </div>

                <div className="space-y-6">
                  <h2 className="text-4xl font-black leading-tight">
                    Universal <br />
                    Local Discovery
                  </h2>
                  <p className="text-gray-400 font-medium text-lg leading-relaxed">
                    Join thousands of users discovering the best local spots, 
                    sharing reviews, and exploring your city.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-12 border-t border-white/10">
                <div className="flex gap-4 items-center">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map(i => (
                      <img 
                        key={i}
                        src={`https://picsum.photos/seed/user${i}/100/100`} 
                        className="w-10 h-10 rounded-full border-2 border-gray-900"
                        alt="User"
                      />
                    ))}
                  </div>
                  <p className="text-sm font-bold text-gray-400">
                    <span className="text-white">+5k</span> reviews shared today
                  </p>
                </div>
              </div>

              {/* Atmospheric Gradients */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#1D9E75]/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Right Side - Auth Forms */}
            <div className="flex-1 p-8 md:p-16 relative bg-white">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={24} />
              </button>

              <div className="max-w-sm mx-auto">
                {sent ? (
                  <div className="text-center space-y-8 py-12">
                    <div className="w-24 h-24 bg-[#1D9E75]/10 rounded-full flex items-center justify-center text-[#1D9E75] mx-auto scale-110">
                      <CheckCircle2 size={48} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-gray-900 mb-4">{t('checkEmail')}</h3>
                      <p className="text-gray-500 font-medium leading-relaxed">
                        {t('magicLinkSent')} <span className="font-bold text-gray-900">{email}</span>. 
                        Please click the link to sign in securely.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-full bg-gray-900 text-white py-5 rounded-[1.25rem] font-black text-lg shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {t('gotIt')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black text-gray-900 tracking-tight">{t('login')}</h3>
                      <p className="text-gray-500 font-medium">{t('loginDescription')}</p>
                    </div>

                    {/* Method Selector */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl">
                      {(['google', 'magic', 'credentials'] as AuthMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMethod(m)}
                          className={cn(
                            "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            method === m 
                              ? "bg-white text-gray-900 shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          {m === 'google' ? 'Google' : m === 'magic' ? 'Email' : 'Demo'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {method === 'google' && (
                        <div className="space-y-6">
                          <button
                            onClick={() => signInWithGoogle()}
                            className="w-full h-16 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-4 group shadow-sm hover:shadow-md"
                          >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="text-lg">Continue with Google</span>
                          </button>
                          <p className="text-center text-xs font-bold text-gray-400 px-8 uppercase tracking-widest leading-relaxed">
                            Fastest way to get started with your existing account
                          </p>
                        </div>
                      )}

                      {method === 'magic' && (
                        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
                            <div className="relative">
                              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full pl-14 pr-5 h-16 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75] transition-all"
                              />
                            </div>
                          </div>

                          {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                              <AlertCircle size={18} className="shrink-0" />
                              <p>{error}</p>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1D9E75] text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-[#1D9E75]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                {t('sendMagicLink')}
                                <ArrowRight size={22} />
                              </>
                            )}
                          </button>
                        </form>
                      )}

                      {method === 'credentials' && (
                        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative">
                              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                              <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Shokhzod"
                                className="w-full pl-14 pr-5 h-16 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                              <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-14 pr-5 h-16 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>

                          {error && (
                            <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold border border-orange-100">
                              <AlertCircle size={18} className="shrink-0" />
                              <p>{error}</p>
                            </div>
                          )}

                          <button
                            type="submit"
                            className="w-full bg-blue-600 text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                          >
                            Login as Admin
                          </button>
                          <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <div className="flex items-center gap-2 text-[#1D9E75] mb-1">
                              <Shield size={14} />
                              <span className="text-[10px] font-black uppercase tracking-tight">Admin Credentials</span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-bold leading-tight">
                              Use the provided username and password to access the admin preview.
                            </p>
                          </div>
                        </form>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-400">
                        By continuing, you agree to our <br />
                        <button className="text-gray-900 border-b border-gray-100 hover:border-gray-900 transition-all">Terms of Service</button> and <button className="text-gray-900 border-b border-gray-100 hover:border-gray-900 transition-all">Privacy Policy</button>
                      </p>
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

