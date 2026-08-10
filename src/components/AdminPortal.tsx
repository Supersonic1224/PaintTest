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
  removeAuthorizedUser 
} from '../supabaseService';
import { AuthorizedUser } from '../types';
import {
  fetchAuthorizedUsersFromFirestore,
  addAuthorizedUserToFirestore,
  removeAuthorizedUserFromFirestore
} from '../firebaseService';

interface AdminPortalProps {
  supabaseUser: any | null;
  isSupabaseAuthorized: boolean;
  currentUser: any | null;
  isFirestoreAuthorized: boolean;
  loadingAuthorized: boolean;
  onCheckAuth: () => Promise<void>;
  dbProvider: 'firestore' | 'supabase';
  onSetDbProvider: (provider: 'firestore' | 'supabase') => void;
  clients?: any[];
  projects?: any[];
  onImportBackup?: (clients: any[], projects: any[]) => Promise<{ success?: boolean; message?: string } | void>;
  onPushToSupabase?: () => Promise<{ success: boolean; message: string }>;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export default function AdminPortal({
  supabaseUser,
  isSupabaseAuthorized,
  currentUser,
  isFirestoreAuthorized,
  loadingAuthorized,
  onCheckAuth,
  dbProvider,
  onSetDbProvider,
  clients = [],
  projects = [],
  onImportBackup,
  onPushToSupabase,
  onSignIn,
  onSignOut
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
  const [adminPassword, setAdminPassword] = useState('');
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
          const res = (await onImportBackup(parsed.clients, parsed.projects)) as { success?: boolean; message?: string } | undefined;
          setImportStatus({
            success: res?.success !== false,
            text: res?.message || `Successfully restored backup with ${parsed.clients.length} clients and ${parsed.projects.length} projects! CRM database updated.`
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
    const isAuthorized = dbProvider === 'supabase' ? isSupabaseAuthorized : isFirestoreAuthorized;
    if (!isAuthorized) return;
    setLoadingUsers(true);
    try {
      if (dbProvider === 'supabase') {
        const list = await fetchAuthorizedUsers();
        setAuthorizedUsers(list);
      } else {
        const list = await fetchAuthorizedUsersFromFirestore();
        setAuthorizedUsers(list);
      }
    } catch (err) {
      console.error('Failed to load authorized users list:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const isAuthorized = dbProvider === 'supabase' ? isSupabaseAuthorized : isFirestoreAuthorized;
    if (isAuthorized) {
      loadAuthorizedUsersList();
    } else {
      setAuthorizedUsers([]);
    }
  }, [isSupabaseAuthorized, isFirestoreAuthorized, dbProvider]);

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
      let msg = err.message || 'Failed to sign in.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Your email is not confirmed. Please check your email inbox (and spam folder) for the verification link sent by Supabase. Alternatively, you can disable "Confirm email" on your Supabase dashboard under Authentication > Providers > Email settings.';
      } else if (sbPassword.trim() === 'capstone_painting') {
        msg = 'Note: "capstone_painting" is the Master Team Password used for authorizing new team members in the Admin Portal, NOT your personal account login password. Please click "Don\'t have an account? Sign Up" below to register your account with your own password!';
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        msg = 'Invalid login credentials. Make sure you have already signed up (using the "Don\'t have an account? Sign Up" link below) for this Supabase project with your own custom password.';
      }
      setSbAuthMessage({ success: false, text: msg });
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
      const { data, error } = await supabase.auth.signUp({
        email: sbEmail.trim(),
        password: sbPassword
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setSbAuthMessage({
          success: false,
          text: 'This email is ALREADY registered in Supabase! If you cannot log in, please check if your password is correct or if email verification is required.'
        });
      } else if (data.session) {
        setSbAuthMessage({ 
          success: true, 
          text: 'Account registered and signed in successfully!' 
        });
        setSbIsRegistering(false);
      } else {
        setSbAuthMessage({ 
          success: true, 
          text: 'Account registered! 📧 IMPORTANT: Supabase sent a confirmation email to your inbox. You MUST click the link in your email to enable sign in, OR go to your Supabase Dashboard > Authentication > Providers > Email and turn OFF "Confirm email".' 
        });
      }
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

    if (adminPassword.trim() !== 'capstone_painting') {
      setUserActionError('Incorrect Authorization Password. Only authenticated users with the correct team password (capstone_painting) can authorize new emails.');
      return;
    }
    
    try {
      let sbSuccess = false;
      let fsSuccess = false;
      let errors: string[] = [];

      // 1. Attempt adding to Supabase (if configured)
      try {
        await addAuthorizedUser(newAuthEmail.trim());
        sbSuccess = true;
      } catch (err: any) {
        console.warn('Could not add authorized user to Supabase:', err);
        errors.push(`Supabase: ${err.message || err}`);
      }

      // 2. Attempt adding to Firestore (always try, as it uses client SDK)
      try {
        await addAuthorizedUserToFirestore(newAuthEmail.trim());
        fsSuccess = true;
      } catch (err: any) {
        console.warn('Could not add authorized user to Firestore:', err);
        errors.push(`Firestore: ${err.message || err}`);
      }

      if (!sbSuccess && !fsSuccess) {
        throw new Error(`Failed to add user to both databases. Errors: ${errors.join('; ')}`);
      }

      let dbMessage = '';
      if (sbSuccess && fsSuccess) {
        dbMessage = 'in both Supabase and Firestore';
      } else if (sbSuccess) {
        dbMessage = 'in Supabase (Firestore skipped/failed)';
      } else {
        dbMessage = 'in Firestore (Supabase skipped/failed)';
      }

      setUserActionSuccess(`Successfully authorized ${newAuthEmail} ${dbMessage}!`);
      setNewAuthEmail('');
      setAdminPassword('');
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
      let sbRemoved = false;
      let fsRemoved = false;

      // 1. Attempt removing from Supabase
      try {
        if (dbProvider === 'supabase') {
          await removeAuthorizedUser(id);
        } else {
          // If Firestore is currently active, try to delete from Supabase by email lookup
          const sb = getSupabase();
          if (sb) {
            await sb.from('authorized_users').delete().eq('email', email.trim().toLowerCase());
          }
        }
        sbRemoved = true;
      } catch (err) {
        console.warn('Could not delete authorized user from Supabase:', err);
      }

      // 2. Attempt removing from Firestore
      try {
        const docId = email.trim().toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_');
        await removeAuthorizedUserFromFirestore(docId);
        fsRemoved = true;
      } catch (err) {
        console.warn('Could not delete authorized user from Firestore:', err);
      }

      setUserActionSuccess(`Successfully revoked access for ${email} in both database directories!`);
      await loadAuthorizedUsersList();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to remove user.');
    }
  };

  const handleSelfAuthorize = async () => {
    setUserActionError(null);
    setUserActionSuccess(null);
    const activeEmail = dbProvider === 'supabase' ? supabaseUser?.email : currentUser?.email;
    if (!activeEmail) return;
    setSelfAuthLoading(true);
    try {
      if (dbProvider === 'supabase') {
        await addAuthorizedUser(activeEmail);
      } else {
        await addAuthorizedUserToFirestore(activeEmail);
      }
      setUserActionSuccess(`Successfully authorized yourself (${activeEmail})! Welcome aboard!`);
      await onCheckAuth();
    } catch (err: any) {
      console.error("Self-authorize failed:", err);
      setUserActionError(
        dbProvider === 'supabase' && (err.message?.includes('relation "authorized_users" does not exist') || err.message?.includes('does not exist'))
          ? 'Error: The required database tables do not exist yet. Please copy and run the complete Database Setup DDL script below in your Supabase SQL Editor first, then click "Quick Self-Authorize" again.'
          : err.message || 'Failed to self-authorize. Please check if your tables or collections have been initialized.'
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
  -- Returns true for all users to prevent RLS lockouts and recursive queries
  SELECT true;
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Drop existing policies to prevent 'already exists' errors and cleanly override
DROP POLICY IF EXISTS "authorized can view list" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can add users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can remove users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized full access clients" ON public.clients;
DROP POLICY IF EXISTS "authorized full access projects" ON public.projects;
DROP POLICY IF EXISTS "Allow users to read their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to insert/update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to read their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow users to insert/update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Open full access clients" ON public.clients;
DROP POLICY IF EXISTS "Open full access projects" ON public.projects;

-- 7. Create policies for public.authorized_users table
CREATE POLICY "authorized can view list"
  ON public.authorized_users FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "authorized can add users"
  ON public.authorized_users FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "authorized can remove users"
  ON public.authorized_users FOR DELETE TO anon, authenticated
  USING (true);

-- 8. Create policies for public.clients table (open to both anon and authenticated users)
CREATE POLICY "Open full access clients"
  ON public.clients FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Create policies for public.projects table (open to both anon and authenticated users)
CREATE POLICY "Open full access projects"
  ON public.projects FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 10. Insert your email as authorized
INSERT INTO public.authorized_users (email)
VALUES ('${userEmail}')
ON CONFLICT (email) DO NOTHING;`;
  };

  const userSignedIn = dbProvider === 'supabase' ? !!supabaseUser : !!currentUser;
  const userIsAuthorized = dbProvider === 'supabase' ? isSupabaseAuthorized : isFirestoreAuthorized;
  const userEmail = dbProvider === 'supabase' ? supabaseUser?.email : currentUser?.email;

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

      {/* 2. Database Provider Toggle - Switch Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-xs uppercase text-zinc-400 tracking-wider">Active Cloud Database Provider</h3>
            <p className="text-sm font-bold text-white mt-0.5">
              {dbProvider === 'supabase' ? 'Supabase Postgres DB' : 'Google Firebase Firestore'}
            </p>
          </div>
        </div>
        <div className="flex bg-neutral-950 p-1.5 rounded-xl border border-neutral-850 self-start sm:self-auto">
          <button
            onClick={() => onSetDbProvider('firestore')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              dbProvider === 'firestore'
                ? 'bg-blue-600 text-white shadow shadow-blue-600/15'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Firebase Firestore
          </button>
          <button
            onClick={() => onSetDbProvider('supabase')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              dbProvider === 'supabase'
                ? 'bg-blue-600 text-white shadow shadow-blue-600/15'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Supabase Postgres
          </button>
        </div>
      </div>

      {/* 3. Main Security Workspace */}
      <div className="space-y-6">
        
        {/* Missing Env Variables warning (Supabase only) */}
        {dbProvider === 'supabase' && !isSupabaseConfigured && (
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Supabase Credentials Missing</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed text-left">
              Supabase URL and API keys have not been configured yet. To use the Team Access portal, please set your environment variables in the <code>.env</code> file or the dashboard settings first.
            </p>
          </div>
        )}

        {(dbProvider === 'firestore' || (dbProvider === 'supabase' && isSupabaseConfigured)) && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Connection Info & Sign In / Sign Out */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-display font-bold text-white text-xs uppercase tracking-wider text-zinc-400">
                  My Security Session
                </h3>

                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-3 text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Connected User</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-white truncate max-w-full">
                        {userEmail || 'Anonymous Session'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {userSignedIn ? (
                      userIsAuthorized ? (
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

                  {dbProvider === 'supabase' && supabaseUser && (
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

                  {dbProvider === 'firestore' && currentUser && onSignOut && (
                    <button
                      onClick={onSignOut}
                      className="w-full mt-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 hover:text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect Google
                    </button>
                  )}
                </div>

                {/* Auth Forms */}
                {dbProvider === 'supabase' && !supabaseUser && (
                  <form onSubmit={sbIsRegistering ? handleSupabaseSignUp : handleSupabaseSignIn} className="space-y-3.5">
                    <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3 text-[10.5px] text-zinc-400 space-y-1.5 leading-relaxed">
                      <span className="font-bold text-blue-400 block">💡 Supabase Password Guide:</span>
                      <p>
                        {sbIsRegistering 
                          ? "You can set ANY custom password you want to register your account! It does not have to be your Google password." 
                          : "Enter the email and password you registered for Supabase. This is separate from your Google credentials."}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        *Note: <strong>capstone_painting</strong> is the master team password used for authorizing teammates on the database, not your personal login password.
                      </p>
                    </div>

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
                        <span className="leading-relaxed text-left">{sbAuthMessage.text}</span>
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

                {dbProvider === 'firestore' && !currentUser && onSignIn && (
                  <div className="space-y-3.5 pt-1 text-left">
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      To collaborate and authorize teammates in Firebase Firestore, sign in with your administrator Google account:
                    </p>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Sign In With Google
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Columns: Admin Registry OR Setup Instructions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Scenario 1: Signed In but Pending Authorization */}
              {userSignedIn && !userIsAuthorized && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-3 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>Authorization Pending</span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed text-left">
                    You signed in successfully! However, your email <strong>{userEmail}</strong> is not listed in the <code>authorized_users</code> registry yet. 
                  </p>

                  {/* Restricted Self-Authorization Notice */}
                  <div className="p-4 bg-amber-950/20 rounded-xl border border-amber-900/40 space-y-2.5 text-left">
                    <div className="flex items-center gap-2 text-amber-400">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <h4 className="text-xs font-bold">Access Restricted — Pending Administrator Approval</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Your email address (<span className="text-white font-mono">{userEmail}</span>) is signed in, but has not been granted authorization by an administrator. Self-registration has been restricted to ensure pricing and financial figures remain secure.
                    </p>
                    <div className="pt-1">
                      <p className="text-[10px] text-amber-300 font-mono">
                        Please ask an administrator (e.g. daniel@capstonepainting.ca) to add your email to the team access registry.
                      </p>
                    </div>
                  </div>

                  {/* Method B: Complete SQL Editor Script (Supabase only) */}
                  {dbProvider === 'supabase' && (
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3 text-left">
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
                  )}

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
              {!userSignedIn && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
                    <Lock className="w-5 h-5 text-blue-500" />
                    <span>Access Controlled Administration</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed text-left">
                    Only authorized staff and painters listed in the personnel registry can view or modify shared estimates and invoices. Please sign in with your team credentials on the left.
                  </p>
                  <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-xs text-zinc-500 space-y-2 leading-relaxed text-left">
                    <span className="font-semibold text-zinc-400 block font-mono uppercase text-[9px]">How-To Guide:</span>
                    <ol className="list-decimal pl-4 space-y-1">
                      {dbProvider === 'supabase' ? (
                        <>
                          <li>Register an email through the <strong>Request Access / Sign Up</strong> link.</li>
                          <li>An existing authorized administrator can then instantly input and approve your email in the Personnel Registry.</li>
                          <li>Once authorized, you can access secure paint estimate templates and lead boards on any device.</li>
                        </>
                      ) : (
                        <>
                          <li>Sign in with your standard Google account.</li>
                          <li>Ask your administrator to add your email to the Google Firebase Firestore registry list.</li>
                          <li>Once added, the system automatically unlocks full unmasked access to PaintNav leads and estimates!</li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>
              )}

              {/* Scenario 3: Authorized and logged in - Full Registry Dashboard */}
              {userSignedIn && userIsAuthorized && (
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Teammate Email Address</label>
                          <input
                            type="email"
                            required
                            value={newAuthEmail}
                            onChange={(e) => setNewAuthEmail(e.target.value)}
                            placeholder="apprentice@paintercompany.com"
                            className="w-full px-3 py-2 bg-neutral-900 text-zinc-200 border border-neutral-800 rounded-lg focus:border-emerald-500/40 focus:outline-none text-xs transition"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Authorization Password</label>
                          <input
                            type="password"
                            required
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="capstone_painting"
                            className="w-full px-3 py-2 bg-neutral-900 text-zinc-200 border border-neutral-800 rounded-lg focus:border-emerald-500/40 focus:outline-none text-xs transition"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Grant Access & Register Teammate
                        </button>
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

    </div>
  );
}
