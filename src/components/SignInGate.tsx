import React from 'react';
import { Paintbrush, ArrowRight, CheckCircle2, Lock, Sparkles, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface SignInGateProps {
  onSignInWithGoogle: () => Promise<void>;
  onContinueAsGuest: () => void;
  loading: boolean;
  authErrorModalOpen?: boolean;
  onOpenAuthHelp?: () => void;
}

export default function SignInGate({
  onSignInWithGoogle,
  onContinueAsGuest,
  loading,
  onOpenAuthHelp
}: SignInGateProps) {
  const handleGoogleClick = async () => {
    await onSignInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-zinc-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Bar */}
      <header className="px-6 py-5 border-b border-[#222225] flex items-center justify-between relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
            <Paintbrush className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-extrabold text-white text-xl tracking-tight block leading-none">
              PaintNav
            </span>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wider block mt-0.5">
              PAINTING CRM & ESTIMATING SYSTEM
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinueAsGuest}
          className="text-xs text-zinc-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-mono"
        >
          <span>Explore Demo Mode</span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </header>

      {/* Main Sign In Content Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-6">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Brand Intro & Capabilities */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Workspace Access</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Welcome to PaintNav
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Connect your Google account to access your customer lead manager, estimate generator, PaintScout work orders, and Google Drive cloud storage.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { title: 'Full Proposal & Estimating Suite', desc: 'Generate itemized interior and exterior painting quotes with exact surface formulas.' },
                { title: 'PaintScout Freeform Work Orders', desc: 'Live room-by-room spec editors with crew instructions and quick paint snippets.' },
                { title: 'Google Drive & Cloud Sync', desc: 'Save client documents and signed contracts directly into your Google Drive.' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-neutral-900/50 border border-neutral-800/80 p-3.5 rounded-2xl">
                  <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{feature.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Direct 1-Click Sign In Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden"
          >
            <div className="space-y-2 border-b border-neutral-800 pb-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-white text-xl">Sign In with Google</h2>
                <span className="p-2 bg-neutral-800 rounded-xl text-zinc-400">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Click below to open the secure Google account selector and authenticate your PaintNav workspace.
              </p>
            </div>

            <div className="space-y-4">
              {/* Primary 1-Click Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3.5 px-5 rounded-xl transition duration-150 shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign In with Google Account</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 p-3 bg-neutral-950/40 border border-neutral-800/60 rounded-xl text-zinc-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] leading-snug">
                  Direct Google OAuth popup. Select any authorized Google or Google Workspace email.
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 space-y-3 text-center">
              <p className="text-[11px] text-zinc-500 leading-snug">
                Your email is used for authentication and permissions across PaintNav. We never share or sell your information.
              </p>

              {onOpenAuthHelp && (
                <button
                  type="button"
                  onClick={onOpenAuthHelp}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer inline-flex items-center gap-1 font-mono"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Having trouble signing in? View OAuth troubleshooting</span>
                </button>
              )}
            </div>

            <div className="bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-850 flex items-center justify-between text-xs">
              <span className="text-zinc-400 text-[11px]">Don't want to sign in right now?</span>
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs font-bold text-zinc-300 hover:text-white underline cursor-pointer font-mono"
              >
                Skip & Continue as Guest
              </button>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[#222225] text-center text-[10px] text-zinc-500 font-mono relative z-10">
        PaintNav CRM • Secure Google OAuth Authentication Engine
      </footer>
    </div>
  );
}
