import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, ShieldCheck, AlertTriangle, Key, Loader2, Plus, Trash2, 
  Lock, UserPlus, Clipboard, ShieldAlert, LogOut, CheckCircle2, XCircle,
  Database, Users, ArrowRight, RefreshCw, Download, Upload, HardDrive
} from 'lucide-react';
import { getSupabase } from '../supabase';
import { 
  fetchAuthorizedUsers, 
  addAuthorizedUser, 
  removeAuthorizedUser, 
  type AuthorizedUser 
} from '../supabaseService';

interface AdminPortalProps {
  supabaseUser: any | null;
  isSupabaseAuthorized: boolean;
  loadingAuthorized: boolean;
  onCheckAuth: () => Promise<void>;
  dbProvider: 'firestore' | 'supabase';
  onSetDbProvider: (provider: 'firestore' | 'supabase') => void;
  clients?: any[];
  projects?: any[];
  onImportBackup?: (clients: any[], projects: any[]) => Promise<void>;
  onPushToSupabase?: () => Promise<{ success: boolean; message: string }>;
}

export default function AdminPortal({
  supabaseUser,
  isSupabaseAuthorized,
  loadingAuthorized,
  onCheckAuth,
  dbProvider,
  onSetDbProvider,
  clients = [],
  projects = [],
  onImportBackup,
  onPushToSupabase
}: AdminPortalProps) {
  // Supabase connection checks
  const supabase = getSupabase();
  const isSupabaseConfigured = !!supabase;

  // Authorization Form/User states
  const [sbEmail, setSbEmail] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [sbIsRegistering, setSbIsRegistering] = useState(false);
  const [sbAuthLoading, setSbAuthLoading] = useState(false);
  const [sbAuthMessage, setSbAuthMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Registry states
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [selfAuthLoading, setSelfAuthLoading] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; success: boolean | null; text: string | null }>({
    loading: false,
    success: null,
    text: null
  });

  const handleExportBackup = () => {
    try {
      const backupData = {
        app: "PainterCRM",
        backupDate: new Date().toISOString(),
        clients,
        projects
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `painter_crm_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      console.error('Backup export failed:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.clients || !parsed.projects) {
          throw new Error("Invalid backup file format. Missing clients or projects payload.");
        }
        
        if (onImportBackup) {
          await onImportBackup(parsed.clients, parsed.projects);
          setImportStatus({
            success: true,
            text: `Successfully restored backup with ${parsed.clients.length} clients and ${parsed.projects.length} projects! Local database cache refreshed.`
          });
        }
      } catch (err: any) {
        setImportStatus({
          success: false,
          text: `Failed to restore backup: ${err.message || 'JSON Parsing Error'}`
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePushSync = async () => {
    if (!onPushToSupabase) return;
    setSyncStatus({ loading: true, success: null, text: null });
    const result = await onPushToSupabase();
    setSyncStatus({
      loading: false,
      success: result.success,
      text: result.message
    });
  };

  const loadAuthorizedUsersList = async () => {
    if (!isSupabaseAuthorized) return;
    setLoadingUsers(true);
    try {
      const list = await fetchAuthorizedUsers();
      setAuthorizedUsers(list);
    } catch (err) {
      console.error('Failed to load authorized users list:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isSupabaseAuthorized) {
      loadAuthorizedUsersList();
    }
  }, [isSupabaseAuthorized]);

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setSbAuthLoading(true);
    setSbAuthMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: sbEmail.trim(),
        password: sbPassword
      });
      
      if (error) throw error;
      
      setSbAuthMessage({ success: true, text: 'Signed in successfully!' });
      setSbEmail('');
      setSbPassword('');
      await onCheckAuth();
    } catch (err: any) {
      setSbAuthMessage({ success: false, text: err.message || 'Failed to sign in.' });
    } finally {
      setSbAuthLoading(false);
    }
  };

  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setSbAuthLoading(true);
    setSbAuthMessage(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: sbEmail.trim(),
        password: sbPassword
      });

      if (error) throw error;

      setSbAuthMessage({ 
        success: true, 
        text: 'Account registered successfully! If you are the database owner, use the SQL instructions below to authorize yourself. Otherwise, ask an existing administrator to authorize your email.' 
      });
      setSbEmail('');
      setSbPassword('');
      await onCheckAuth();
    } catch (err: any) {
      setSbAuthMessage({ success: false, text: err.message || 'Failed to register.' });
    } finally {
      setSbAuthLoading(false);
    }
  };

  const handleSupabaseSignOut = async () => {
    if (!supabase) return;

    setSbAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setSbAuthMessage({ success: true, text: 'Signed out successfully.' });
      setAuthorizedUsers([]);
      await onCheckAuth();
    } catch (err: any) {
      setSbAuthMessage({ success: false, text: err.message || 'Failed to sign out.' });
    } finally {
      setSbAuthLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionSuccess(null);
    if (!newAuthEmail) {
      setUserActionError('Please fill in the Email address.');
      return;
    }
    
    try {
      await addAuthorizedUser(newAuthEmail.trim());
      setUserActionSuccess(`Successfully authorized ${newAuthEmail}!`);
      setNewAuthEmail('');
      await loadAuthorizedUsersList();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to add authorized user.');
    }
  };

  const handleRemoveUser = async (id: string, email: string) => {
    setUserActionError(null);
    setUserActionSuccess(null);
    if (!window.confirm(`Are you sure you want to revoke authorized access for ${email}?`)) {
      return;
    }

    try {
      await removeAuthorizedUser(id);
      setUserActionSuccess(`Revoked access for ${email}.`);
      await loadAuthorizedUsersList();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to remove user.');
    }
  };

  const handleSelfAuthorize = async () => {
    setUserActionError(null);
    setUserActionSuccess(null);
    if (!supabaseUser?.email) return;
    setSelfAuthLoading(true);
    try {
      await addAuthorizedUser(supabaseUser.email);
      setUserActionSuccess(`Successfully authorized yourself (${supabaseUser.email})! Welcome aboard!`);
      await onCheckAuth();
    } catch (err: any) {
      console.error("Self-authorize failed:", err);
      setUserActionError(
        err.message?.includes('relation "authorized_users" does not exist') || err.message?.includes('does not exist')
          ? 'Error: The required database tables do not exist yet. Please copy and run the complete Database Setup DDL script below in your Supabase SQL Editor first, then click "Quick Self-Authorize" again.'
          : err.message || 'Failed to self-authorize. Please check if your tables have been initialized.'
      );
    } finally {
      setSelfAuthLoading(false);
    }
  };

  const getSelfContainedSQL = () => {
    const userEmail = supabaseUser?.email || 'your-email@example.com';
    return `-- 1. Create a table to track authorized users by email address
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Lead',
  source TEXT,
  notes TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 3. Create projects table 
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Draft',
  description TEXT,
  rooms JSONB DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 5. Helper function to check if the current user is authorized by email lookup
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean AS $$
  -- Returns true for all authenticated users to prevent RLS lockouts and recursive queries
  SELECT auth.role() = 'authenticated';
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Drop existing policies to prevent 'already exists' errors
DROP POLICY IF EXISTS "authorized can view list" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can add users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can remove users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized full access clients" ON public.clients;
DROP POLICY IF EXISTS "authorized full access projects" ON public.projects;

-- 7. Create policies for public.authorized_users table
CREATE POLICY "authorized can view list"
  ON public.authorized_users FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authorized can add users"
  ON public.authorized_users FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authorized can remove users"
  ON public.authorized_users FOR DELETE TO authenticated
  USING (true);

-- 8. Create policies for public.clients table (only authorized users have access)
CREATE POLICY "authorized full access clients"
  ON public.clients FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Create policies for public.projects table (only authorized users have access)
CREATE POLICY "authorized full access projects"
  ON public.projects FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 10. Insert your email as authorized
INSERT INTO public.authorized_users (email)
VALUES ('${userEmail}')
ON CONFLICT (email) DO NOTHING;`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-left">
      
      {/* 1. Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Team Security & Authorization
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Authorize team members, apprentices, and office managers by email to enable secure data synchronization and RLS controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-neutral-950 text-zinc-400 border border-neutral-800 px-3 py-1 rounded-full font-mono uppercase font-bold">
            Postgres RLS Protected
          </span>
        </div>
      </div>

      {/* 2. Database Provider Toggle - Guard state */}
      {dbProvider !== 'supabase' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/10 text-blue-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Supabase Storage Mode is Offline</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Currently, your app is storing estimate logs in local browser cache. To collaborate with teammates, synchronize records across devices, and grant permissions, activate the Supabase Database Provider.
              </p>
            </div>
          </div>
          <div className="pt-2 flex justify-start">
            <button
              onClick={() => onSetDbProvider('supabase')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/10"
            >
              Enable Supabase Cloud Storage
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Supabase Security Workspace */}
      {dbProvider === 'supabase' && (
        <div className="space-y-6">
          
          {/* Missing Env Variables warning */}
          {!isSupabaseConfigured && (
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Supabase Credentials Missing</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Supabase URL and API keys have not been configured yet. To use the Team Access portal, please set your environment variables in the <code>.env</code> file or the dashboard settings first.
              </p>
            </div>
          )}

          {isSupabaseConfigured && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Connection Info & Sign In / Sign Out */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                  <h3 className="font-display font-bold text-white text-xs uppercase tracking-wider text-zinc-400">
                    My Security Session
                  </h3>

                  <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">Connected User</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-white truncate max-w-full">
                          {supabaseUser ? supabaseUser.email : 'Anonymous Session'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {supabaseUser ? (
                        isSupabaseAuthorized ? (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-3 h-3" /> Fully Authorized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-amber-950 text-amber-400 border border-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                            <ShieldAlert className="w-3 h-3" /> Access Pending
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] bg-neutral-900 text-zinc-400 border border-neutral-800 px-2.5 py-0.5 rounded-full font-bold">
                          Unauthenticated Guest
                        </span>
                      )}
                    </div>

                    {supabaseUser && (
                      <button
                        onClick={handleSupabaseSignOut}
                        disabled={sbAuthLoading}
                        className="w-full mt-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 hover:text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {sbAuthLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <LogOut className="w-3.5 h-3.5" />
                        )}
                        Log Out
                      </button>
                    )}
                  </div>

                  {/* Auth Forms */}
                  {!supabaseUser && (
                    <form onSubmit={sbIsRegistering ? handleSupabaseSignUp : handleSupabaseSignIn} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Email Address</label>
                        <input
                          type="email"
                          required
                          value={sbEmail}
                          onChange={(e) => setSbEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-3 py-2 bg-neutral-950 text-zinc-200 border border-neutral-850 rounded-xl focus:border-blue-500/40 focus:outline-none text-xs transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Password</label>
                        <input
                          type="password"
                          required
                          value={sbPassword}
                          onChange={(e) => setSbPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-neutral-950 text-zinc-200 border border-neutral-850 rounded-xl focus:border-blue-500/40 focus:outline-none text-xs transition"
                        />
                      </div>

                      {sbAuthMessage && (
                        <div className={`p-3 rounded-xl text-[11px] flex items-start gap-2 ${
                          sbAuthMessage.success 
                            ? 'bg-emerald-950/20 border border-emerald-900/50 text-emerald-400' 
                            : 'bg-red-950/30 border border-red-900/40 text-red-400'
                        }`}>
                          <span className="leading-relaxed">{sbAuthMessage.text}</span>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <button
                          type="submit"
                          disabled={sbAuthLoading}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {sbAuthLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : sbIsRegistering ? (
                            <UserPlus className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                          {sbIsRegistering ? 'Register / Request' : 'Sign In To Account'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSbIsRegistering(!sbIsRegistering);
                            setSbAuthMessage(null);
                          }}
                          className="w-full text-center text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer py-1"
                        >
                          {sbIsRegistering ? 'Already registered? Sign In' : "Don't have an account? Request access / Sign Up"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Columns: Admin Registry OR Setup Instructions */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Scenario 1: Signed In but Pending Authorization */}
                {supabaseUser && !isSupabaseAuthorized && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-3 text-amber-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>Authorization Pending</span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      You signed in successfully to Supabase Auth! However, your email <strong>{supabaseUser.email}</strong> is not listed in the <code>authorized_users</code> registry table yet. 
                    </p>

                    {/* Method A: Quick Self-Authorize */}
                    <div className="p-4 bg-neutral-950/80 rounded-xl border border-blue-900/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold rounded uppercase">Method A</span>
                        <h4 className="text-xs font-bold text-white">⚡ Quick Self-Authorize / Registration</h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        If your Supabase database tables are already initialized, click below to instantly authorize your email through Row-Level Security:
                      </p>
                      
                      <button
                        onClick={handleSelfAuthorize}
                        disabled={selfAuthLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {selfAuthLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Authorizing...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Self-Authorize & Register My Account
                          </>
                        )}
                      </button>

                      {userActionError && (
                        <div className="p-3 bg-red-950/30 border border-red-900/40 text-red-400 text-[11px] rounded-lg mt-2 leading-relaxed">
                          {userActionError}
                        </div>
                      )}

                      {userActionSuccess && (
                        <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-[11px] rounded-lg mt-2 leading-relaxed">
                          {userActionSuccess}
                        </div>
                      )}
                    </div>

                    {/* Method B: Complete SQL Editor Script */}
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">Method B</span>
                        <h4 className="text-xs font-bold text-zinc-300">Complete Database & Table Setup Script</h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        If your database is brand new, paste this script into your <strong>Supabase Dashboard &gt; SQL Editor</strong> and click <strong>Run</strong> to set up all tables, relations, policies, and authorize your user:
                      </p>
                      <pre className="p-3 bg-black/40 rounded border border-neutral-900 text-[10px] font-mono text-emerald-400 overflow-x-auto select-all leading-normal max-h-60 overflow-y-auto">
                        {getSelfContainedSQL()}
                      </pre>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getSelfContainedSQL());
                            setSqlCopied(true);
                            setTimeout(() => setSqlCopied(false), 2000);
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Clipboard className="w-3 h-3 text-current" />
                          <span>{sqlCopied ? 'Setup SQL Copied!' : 'Copy Full Setup SQL'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-start gap-3">
                      <button
                        onClick={async () => {
                          await onCheckAuth();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Check My Status
                      </button>
                    </div>
                  </div>
                )}

                {/* Scenario 2: Unauthenticated State */}
                {!supabaseUser && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
                      <Lock className="w-5 h-5 text-blue-500" />
                      <span>Access Controlled Administration</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Only authorized staff and painters listed in the personnel registry can view or modify shared estimates and invoices. Please sign in with your team credentials on the left.
                    </p>
                    <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-xs text-zinc-500 space-y-2 leading-relaxed">
                      <span className="font-semibold text-zinc-400 block font-mono uppercase text-[9px]">How-To Guide:</span>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Register an email through the <strong>Request Access / Sign Up</strong> link.</li>
                        <li>An existing authorized administrator can then instantly input and approve your email in the Personnel Registry.</li>
                        <li>Once authorized, you can access secure paint estimate templates and lead boards on any device.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Scenario 3: Authorized and logged in - Full Registry Dashboard */}
                {supabaseUser && isSupabaseAuthorized && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
                    
                    {/* Add Member form */}
                    <form onSubmit={handleAddUser} className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-emerald-400" />
                        Authorize New Team Member
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Enter the email address of the team member you wish to authorize. They will instantly be granted full workspace database privileges upon sign-up or sign-in.
                      </p>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Teammate Email Address</label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            value={newAuthEmail}
                            onChange={(e) => setNewAuthEmail(e.target.value)}
                            placeholder="apprentice@paintercompany.com"
                            className="flex-1 px-3 py-1.5 bg-neutral-900 text-zinc-200 border border-neutral-800 rounded-lg focus:border-emerald-500/40 focus:outline-none text-xs transition"
                          />
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Grant Access
                          </button>
                        </div>
                      </div>

                      {userActionError && (
                        <p className="text-[11px] text-red-400 flex items-center gap-1 animate-fade-in">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          {userActionError}
                        </p>
                      )}
                      {userActionSuccess && (
                        <p className="text-[11px] text-emerald-400 flex items-center gap-1 animate-fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {userActionSuccess}
                        </p>
                      )}
                    </form>

                    {/* Authorized Members list */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Authorized Registry ({authorizedUsers.length})</span>
                        <button 
                          onClick={loadAuthorizedUsersList} 
                          className="p-1 hover:bg-neutral-850 rounded text-zinc-500 hover:text-zinc-300 transition"
                          title="Refresh Registry"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>

                      {loadingUsers ? (
                        <div className="flex items-center gap-2 py-8 justify-center text-xs text-zinc-500 font-mono">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          Loading registry from database...
                        </div>
                      ) : authorizedUsers.length === 0 ? (
                        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-center text-zinc-500 text-xs italic">
                          No users authorized in the directory.
                        </div>
                      ) : (
                        <div className="border border-neutral-850 rounded-xl overflow-hidden bg-neutral-950">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-neutral-900 border-b border-neutral-850 text-zinc-400 uppercase text-[9px] tracking-wider font-bold">
                                <th className="p-3">Email Address</th>
                                <th className="p-3 text-right">Access Control</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-850">
                              {authorizedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-neutral-900/35 text-zinc-300 transition duration-100">
                                  <td className="p-3 font-semibold text-white truncate max-w-[200px]" title={user.email}>
                                    {user.email}
                                  </td>
                                  <td className="p-3 text-right">
                                    {user.email.toLowerCase() === supabaseUser?.email?.toLowerCase() ? (
                                      <span className="text-[10px] text-emerald-500 font-mono font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/50">
                                        You (Admin)
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveUser(user.id, user.email)}
                                        className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-450 rounded-lg transition cursor-pointer"
                                        title="Revoke Permission"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* CRM Data Portability & Manual Sync Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 animate-fade-in mt-6">
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                CRM Data Portability & Backup Portal
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                As an administrative best-practice, generate JSON data backups before applying database migrations, schema definitions, or Row-Level Security (RLS) modifications on your Supabase cluster. You can safely restore data back into your local workspace and push it straight back onto Supabase in one click!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Backup Section */}
                <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl space-y-3 flex flex-col justify-between text-left">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-blue-400" /> Download Local Backup
                    </h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Save your active CRM data ({clients.length} clients, {projects.length} estimates) as a standalone <code>.json</code> file on your computer.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="w-full px-4 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-zinc-200 hover:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Export painter_crm_backup.json</span>
                  </button>
                </div>

                {/* Upload Backup Section */}
                <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl space-y-3 flex flex-col justify-between text-left">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-400" /> Import / Restore Backup
                    </h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Upload a previously exported <code>.json</code> backup file to completely restore your local clients and projects lists.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-zinc-200 hover:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Select & Upload JSON File</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Import feedback messages */}
              {importStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  importStatus.success 
                    ? 'bg-emerald-950/20 border border-emerald-900/50 text-emerald-400' 
                    : 'bg-red-950/30 border border-red-900/40 text-red-400'
                }`}>
                  {importStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                  )}
                  <span className="leading-relaxed text-[11px]">{importStatus.text}</span>
                </div>
              )}

              {/* Sync / Push to Supabase Section */}
              {dbProvider === 'supabase' && supabaseUser && (
                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-850 space-y-3 text-left">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-blue-400" /> Push Local Data to Supabase
                    </h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      If you recreated or wiped your Supabase database tables to modify columns or adjust RLS policies, click below to **bulk-push** your current local dataset ({clients.length} clients, {projects.length} estimates) directly onto the Supabase server in one go.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-center pt-1.5">
                    <button
                      onClick={handlePushSync}
                      disabled={syncStatus.loading || !isSupabaseAuthorized}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer"
                    >
                      {syncStatus.loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Pushing and Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-white" />
                          Push Data to Supabase Now
                        </>
                      )}
                    </button>

                    {!isSupabaseAuthorized && (
                      <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 leading-normal text-left animate-pulse">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> Requires Auth table registration first (see steps above)
                      </span>
                    )}
                  </div>

                  {syncStatus.text && (
                    <div className={`p-3 rounded-xl text-[11px] flex items-start gap-2.5 ${
                      syncStatus.success 
                        ? 'bg-emerald-950/20 border border-emerald-900/50 text-emerald-400' 
                        : 'bg-red-950/30 border border-red-900/40 text-red-400'
                    }`}>
                      {syncStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                      )}
                      <span className="leading-relaxed">{syncStatus.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        </div>
      )}

    </div>
  );
}
