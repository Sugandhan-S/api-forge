import { useState, useCallback } from 'react';
import { X, Zap, Mail, Lock, User, Eye, EyeOff, UserCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { signIn, signUp, continueAsGuest } = useAuth();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const error = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name);

      if (error) {
        setErrorMsg(error);
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, name, signIn, signUp, onClose]);

  const handleGuest = useCallback(() => {
    continueAsGuest();
    onClose();
  }, [continueAsGuest, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[380px] bg-[#12131a] rounded-2xl border border-[#1e2030]
                      shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1e2030]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa]
                              shadow-[0_0_12px_rgba(108,99,255,0.3)]">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">APIForge</span>
            </div>
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1] hover:bg-[#1a1b25]
                         transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-white">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-[#6e7191] mt-1">
            {mode === 'signin' ? 'Sign in to save your projects' : 'Start building APIs visually'}
          </p>
        </div>

        <div className="px-6 py-5">
          {!isSupabaseConfigured && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] text-amber-400">
                <strong>Note:</strong> Supabase not configured — auth disabled. Use Guest Mode to continue.
              </p>
            </div>
          )}

          {isSupabaseConfigured && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7191]" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                               text-sm text-[#e4e5f1] placeholder-[#2a2d45]
                               focus:outline-none focus:border-[#6c63ff]/50
                               transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7191]" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                             text-sm text-[#e4e5f1] placeholder-[#2a2d45]
                             focus:outline-none focus:border-[#6c63ff]/50
                             transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7191]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                             text-sm text-[#e4e5f1] placeholder-[#2a2d45]
                             focus:outline-none focus:border-[#6c63ff]/50
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7191]
                             hover:text-[#e4e5f1] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 px-1">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#6c63ff] to-[#a78bfa]
                           text-sm font-semibold text-white
                           hover:shadow-[0_0_20px_rgba(108,99,255,0.35)]
                           active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[#1e2030]" />
                <span className="text-[10px] text-[#2a2d45]">OR</span>
                <div className="flex-1 h-px bg-[#1e2030]" />
              </div>
            </form>
          )}

          {/* Guest Mode */}
          <button
            type="button"
            onClick={handleGuest}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                       bg-[#1a1b25] border border-[#1e2030]
                       text-sm font-medium text-[#6e7191] hover:text-[#e4e5f1]
                       hover:border-[#2a2d45] transition-all cursor-pointer"
          >
            <UserCircle2 className="w-4 h-4" />
            Continue as Guest
          </button>

          {isSupabaseConfigured && (
            <p className="text-center text-[11px] text-[#6e7191] mt-4">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrorMsg(''); }}
                className="text-[#6c63ff] hover:text-[#a78bfa] font-medium transition-colors cursor-pointer"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
