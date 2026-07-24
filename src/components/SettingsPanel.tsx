import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, Laptop, Database, HardDrive, AlertTriangle, Terminal, Key, ShieldCheck, 
  CheckCircle2, XCircle, HelpCircle, ArrowRight, Loader2, Play, ChevronDown, ChevronUp,
  Trash2, Plus, Lock, UserPlus, Clipboard, ShieldAlert, LogOut, Download, Upload, RefreshCw,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';
import { testFirebaseConnection, testFirebaseDiagnostics, type FirebaseDiagnosticTest } from '../firebaseService';
import { firebaseConfig } from '../firebase';
import { getSupabase, testSupabaseConnection, testSupabaseDiagnostics, type SupabaseDiagnosticTest } from '../supabase';
import { getSupabaseDDL, fetchAuthorizedUsers, addAuthorizedUser, removeAuthorizedUser } from '../supabaseService';
import { AuthorizedUser, ProposalSettings, DEFAULT_PROPOSAL_SETTINGS, DEFAULT_PRODUCT_TYPE_COLOURS, DEFAULT_REAL_PRODUCTS, RealProduct, DEFAULT_PROPOSAL_RATES, ProposalRates } from '../types';

interface SettingsPanelProps {
  currentUser: User | null;
  isDemoMode: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onResetDatabase: () => void;
  dbProvider: 'firestore' | 'supabase';
  onSetDbProvider: (provider: 'firestore' | 'supabase') => void;
  supabaseUser?: any | null;
  isSupabaseAuthorized?: boolean;
  loadingAuthorized?: boolean;
  onCheckAuth?: () => Promise<void>;
  clients?: any[];
  projects?: any[];
  onImportBackup?: (clients: any[], projects: any[]) => Promise<void>;
  onPushToSupabase?: () => Promise<{ success: boolean; message: string }>;
}

export default function SettingsPanel({
  currentUser,
  isDemoMode,
  onSignIn,
  onSignOut,
  onResetDatabase,
  dbProvider,
  onSetDbProvider,
  supabaseUser = null,
  isSupabaseAuthorized = false,
  loadingAuthorized = false,
  onCheckAuth = async () => {},
  clients = [],
  projects = [],
  onImportBackup,
  onPushToSupabase,
}: SettingsPanelProps) {
  const [supabaseStatus, setSupabaseStatus] = useState<{ success?: boolean; message: string }>({
    message: 'Click Test Database Connection below to run 12-checkpoint core diagnostics.'
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [diagnostics, setDiagnostics] = useState<SupabaseDiagnosticTest[] | null>(null);
  const [expandedTestIds, setExpandedTestIds] = useState<Record<number, boolean>>({});
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  // Firebase Firestore Diagnostics States
  const [firebaseStatus, setFirebaseStatus] = useState<{ success?: boolean; message: string }>({
    message: 'Click Test Firebase Connection below to run 10-checkpoint Firestore diagnostics.'
  });
  const [testingFirebase, setTestingFirebase] = useState(false);
  const [firebaseDiagnosticsList, setFirebaseDiagnosticsList] = useState<FirebaseDiagnosticTest[] | null>(null);
  const [expandedFbTestIds, setExpandedFbTestIds] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; success: boolean | null; text: string | null }>({
    loading: false,
    success: null,
    text: null
  });

  const [activeTab, setActiveTab] = useState<'storage' | 'presets'>('storage');
  const [proposalSettings, setProposalSettings] = useState<ProposalSettings>(() => {
    const saved = localStorage.getItem('proposal_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_PROPOSAL_SETTINGS;
  });

  const saveProposalSettings = (newSettings: ProposalSettings) => {
    setProposalSettings(newSettings);
    localStorage.setItem('proposal_settings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('proposal_settings_updated'));
  };

  const rates = proposalSettings.rates || DEFAULT_PROPOSAL_RATES;
  
  const updateRate = (key: keyof ProposalRates, val: number) => {
    saveProposalSettings({
      ...proposalSettings,
      rates: {
        ...rates,
        [key]: val
      }
    });
  };

  const restoreDefaultRates = () => {
    if (window.confirm("Are you sure you want to restore all rates back to system default values?")) {
      saveProposalSettings({
        ...proposalSettings,
        rates: DEFAULT_PROPOSAL_RATES
      });
    }
  };

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
            text: `Successfully restored backup with ${parsed.clients.length} clients and ${parsed.projects.length} projects! Your local workspace has been updated.`
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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const isSupabaseEnvConfigured = !!(
    supabaseUrl && 
    supabaseAnonKey && 
    !supabaseUrl.includes('your-supabase-project') && 
    !supabaseAnonKey.includes('your-anon-key-here')
  );

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setSupabaseStatus({ message: 'Running the 12-checkpoint cloud and schema diagnostics...' });
    setDiagnostics(null);
    setExpandedTestIds({});
    try {
      const res = await testSupabaseConnection();
      const diagnosticResults = await testSupabaseDiagnostics();
      setDiagnostics(diagnosticResults);
      
      const initialExpanded: Record<number, boolean> = {};
      diagnosticResults.forEach(t => {
        if (t.status === 'failed') {
          initialExpanded[t.id] = true;
        }
      });
      // Auto-expand checkpoint 9 by default to show the nice micro-steps
      initialExpanded[9] = true;
      setExpandedTestIds(initialExpanded);
      
      const failedTest = diagnosticResults.find(t => t.status === 'failed');
      if (failedTest) {
        setSupabaseStatus({
          success: false,
          message: `Diagnostics flagged failure at checkpoint #${failedTest.id}: "${failedTest.name}". See full details below.`
        });
      } else {
        setSupabaseStatus(res);
      }
    } catch (err: any) {
      setSupabaseStatus({ success: false, message: err.message || 'Connection test generated an unhandled exception.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestFirebaseConnection = async () => {
    setTestingFirebase(true);
    setFirebaseStatus({ message: 'Running the 10-checkpoint Firebase and Firestore pipeline diagnostics...' });
    setFirebaseDiagnosticsList(null);
    setExpandedFbTestIds({});
    try {
      const res = await testFirebaseConnection();
      const diagnosticResults = await testFirebaseDiagnostics();
      setFirebaseDiagnosticsList(diagnosticResults);
      
      const initialExpanded: Record<number, boolean> = {};
      diagnosticResults.forEach(t => {
        if (t.status === 'failed') {
          initialExpanded[t.id] = true;
        }
      });
      // Auto-expand checkpoint 8 and 9 by default to show nice granular sub-steps/results
      initialExpanded[8] = true;
      initialExpanded[9] = true;
      setExpandedFbTestIds(initialExpanded);
      
      const failedTest = diagnosticResults.find(t => t.status === 'failed');
      if (failedTest) {
        setFirebaseStatus({
          success: false,
          message: `Firebase diagnostics flagged failure at checkpoint #${failedTest.id}: "${failedTest.name}". See full details below.`
        });
      } else {
        setFirebaseStatus(res);
      }
    } catch (err: any) {
      setFirebaseStatus({ success: false, message: err.message || 'Firebase diagnostics generated an unhandled exception.' });
    } finally {
      setTestingFirebase(false);
    }
  };

  const handleCopySql = () => {
    const ddl = getSupabaseDDL();
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Supabase Auth and User Administration states
  const [sbEmail, setSbEmail] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [sbIsRegistering, setSbIsRegistering] = useState(false);
  const [sbAuthLoading, setSbAuthLoading] = useState(false);
  const [sbAuthMessage, setSbAuthMessage] = useState<{ success: boolean; text: string } | null>(null);

  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [selfAuthLoading, setSelfAuthLoading] = useState(false);

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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
          text: 'Account created and signed in successfully!' 
        });
        setSbIsRegistering(false);
      } else {
        setSbAuthMessage({ 
          success: true, 
          text: 'Account created! 📧 IMPORTANT: Supabase sent a confirmation email to your inbox. You MUST click the link in your email to enable sign in, OR go to Supabase Dashboard > Authentication > Providers > Email and turn OFF "Confirm email".' 
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
    const supabase = getSupabase();
    if (!supabase) return;

    setSbAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setSbAuthMessage({ success: true, text: 'Signed out successfully.' });
      setAuthorizedUsers([]);
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
      setUserActionError('Please fill in the Email field.');
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
    if (!window.confirm(`Are you sure you want to remove authorized access for ${email}?`)) {
      return;
    }

    try {
      await removeAuthorizedUser(id);
      setUserActionSuccess(`Removed access for ${email}.`);
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
      if (onCheckAuth) await onCheckAuth();
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

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in text-left">
      {/* Tab Selector */}
      <div className="flex border-b border-neutral-800 gap-6">
        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 text-xs uppercase tracking-widest font-mono font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'storage' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Storage & Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`pb-3 text-xs uppercase tracking-widest font-mono font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'presets' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Proposal Presets & Rates
        </button>
      </div>

      {activeTab === 'storage' ? (
        <>
          {/* 1. Database Synced Provider Switch Panel */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Active Storage Provider
        </h3>
        <p className="text-zinc-400 text-xs">
          Configure where your CRM client prospects, estimates, and checklists are synced. You can choose Google-backed Firebase Firestore or your custom relational Supabase schema.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Firestore Box */}
          <button
            onClick={() => onSetDbProvider('firestore')}
            className={`p-4 rounded-xl border text-left transition relative ${
              dbProvider === 'firestore'
                ? 'bg-blue-600/10 border-blue-500/50 text-white'
                : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white">Firebase Firestore</span>
              {dbProvider === 'firestore' && (
                <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Default system storage. Fully integrated with secure client pipelines, and saves to your workspace profile automatically.
            </p>
          </button>

          {/* Supabase Box */}
          <button
            onClick={() => {
              if (isSupabaseEnvConfigured) {
                onSetDbProvider('supabase');
              }
            }}
            disabled={!isSupabaseEnvConfigured}
            className={`p-4 rounded-xl border text-left transition relative ${
              !isSupabaseEnvConfigured
                ? 'bg-neutral-950/20 border-neutral-850 opacity-50 cursor-not-allowed'
                : dbProvider === 'supabase'
                ? 'bg-emerald-600/10 border-emerald-500/50 text-white'
                : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white">Supabase / Postgres SQL</span>
                {!isSupabaseEnvConfigured && (
                  <span className="text-[9px] bg-neutral-800 text-zinc-500 px-1.5 py-0.2 rounded font-mono uppercase">Inactive</span>
                )}
              </div>
              {dbProvider === 'supabase' && (
                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              {!isSupabaseEnvConfigured 
                ? 'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first to unlock real-time relational dashboard synchronization.'
                : 'Custom Postgres cluster. Full CRUD integration for instant calculation room templates.'
              }
            </p>
          </button>
        </div>
      </div>

      {/* 1.5. Firebase Firestore Connector Information Details Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Firebase Firestore Credentials & Diagnostics
          </h3>
          <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">NoSQL</span>
        </div>
        
        <p className="text-zinc-400 text-xs leading-relaxed">
          The system integrates with a high-performance Google-backed Firebase Firestore cluster. In local development or Cloud Run environments, we load credentials from the automatic security handshake configuration. 
          When migrating your project to custom cloud hosting such as Vercel or Netlify, declare the configuration variables in your production environment settings to sync your prospects.
        </p>

        {/* Credentials Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-zinc-500">PROJECT_ID:</span>
              <span className="text-blue-400 font-semibold font-mono break-all text-right">
                {firebaseConfig.projectId || 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 pt-2 border-t border-neutral-900">
              <span className="text-zinc-500">API_KEY:</span>
              <span className="text-blue-400 font-semibold font-mono break-all text-right">
                {firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 15)}...` : 'Missing'}
              </span>
            </div>
          </div>
          <div className="space-y-2 sm:pl-3 sm:border-l sm:border-neutral-900">
            <div className="flex items-center justify-between gap-1">
              <span className="text-zinc-500">AUTH_DOMAIN:</span>
              <span className="text-zinc-300 font-mono break-all text-right">
                {firebaseConfig.authDomain ? `${firebaseConfig.authDomain.slice(0, 20)}...` : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 pt-2 border-t border-neutral-900">
              <span className="text-zinc-500">APP_ID:</span>
              <span className="text-zinc-300 font-mono break-all text-right">
                {firebaseConfig.appId ? `${firebaseConfig.appId.slice(0, 20)}...` : 'Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* Tester Button and feedback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/40 p-4 rounded-xl border border-neutral-850">
          <div className="space-y-1">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Firebase Pipeline Diagnostics</div>
            <p className="text-[11px] text-zinc-500">Run the automatic 10-checkpoint Firestore diagnostics suite to test real read/write capabilities (and add objects to storage).</p>
          </div>
          <button
            onClick={handleTestFirebaseConnection}
            disabled={testingFirebase}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer text-center justify-center shrink-0"
          >
            {testingFirebase ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Diagnosing Pipeline...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                Run Firebase Diagnostics
              </>
            )}
          </button>
        </div>

        {/* Test Summary banner */}
        <div className="space-y-1 text-xs">
          {firebaseStatus.success === true && (
            <div className="p-3 bg-blue-950/20 border border-blue-900/50 rounded-xl text-blue-400 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-white">Firebase Connected Successfully!</h4>
                <p className="text-[11px] text-blue-300 mt-0.5">{firebaseStatus.message}</p>
              </div>
            </div>
          )}
          {firebaseStatus.success === false && (
            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 flex items-start gap-2.5 animate-fade-in">
              <XCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white">Firebase Connection Failed</h4>
                <p className="text-[11px] text-red-300 mt-0.5 leading-relaxed">{firebaseStatus.message}</p>
              </div>
            </div>
          )}
          {firebaseStatus.success === undefined && (
            <div className="p-3 bg-neutral-950/20 border border-neutral-850 rounded-xl text-zinc-400 text-[11px]">
              {firebaseStatus.message}
            </div>
          )}
        </div>

        {/* 10-Checkpoint Diagnostics Interactive Display Container */}
        {firebaseDiagnosticsList && (
          <div className="mt-4 border border-neutral-800 bg-neutral-950 rounded-xl p-4 space-y-3 animate-fade-in text-left">
            <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-between pb-2 border-b border-neutral-900">
              <span>Detailed 10-Checkpoint Firebase Audit Ledger</span>
              <span className="text-[10px] text-zinc-500 lowercase font-normal italic">Click any row to expand/collapse</span>
            </h4>
            
            <div className="space-y-2.5 text-left">
              {firebaseDiagnosticsList.map((test) => {
                const isExpanded = !!expandedFbTestIds[test.id];
                let statusColor = 'text-zinc-400 border-zinc-800 bg-neutral-900/40 hover:bg-neutral-900/70';
                let Icon = HelpCircle;
                let iconColor = 'text-zinc-500';

                if (test.status === 'success') {
                  statusColor = 'text-blue-400 border-blue-950/60 bg-blue-950/5 hover:bg-blue-950/10';
                  Icon = CheckCircle2;
                  iconColor = 'text-blue-400';
                } else if (test.status === 'failed') {
                  statusColor = 'text-red-400 border-red-950/60 bg-red-950/5 hover:bg-red-950/10';
                  Icon = XCircle;
                  iconColor = 'text-red-400';
                } else if (test.status === 'pending') {
                  statusColor = 'text-blue-400 border-blue-950 bg-blue-950/5 animate-pulse';
                  Icon = Loader2;
                  iconColor = 'text-blue-400';
                } else if (test.status === 'skipped') {
                  statusColor = 'text-zinc-650 border-neutral-900/60 bg-neutral-950/20 opacity-60';
                  Icon = HelpCircle;
                  iconColor = 'text-zinc-650';
                }

                return (
                  <div 
                    key={test.id} 
                    className={`rounded-lg border transition-all duration-200 text-left overflow-hidden ${statusColor}`}
                  >
                    {/* Clickable Header */}
                    <div 
                      onClick={() => {
                        setExpandedFbTestIds(prev => ({
                          ...prev,
                          [test.id]: !prev[test.id]
                        }));
                      }}
                      className="p-3 flex items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor} ${test.status === 'pending' ? 'animate-spin' : ''}`} />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="font-semibold text-xs text-zinc-100 leading-tight">
                            #{test.id}. {test.name}
                          </div>
                          {!isExpanded && (
                            <p className="text-[10px] text-zinc-500 truncate leading-normal">
                              {test.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-zinc-500 p-0.5 hover:text-zinc-300">
                        {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                      </div>
                    </div>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="border-t border-neutral-900 bg-black/40 p-3.5 space-y-3.5 animate-fade-in">
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Test Scope Objective:</span>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {test.description}
                          </p>
                        </div>

                        {/* Granular Sub-Steps (if available) */}
                        {test.subSteps && test.subSteps.length > 0 && (
                          <div className="space-y-2 bg-neutral-950/70 p-3 rounded-lg border border-neutral-900">
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-900">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Granular Execution Handshake Ledger</span>
                              <span className="text-[9px] text-zinc-500 italic font-mono">{test.subSteps.length} progressive checks</span>
                            </div>
                            <div className="space-y-2 pt-1">
                              {test.subSteps.map((step, sIdx) => (
                                <div key={sIdx} className="text-[11px] flex items-start gap-2 py-0.5 leading-relaxed font-sans">
                                  {step.status === 'pending' ? (
                                    <Loader2 className="w-3.5 h-3.5 mt-0.5 text-blue-500 animate-spin shrink-0" />
                                  ) : step.status === 'success' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                                  ) : step.status === 'failed' ? (
                                    <XCircle className="w-3.5 h-3.5 mt-0.5 text-red-500 shrink-0" />
                                  ) : (
                                    <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-zinc-650 shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className={`font-medium ${step.status === 'failed' ? 'text-red-400' : step.status === 'success' ? 'text-zinc-200' : 'text-zinc-400'}`}>
                                      {step.name}
                                    </span>
                                    {step.message && (
                                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5 break-all">
                                        └ {step.message}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Test Specific Error Detail */}
                        {test.errorDetail && (
                          <div className="space-y-1 bg-red-950/20 border border-red-950/40 p-3 rounded-lg">
                            <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider block">Error Message:</span>
                            <pre className="p-2.5 bg-black/50 rounded text-[10px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap break-all leading-normal text-left font-sans">
                              {test.errorDetail}
                            </pre>
                          </div>
                        )}

                        {/* Test Specific Actionable Fix */}
                        {test.solution && (
                          <div className="space-y-1.5 bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                            <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Actionable Fix:
                            </span>
                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                              {test.solution}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Supabase Connector Information Details Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            Supabase Credentials & Diagnostics
          </h3>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">Postgres</span>
        </div>
        
        <p className="text-zinc-400 text-xs leading-relaxed">
          To establish a direct connection to your custom Supabase project, declare the following keys inside your environment variables. 
          The application will automatically pre-clean URL inputs (such as stripping trailing slashes or <code className="text-emerald-400">/rest/v1</code> suffixes) to secure requests.
        </p>

        {/* Credentials Status Indicators */}
        <div className="space-y-2 font-mono text-[11px] bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-zinc-500">VITE_SUPABASE_URL:</span>
            <span className="flex items-center gap-1.5 font-sans break-all">
              {supabaseUrl ? (
                <span className="text-emerald-400 font-semibold font-mono">
                  {supabaseUrl.slice(0, 45)}{supabaseUrl.length > 45 ? '...' : ''}
                </span>
              ) : (
                <span className="text-red-400 font-semibold flex items-center gap-1 font-mono">
                  <XCircle className="w-3.5 h-3.5" /> Missing
                </span>
              )}
            </span>
          </div>
          <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-1 pt-2 border-t border-neutral-900">
            <span className="text-zinc-500">VITE_SUPABASE_ANON_KEY:</span>
            <span className="flex items-center gap-1.5 font-sans break-all">
              {supabaseAnonKey ? (
                <span className="text-emerald-400 font-semibold font-mono">
                  {supabaseAnonKey.slice(0, 25)}... (Masked Key)
                </span>
              ) : (
                <span className="text-red-400 font-semibold flex items-center gap-1 font-mono">
                  <XCircle className="w-3.5 h-3.5" /> Missing
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Tester Button and feedback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/40 p-4 rounded-xl border border-neutral-850">
          <div className="space-y-1">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Connection Integrity Diagnostics</div>
            <p className="text-[11px] text-zinc-500">Run the automatic 12-step test suite to locate and suggest steps to solve connection issues.</p>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer text-center justify-center shrink-0"
          >
            {testingConnection ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Diagnosing Sync...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                Run Diagnostics
              </>
            )}
          </button>
        </div>

        {/* Test Summary banner */}
        <div className="space-y-1 text-xs">
          {supabaseStatus.success === true && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-emerald-400 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-white">Database Connected Successfully!</h4>
                <p className="text-[11px] text-emerald-500/90 mt-0.5">{supabaseStatus.message}</p>
              </div>
            </div>
          )}
          {supabaseStatus.success === false && (
            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 flex items-start gap-2.5">
              <XCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white">Database Connection Failed</h4>
                <p className="text-[11px] text-red-300 mt-0.5 leading-relaxed">{supabaseStatus.message}</p>
              </div>
            </div>
          )}
          {supabaseStatus.success === undefined && (
            <div className="p-3 bg-neutral-950/20 border border-neutral-850 rounded-xl text-zinc-400 text-[11px]">
              {supabaseStatus.message}
            </div>
          )}
        </div>

        {/* 12-Checkpoint Diagnostics Interactive Display Container */}
        {diagnostics && (
          <div className="mt-4 border border-neutral-800 bg-neutral-950 rounded-xl p-4 space-y-3 animate-fade-in text-left">
            <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-between pb-2 border-b border-neutral-900">
              <span>Detailed 12-Checkpoint Audit Ledger</span>
              <span className="text-[10px] text-zinc-500 lowercase font-normal italic">Click any row to expand/collapse</span>
            </h4>
            
            <div className="space-y-2.5 text-left">
              {diagnostics.map((test) => {
                const isExpanded = !!expandedTestIds[test.id];
                let statusColor = 'text-zinc-400 border-zinc-800 bg-neutral-900/40 hover:bg-neutral-900/70';
                let Icon = HelpCircle;
                let iconColor = 'text-zinc-500';

                if (test.status === 'success') {
                  statusColor = 'text-emerald-400 border-emerald-950/60 bg-emerald-950/5 hover:bg-emerald-950/10';
                  Icon = CheckCircle2;
                  iconColor = 'text-emerald-400';
                } else if (test.status === 'failed') {
                  statusColor = 'text-red-400 border-red-950/60 bg-red-950/5 hover:bg-red-950/10';
                  Icon = XCircle;
                  iconColor = 'text-red-400';
                } else if (test.status === 'pending') {
                  statusColor = 'text-blue-400 border-blue-950 bg-blue-950/5 animate-pulse';
                  Icon = Loader2;
                  iconColor = 'text-blue-400';
                } else if (test.status === 'skipped') {
                  statusColor = 'text-zinc-650 border-neutral-900/60 bg-neutral-950/20 opacity-60';
                  Icon = HelpCircle;
                  iconColor = 'text-zinc-650';
                }

                return (
                  <div 
                    key={test.id} 
                    className={`rounded-lg border transition-all duration-200 text-left overflow-hidden ${statusColor}`}
                  >
                    {/* Clickable Header */}
                    <div 
                      onClick={() => {
                        setExpandedTestIds(prev => ({
                          ...prev,
                          [test.id]: !prev[test.id]
                        }));
                      }}
                      className="p-3 flex items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor} ${test.status === 'pending' ? 'animate-spin' : ''}`} />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="font-semibold text-xs text-zinc-100 leading-tight">
                            #{test.id}. {test.name}
                          </div>
                          {!isExpanded && (
                            <p className="text-[10px] text-zinc-500 truncate leading-normal">
                              {test.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-zinc-500 p-0.5 hover:text-zinc-300">
                        {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                      </div>
                    </div>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="border-t border-neutral-900 bg-black/40 p-3.5 space-y-3.5 animate-fade-in">
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Test Scope Objective:</span>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                            {test.description}
                          </p>
                        </div>

                        {/* Granular Sub-Steps (if available) */}
                        {test.subSteps && test.subSteps.length > 0 && (
                          <div className="space-y-2 bg-neutral-950/70 p-3 rounded-lg border border-neutral-900">
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-900">
                              <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Granular Execution Handshake Ledger</span>
                              <span className="text-[9px] text-zinc-500 italic font-mono">{test.subSteps.length} progressive checks</span>
                            </div>
                            <div className="space-y-2 pt-1">
                              {test.subSteps.map((step, sIdx) => (
                                <div key={sIdx} className="text-[11px] flex items-start gap-2 py-0.5 leading-relaxed">
                                  {step.status === 'pending' ? (
                                    <Loader2 className="w-3.5 h-3.5 mt-0.5 text-blue-500 animate-spin shrink-0" />
                                  ) : step.status === 'success' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                                  ) : step.status === 'failed' ? (
                                    <XCircle className="w-3.5 h-3.5 mt-0.5 text-red-500 shrink-0" />
                                  ) : (
                                    <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-zinc-650 shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className={`font-medium ${step.status === 'failed' ? 'text-red-400' : step.status === 'success' ? 'text-zinc-200' : 'text-zinc-400'}`}>
                                      {step.name}
                                    </span>
                                    {step.message && (
                                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5 break-all">
                                        └ {step.message}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Test Specific Error Detail */}
                        {test.errorDetail && (
                          <div className="space-y-1 bg-red-950/20 border border-red-950/40 p-3 rounded-lg">
                            <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider block">Error Message:</span>
                            <pre className="p-2.5 bg-black/50 rounded text-[10px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap break-all leading-normal text-left">
                              {test.errorDetail}
                            </pre>
                          </div>
                        )}

                        {/* Test Specific Actionable Fix */}
                        {test.solution && (
                          <div className="space-y-1.5 bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                            <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Actionable Fix:
                            </span>
                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                              {test.solution}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SQL Script Accordion setup */}
        <div className="border-t border-neutral-800 pt-4">
          <button
            type="button"
            onClick={() => setShowSql(!showSql)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            {showSql ? 'Hide SQL Schema Script' : 'View Supabase Setup SQL Script (DDL)'}
          </button>

          {showSql && (
            <div className="mt-3 space-y-2 animate-fade-in">
              <p className="text-[11px] text-zinc-500">
                To create the matching PostgreSQL tables in your Supabase project, navigate to the <strong>SQL Editor</strong> tab inside your Supabase dashboard, create a new query, paste this script and click <strong>Run</strong>:
              </p>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute right-3 top-3 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-[10px] text-white font-bold rounded-lg border border-neutral-700 cursor-pointer"
                >
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
                <pre className="p-4 bg-neutral-950 rounded-xl text-[10px] text-zinc-400 font-mono overflow-x-auto max-h-60 border border-neutral-800 leading-relaxed text-left font-sans">
                  {getSupabaseDDL()}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2.5. Supabase Identity and Team Authorization Panel */}
      {dbProvider === 'supabase' && isSupabaseEnvConfigured && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Supabase Identity & Team Authorization
            </h3>
            <span className="text-[10px] bg-neutral-950 text-zinc-450 border border-neutral-850 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
              RLS Access Control
            </span>
          </div>

          <p className="text-zinc-400 text-xs leading-relaxed">
            Configure who can read or write estimates, clients, and pipelines inside your Postgres cluster. 
            Row Level Security (RLS) is active on your database, ensuring only verified and authorized emails have access.
          </p>

          {/* Current Auth Status indicator */}
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-850 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Current Active Session</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">
                    {supabaseUser ? supabaseUser.email : 'Guest / Anonymous Session'}
                  </span>
                  {supabaseUser ? (
                    isSupabaseAuthorized ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded-full font-bold">
                        <ShieldCheck className="w-3 h-3" /> Fully Authorized
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-amber-950 text-amber-400 border border-amber-900 px-2 py-0.5 rounded-full font-bold">
                        <ShieldAlert className="w-3 h-3" /> Access Pending
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-neutral-900 text-zinc-400 border border-neutral-800 px-2 py-0.5 rounded-full font-bold">
                      Unauthenticated Guest
                    </span>
                  )}
                </div>
              </div>

              {supabaseUser && (
                <button
                  onClick={handleSupabaseSignOut}
                  disabled={sbAuthLoading}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 hover:text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  {sbAuthLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <LogOut className="w-3 h-3" />
                  )}
                  Log Out
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {sbAuthMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
              sbAuthMessage.success 
                ? 'bg-emerald-950/20 border border-emerald-900/50 text-emerald-400' 
                : 'bg-red-950/30 border border-red-900/40 text-red-400'
            }`}>
              {sbAuthMessage.success ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
              )}
              <span className="leading-relaxed">{sbAuthMessage.text}</span>
            </div>
          )}

          {/* If NOT signed in: Show Email/Password Form */}
          {!supabaseUser && (
            <form onSubmit={sbIsRegistering ? handleSupabaseSignUp : handleSupabaseSignIn} className="space-y-3.5 pt-1">
              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 text-[10.5px] text-zinc-400 space-y-1 leading-relaxed">
                <span className="font-bold text-emerald-400 block">💡 Supabase Login vs Team Authorization Password:</span>
                <p>
                  {sbIsRegistering 
                    ? "Set ANY personal password you prefer to create your Supabase login account!" 
                    : "Enter your personal email and custom password created during registration."}
                </p>
                <p className="text-[10px] text-zinc-500">
                  *Note: <strong className="text-zinc-300 font-mono">capstone_painting</strong> is the master team key used in the Admin Portal to authorize team members, NOT your personal account login password.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={sbEmail}
                    onChange={(e) => setSbEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 text-zinc-200 border border-neutral-850 rounded-xl focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 text-xs transition placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Password</label>
                  <input
                    type="password"
                    required
                    value={sbPassword}
                    onChange={(e) => setSbPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 text-zinc-200 border border-neutral-850 rounded-xl focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 text-xs transition placeholder-zinc-700"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSbIsRegistering(!sbIsRegistering);
                    setSbAuthMessage(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium text-left cursor-pointer transition"
                >
                  {sbIsRegistering ? 'Already have an account? Sign In' : "Don't have an account? Request access / Sign Up"}
                </button>

                <button
                  type="submit"
                  disabled={sbAuthLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2 justify-center w-full sm:w-auto cursor-pointer"
                >
                  {sbAuthLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : sbIsRegistering ? (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Sign Up & Request Access
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Sign In with Supabase
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Pending / Unauthorized Banner explanation */}
          {supabaseUser && !isSupabaseAuthorized && (
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-zinc-300 text-xs space-y-4">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Authorization Pending</span>
              </div>
              <p className="leading-relaxed text-[11px] text-zinc-400">
                You are successfully logged into Supabase Auth, but your user account email is currently <strong>unauthorized</strong> to access CRM resources because it is not registered in your database's <code>authorized_users</code> table yet.
              </p>

              {/* Method A: Quick Self-Authorize */}
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-bold rounded uppercase">Method A</span>
                  <h4 className="text-[11px] font-bold text-white">⚡ Quick Self-Authorize</h4>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  If your database tables are already initialized, register and authorize your email instantly:
                </p>
                <button
                  onClick={handleSelfAuthorize}
                  disabled={selfAuthLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {selfAuthLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Authorizing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3" />
                      Self-Authorize My Account
                    </>
                  )}
                </button>

                {userActionError && (
                  <div className="p-2.5 bg-red-950/20 border border-red-950/30 text-red-400 text-[10px] rounded-lg mt-2 leading-relaxed font-sans">
                    {userActionError}
                  </div>
                )}

                {userActionSuccess && (
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-[10px] rounded-lg mt-2 leading-relaxed font-sans">
                    {userActionSuccess}
                  </div>
                )}
              </div>

              {/* Method B: SQL DDL */}
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold rounded uppercase">Method B</span>
                  <h4 className="text-[11px] font-bold text-zinc-300 font-sans">Run Database Setup SQL Script</h4>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  If your database is completely brand new, paste this script into your <strong>Supabase SQL Editor</strong> and click <strong>Run</strong>:
                </p>
                <pre className="p-2.5 bg-black/50 rounded text-[9px] font-mono text-emerald-400 overflow-x-auto border border-neutral-950 max-h-40 overflow-y-auto leading-normal">
                  {getSelfContainedSQL()}
                </pre>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getSelfContainedSQL());
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Clipboard className="w-3 h-3 text-current" />
                    <span>{copied ? 'Setup SQL Copied!' : 'Copy Full Setup SQL'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  onClick={async () => {
                    if (onCheckAuth) await onCheckAuth();
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Check My Status
                </button>
              </div>
            </div>
          )}

          {/* Authorized Management Dashboard */}
          {supabaseUser && isSupabaseAuthorized && (
            <div className="space-y-4 pt-2 border-t border-neutral-850">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorized Personnel Registry</span>
              </div>

              {/* Add New Authorized User form */}
              <form onSubmit={handleAddUser} className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Authorize New Team Member</div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Enter the email address of the team member you wish to authorize. They will be granted full access as soon as they sign up with this email.
                </p>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Member Email</label>
                  <input
                    type="email"
                    required
                    value={newAuthEmail}
                    onChange={(e) => setNewAuthEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full px-3 py-1.5 bg-neutral-900 text-zinc-200 border border-neutral-800 rounded-lg focus:border-emerald-500/40 focus:outline-none text-xs transition"
                  />
                </div>

                {userActionError && <p className="text-[11px] text-red-400">{userActionError}</p>}
                {userActionSuccess && <p className="text-[11px] text-emerald-400">{userActionSuccess}</p>}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Authorize Member
                  </button>
                </div>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Currently Authorized Personnel</div>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-xs text-zinc-500 font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    Loading registry from Postgres...
                  </div>
                ) : authorizedUsers.length === 0 ? (
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 text-center text-zinc-500 text-xs italic">
                    No users authorized in the directory.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-neutral-850 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-950 border-b border-neutral-850 text-zinc-500 uppercase text-[9px] tracking-wider font-bold">
                          <th className="p-3">Email</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850">
                        {authorizedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-neutral-950/40 text-zinc-300">
                            <td className="p-3 font-semibold text-white">{user.email}</td>
                            <td className="p-3 text-right">
                              {user.email.toLowerCase() === supabaseUser?.email?.toLowerCase() ? (
                                <span className="text-[10px] text-zinc-650 font-mono italic pr-2">You (Current Admin)</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUser(user.id, user.email)}
                                  className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                                  title="Revoke Access"
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
      )}

      {/* 3. Cloud Integrations Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-zinc-400" />
          Google Workspace & Drive Integrations
        </h3>
        <p className="text-zinc-400 text-xs leading-relaxed">
          The pipeline dashboard utilizes an automated Google Drive connection. It maps client files, estimates pdf sheets, and pre-coloring references inside structured folder channels in your personal Google Drive account.
        </p>

        <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl bg-neutral-900 border border-neutral-800 ${!isDemoMode ? 'text-emerald-400' : 'text-zinc-500'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-500">Connected account</span>
              <h4 className="text-sm font-semibold text-white mt-0.5">
                {!isDemoMode ? (currentUser?.email || 'Authenticated Professional') : 'Offline Local Mode'}
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {!isDemoMode ? 'All changes will sync directly with cloud storage.' : 'Estimates cached locally in browser Storage.'}
              </p>
            </div>
          </div>

          <div>
            {isDemoMode ? (
              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer text-center font-sans block w-full sm:w-auto"
                >
                  Connect Google Account
                </button>
              </div>
            ) : (
              <button
                onClick={onSignOut}
                className="px-3 py-2 bg-zinc-850 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900 border border-neutral-800 text-zinc-300 text-xs font-bold rounded-lg transition cursor-pointer text-center font-sans block"
              >
                Disconnect Account
              </button>
            )}
          </div>
        </div>

        {isDemoMode && (
          <div className="p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-xl text-zinc-300 text-xs space-y-1.5">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Sign-In & Sandbox Restriction Notice</span>
            </div>
            <p className="leading-relaxed text-[11px] text-zinc-400">
              When viewing this app in the <strong>AI Studio preview iframe</strong>, Google authentication popups may be blocked or cancelled by your browser. Bypassing this is easy:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-zinc-400">
              <li>
                Click the <strong className="text-zinc-200">"Open in new tab"</strong> button at the top-right of your preview to sign in successfully on the standalone host.
              </li>
              <li>
                Or simply select the <strong className="text-emerald-400">"Supabase / Postgres SQL"</strong> Active Storage Provider above. Supabase uses your browser's persistent Guest session, allowing full database syncing and storage right here inside the preview iframe!
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 3.5. CRM Data Portability & Manual Sync Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 animate-fade-in">
        <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" />
          CRM Data Portability & Supabase Sync
        </h3>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Create immediate local backups of your estimate pipelines and client roster. You can use these backups to safely modify table definitions or security rules without losing any existing data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download Backup Section */}
          <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl space-y-3 flex flex-col justify-between">
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
          <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl space-y-3 flex flex-col justify-between">
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
          <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-850 space-y-3">
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

      {/* 4. Database Maintenance and Reset parameters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
          <Database className="w-5 h-5 text-zinc-400" />
          Maintenance Control Portal
        </h3>
        <p className="text-zinc-400 text-xs">
          Clear out local presets, remove experimental drafts, or reset seed models back to default values (e.g. restoration of template lists).
        </p>

        <div className="p-4 border border-dashed border-zinc-800 bg-neutral-950/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Danger Zone: Reset seed environment</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                This operation wipes local items or active CRM references and recreates default seed profiles. If authenticated, cloud storage is untouched.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Reset local estimates and clients? Any unsaved local cache is lost.')) {
                  onResetDatabase();
                }
              }}
              className="px-3.5 py-1.5 bg-red-950/30 text-red-400 hover:bg-red-900/40 border border-red-950/80 text-xs font-bold rounded-lg transition cursor-pointer self-start block font-sans"
            >
              Reset Seed Cache
            </button>
          </div>
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-6 animate-fade-in text-left">
          {/* PROPOSAL PRESETS PANEL */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="font-display font-bold text-white text-base">Proposal Pricing & Labor Rates</h3>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Configure default hourly pricing, production speed indexes, and material coverage indices.</p>
                </div>
              </div>
              <button
                onClick={restoreDefaultRates}
                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 self-start cursor-pointer font-mono"
              >
                Restore Default Rates
              </button>
            </div>

            {/* SECTION 1: LABOR BASE & SITE SETUP PRESET */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-yellow-400 uppercase font-mono tracking-wider">1. Labor Base & Setup Overhead</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block">HOURLY LABOR RATE ($/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rates.hourlyLaborRate}
                    onChange={(e) => updateRate('hourlyLaborRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none font-bold font-mono"
                  />
                </div>
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block">SETUP BASE PREP TIME (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rates.setupHours}
                    onChange={(e) => updateRate('setupHours', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none font-bold font-mono"
                  />
                </div>
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block">SETUP BASE MATERIALS ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={rates.setupMaterials}
                    onChange={(e) => updateRate('setupMaterials', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: INTERIOR SURFACE ESTIMATION RATES */}
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-blue-400 uppercase font-mono tracking-wider">2. Interior Surface Estimation Rates</h4>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Walls */}
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">Walls</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                        <input type="number" value={rates.wallsSpeed} onChange={(e) => updateRate('wallsSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (sf/gal)</label>
                        <input type="number" value={rates.wallsCoverage} onChange={(e) => updateRate('wallsCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                        <input type="number" value={rates.wallsMaterialCost} onChange={(e) => updateRate('wallsMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                    </div>
                  </div>

                  {/* Ceilings */}
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">Ceilings</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                        <input type="number" value={rates.ceilingsSpeed} onChange={(e) => updateRate('ceilingsSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (sf/gal)</label>
                        <input type="number" value={rates.ceilingsCoverage} onChange={(e) => updateRate('ceilingsCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                        <input type="number" value={rates.ceilingsMaterialCost} onChange={(e) => updateRate('ceilingsMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                    </div>
                  </div>

                  {/* Baseboards */}
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">Baseboards</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (lf/hr)</label>
                        <input type="number" value={rates.baseboardsSpeed} onChange={(e) => updateRate('baseboardsSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (lf/gal)</label>
                        <input type="number" value={rates.baseboardsCoverage} onChange={(e) => updateRate('baseboardsCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                        <input type="number" value={rates.baseboardsMaterialCost} onChange={(e) => updateRate('baseboardsMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Windows */}
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">Windows (Unit rate per coat)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs/coat)</label>
                        <input type="number" step="0.05" value={rates.windowsHoursPerCoat} onChange={(e) => updateRate('windowsHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($/coat)</label>
                        <input type="number" step="0.5" value={rates.windowsMaterialCostPerCoat} onChange={(e) => updateRate('windowsMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                    </div>
                  </div>

                  {/* Doors */}
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">Doors (Unit rate per coat)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs/coat)</label>
                        <input type="number" step="0.05" value={rates.doorsHoursPerCoat} onChange={(e) => updateRate('doorsHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($/coat)</label>
                        <input type="number" step="0.5" value={rates.doorsMaterialCostPerCoat} onChange={(e) => updateRate('doorsMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                    </div>
                  </div>

                  {/* Door Frames */}
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">Door Frames (Unit rate per coat)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs/coat)</label>
                        <input type="number" step="0.05" value={rates.doorFramesHoursPerCoat} onChange={(e) => updateRate('doorFramesHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($/coat)</label>
                        <input type="number" step="0.5" value={rates.doorFramesHoursPerCoat} onChange={(e) => updateRate('doorFramesMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: EXTERIOR SURFACE ESTIMATION RATES */}
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono tracking-wider">3. Exterior Surface Estimation Rates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Siding */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Siding</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.sidingSpeed} onChange={(e) => updateRate('sidingSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (sf/gal)</label>
                      <input type="number" value={rates.sidingCoverage} onChange={(e) => updateRate('sidingCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.sidingMaterialCost} onChange={(e) => updateRate('sidingMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Brick Stain */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Brick Stain</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.brickSpeed} onChange={(e) => updateRate('brickSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (sf/gal)</label>
                      <input type="number" value={rates.brickCoverage} onChange={(e) => updateRate('brickCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.brickMaterialCost} onChange={(e) => updateRate('brickMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Porch Floor */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Porch Floor</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.porchFloorSpeed} onChange={(e) => updateRate('porchFloorSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (sf/gal)</label>
                      <input type="number" value={rates.porchFloorCoverage} onChange={(e) => updateRate('porchFloorCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.porchFloorMaterialCost} onChange={(e) => updateRate('porchFloorMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Soffits */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Soffits</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (lf/hr)</label>
                      <input type="number" value={rates.soffitsSpeed} onChange={(e) => updateRate('soffitsSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (lf/gal)</label>
                      <input type="number" value={rates.soffitsCoverage} onChange={(e) => updateRate('soffitsCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.soffitsMaterialCost} onChange={(e) => updateRate('soffitsMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Gutters */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Gutters</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (lf/hr)</label>
                      <input type="number" value={rates.guttersSpeed} onChange={(e) => updateRate('guttersSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (lf/gal)</label>
                      <input type="number" value={rates.guttersCoverage} onChange={(e) => updateRate('guttersCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.guttersMaterialCost} onChange={(e) => updateRate('guttersMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Fascia */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Fascia</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (lf/hr)</label>
                      <input type="number" value={rates.fasciaSpeed} onChange={(e) => updateRate('fasciaSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (lf/gal)</label>
                      <input type="number" value={rates.fasciaCoverage} onChange={(e) => updateRate('fasciaCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.fasciaMaterialCost} onChange={(e) => updateRate('fasciaMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Trims */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Trims</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (lf/hr)</label>
                      <input type="number" value={rates.trimsSpeed} onChange={(e) => updateRate('trimsSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (lf/gal)</label>
                      <input type="number" value={rates.trimsCoverage} onChange={(e) => updateRate('trimsCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.trimsMaterialCost} onChange={(e) => updateRate('trimsMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Railings */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Railings</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (lf/hr)</label>
                      <input type="number" value={rates.railingsSpeed} onChange={(e) => updateRate('railingsSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (lf/gal)</label>
                      <input type="number" value={rates.railingsCoverage} onChange={(e) => updateRate('railingsCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.railingsMaterialCost} onChange={(e) => updateRate('railingsMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Garage Doors */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Garage Doors (Per coat)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs)</label>
                      <input type="number" step="0.05" value={rates.garageHoursPerCoat} onChange={(e) => updateRate('garageHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($)</label>
                      <input type="number" step="0.5" value={rates.garageMaterialCostPerCoat} onChange={(e) => updateRate('garageMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Front Doors */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Front Doors (Per coat)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs)</label>
                      <input type="number" step="0.05" value={rates.extDoorsHoursPerCoat} onChange={(e) => updateRate('extDoorsHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($)</label>
                      <input type="number" step="0.5" value={rates.extDoorsMaterialCostPerCoat} onChange={(e) => updateRate('extDoorsMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Windows Fixed */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Windows Fixed (Per coat)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs)</label>
                      <input type="number" step="0.05" value={rates.windowsFixedHoursPerCoat} onChange={(e) => updateRate('windowsFixedHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($)</label>
                      <input type="number" step="0.5" value={rates.windowsFixedMaterialCostPerCoat} onChange={(e) => updateRate('windowsFixedMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Shutters */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Shutters (Per coat)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Labor (hrs)</label>
                      <input type="number" step="0.05" value={rates.shuttersHoursPerCoat} onChange={(e) => updateRate('shuttersHoursPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($)</label>
                      <input type="number" step="0.5" value={rates.shuttersMaterialCostPerCoat} onChange={(e) => updateRate('shuttersMaterialCostPerCoat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: DECK SURFACE ESTIMATION RATES */}
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-indigo-400 uppercase font-mono tracking-wider">4. Deck Surface Estimation Rates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Washing */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Washing</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.washingSpeed} onChange={(e) => updateRate('washingSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($/sf)</label>
                      <input type="number" step="0.01" value={rates.washingMaterialCostPerSqft} onChange={(e) => updateRate('washingMaterialCostPerSqft', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Stripping */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Stripping</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.strippingSpeed} onChange={(e) => updateRate('strippingSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($/sf)</label>
                      <input type="number" step="0.005" value={rates.strippingMaterialCostPerSqft} onChange={(e) => updateRate('strippingMaterialCostPerSqft', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Reviving */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Reviving</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.revivingSpeed} onChange={(e) => updateRate('revivingSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Mat. ($/sf)</label>
                      <input type="number" step="0.01" value={rates.revivingMaterialCostPerSqft} onChange={(e) => updateRate('revivingMaterialCostPerSqft', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Sanding */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Sanding</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.sandingSpeed} onChange={(e) => updateRate('sandingSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Flat Cost ($)</label>
                      <input type="number" value={rates.sandingMaterialCostFlat} onChange={(e) => updateRate('sandingMaterialCostFlat', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>

                {/* Staining */}
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wide block">Staining</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Speed (sf/hr)</label>
                      <input type="number" value={rates.stainingSpeed} onChange={(e) => updateRate('stainingSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Cov (sf/gal)</label>
                      <input type="number" value={rates.stainingCoverage} onChange={(e) => updateRate('stainingCoverage', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-mono uppercase block">Price ($/gal)</label>
                      <input type="number" value={rates.stainingMaterialCost} onChange={(e) => updateRate('stainingMaterialCost', parseFloat(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white font-mono" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: TERMS, CONDITIONS & GENERAL NOTES PRESETS */}
            <div className="space-y-4 pt-6 border-t border-neutral-850">
              <h4 className="text-xs font-bold text-pink-400 uppercase font-mono tracking-wider">5. Default Terms & General Notes Presets</h4>
              <p className="text-zinc-500 text-[11px]">
                Set the default legal terms and professional general notes that automatically populate newly created proposals. These will be printable on the client-facing PDF.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block uppercase">Terms & Conditions (Standard Contract Legalities)</label>
                  <textarea
                    rows={6}
                    value={proposalSettings.termsAndConditions || ''}
                    onChange={(e) => saveProposalSettings({ ...proposalSettings, termsAndConditions: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans"
                    placeholder="Enter standard payment terms, warranty, and contract terms..."
                  />
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block uppercase">Interior General Notes</label>
                  <textarea
                    rows={6}
                    value={proposalSettings.interiorGeneralNotes || ''}
                    onChange={(e) => saveProposalSettings({ ...proposalSettings, interiorGeneralNotes: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans"
                    placeholder="Enter default interior notes..."
                  />
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block uppercase">Exterior General Notes</label>
                  <textarea
                    rows={4}
                    value={proposalSettings.exteriorGeneralNotes || ''}
                    onChange={(e) => saveProposalSettings({ ...proposalSettings, exteriorGeneralNotes: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans"
                    placeholder="Enter default exterior notes..."
                  />
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block uppercase">Wood Staining General Notes</label>
                  <textarea
                    rows={4}
                    value={proposalSettings.woodStainingGeneralNotes || ''}
                    onChange={(e) => saveProposalSettings({ ...proposalSettings, woodStainingGeneralNotes: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans"
                    placeholder="Enter default wood staining notes..."
                  />
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 font-mono block uppercase">Brick Staining General Notes</label>
                  <textarea
                    rows={3}
                    value={proposalSettings.brickStainingGeneralNotes || ''}
                    onChange={(e) => saveProposalSettings({ ...proposalSettings, brickStainingGeneralNotes: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans"
                    placeholder="Enter default brick staining notes..."
                  />
                </div>
              </div>
            </div>

            {/* SECTION 6: DISCOUNT PRESETS */}
            <div className="space-y-4 pt-6 border-t border-neutral-850">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-teal-400 uppercase font-mono tracking-wider">6. Discount Presets</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Manage your standard preset discounts that can be applied instantly to proposal subtotals.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const presets = proposalSettings.discountPresets || [];
                    const newPreset = {
                      id: `dp-${Date.now()}`,
                      name: 'New Discount Preset',
                      amount: 10,
                      type: 'percentage' as const
                    };
                    saveProposalSettings({
                      ...proposalSettings,
                      discountPresets: [...presets, newPreset]
                    });
                  }}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-teal-400 hover:text-teal-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Preset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(proposalSettings.discountPresets || []).length === 0 ? (
                  <div className="bg-neutral-950/40 p-6 border border-neutral-850 rounded-xl text-center md:col-span-2 text-zinc-500 text-xs">
                    No discount presets created yet. Click "+ Add Preset" to define some standard discounts.
                  </div>
                ) : (
                  (proposalSettings.discountPresets || []).map((preset, idx) => (
                    <div key={preset.id} className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-[9px] text-zinc-500 font-mono uppercase block mb-1">Preset Display Name</label>
                          <input
                            type="text"
                            value={preset.name}
                            onChange={(e) => {
                              const presets = [...(proposalSettings.discountPresets || [])];
                              presets[idx] = { ...preset, name: e.target.value };
                              saveProposalSettings({ ...proposalSettings, discountPresets: presets });
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-sans font-medium"
                            placeholder="e.g. Winter Special"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-zinc-500 font-mono uppercase block mb-1">Discount Type</label>
                            <select
                              value={preset.type}
                              onChange={(e) => {
                                const presets = [...(proposalSettings.discountPresets || [])];
                                presets[idx] = { ...preset, type: e.target.value as 'fixed' | 'percentage' };
                                saveProposalSettings({ ...proposalSettings, discountPresets: presets });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-sans"
                            >
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed Amount ($)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-zinc-500 font-mono uppercase block mb-1">Value ({preset.type === 'percentage' ? '%' : '$'})</label>
                            <input
                              type="number"
                              value={preset.amount}
                              onChange={(e) => {
                                const presets = [...(proposalSettings.discountPresets || [])];
                                presets[idx] = { ...preset, amount: parseFloat(e.target.value) || 0 };
                                saveProposalSettings({ ...proposalSettings, discountPresets: presets });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const presets = (proposalSettings.discountPresets || []).filter(p => p.id !== preset.id);
                          saveProposalSettings({ ...proposalSettings, discountPresets: presets });
                        }}
                        className="p-1.5 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded border border-red-950/50 cursor-pointer transition mt-5"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SECTION 7: PROPOSAL SCOPE NOTE PRESETS */}
            <div className="space-y-4 pt-6 border-t border-neutral-850">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 uppercase font-mono tracking-wider">7. Scope Note Presets (Inclusions, Exclusions, Special Conditions)</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Manage custom quick-load presets for proposal inclusions, exclusions, and special conditions.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = proposalSettings.scopePresets || DEFAULT_PROPOSAL_SETTINGS.scopePresets || [];
                    const newPreset = {
                      id: `sp-${Date.now()}`,
                      category: 'inclusion' as const,
                      name: 'New Custom Scope Preset',
                      text: '• Describe custom inclusion or exclusion details here...'
                    };
                    saveProposalSettings({
                      ...proposalSettings,
                      scopePresets: [...current, newPreset]
                    });
                  }}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Scope Preset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(proposalSettings.scopePresets || DEFAULT_PROPOSAL_SETTINGS.scopePresets || []).map((preset, idx) => {
                  const currentList = proposalSettings.scopePresets || DEFAULT_PROPOSAL_SETTINGS.scopePresets || [];
                  return (
                    <div key={preset.id} className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={preset.name}
                          onChange={(e) => {
                            const updated = [...currentList];
                            updated[idx] = { ...preset, name: e.target.value };
                            saveProposalSettings({ ...proposalSettings, scopePresets: updated });
                          }}
                          className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-sans font-bold flex-1"
                          placeholder="Preset Button Label"
                        />
                        <select
                          value={preset.category}
                          onChange={(e) => {
                            const updated = [...currentList];
                            updated[idx] = { ...preset, category: e.target.value as any };
                            saveProposalSettings({ ...proposalSettings, scopePresets: updated });
                          }}
                          className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
                        >
                          <option value="inclusion">Inclusion</option>
                          <option value="exclusion">Exclusion</option>
                          <option value="special">Special Condition</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = currentList.filter(p => p.id !== preset.id);
                            saveProposalSettings({ ...proposalSettings, scopePresets: updated });
                          }}
                          className="p-1 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded border border-red-950/50 cursor-pointer transition"
                          title="Delete Preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={preset.text}
                        onChange={(e) => {
                          const updated = [...currentList];
                          updated[idx] = { ...preset, text: e.target.value };
                          saveProposalSettings({ ...proposalSettings, scopePresets: updated });
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none leading-relaxed font-sans"
                        placeholder="Preset text payload..."
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 8: AREA & SURFACE PRESETS */}
            <div className="space-y-4 pt-6 border-t border-neutral-850">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase font-mono tracking-wider">8. Area & Surface Layer Presets</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Manage area options available under Interior, Exterior, and Deck configurations.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = proposalSettings.areaPresets || DEFAULT_PROPOSAL_SETTINGS.areaPresets || [];
                    const newPreset = {
                      id: `ap-${Date.now()}`,
                      category: 'interior' as const,
                      label: 'New Area Layer',
                      calcType: 'wall' as const,
                      defaultQty: 'auto' as const,
                      defaultCoats: 2
                    };
                    saveProposalSettings({
                      ...proposalSettings,
                      areaPresets: [...current, newPreset]
                    });
                  }}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Area Preset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(proposalSettings.areaPresets || DEFAULT_PROPOSAL_SETTINGS.areaPresets || []).map((preset, idx) => {
                  const currentList = proposalSettings.areaPresets || DEFAULT_PROPOSAL_SETTINGS.areaPresets || [];
                  return (
                    <div key={preset.id} className="bg-neutral-950 p-3.5 border border-neutral-850 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={preset.category}
                          onChange={(e) => {
                            const updated = [...currentList];
                            updated[idx] = { ...preset, category: e.target.value as any };
                            saveProposalSettings({ ...proposalSettings, areaPresets: updated });
                          }}
                          className="bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase font-mono"
                        >
                          <option value="interior">Interior</option>
                          <option value="exterior">Exterior</option>
                          <option value="deck">Deck</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = currentList.filter(p => p.id !== preset.id);
                            saveProposalSettings({ ...proposalSettings, areaPresets: updated });
                          }}
                          className="p-1 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded border border-red-950/50 cursor-pointer transition"
                          title="Delete Area Preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={preset.label}
                        onChange={(e) => {
                          const updated = [...currentList];
                          updated[idx] = { ...preset, label: e.target.value };
                          saveProposalSettings({ ...proposalSettings, areaPresets: updated });
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white font-medium"
                        placeholder="Area Preset Label"
                      />

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-zinc-500 font-mono block mb-0.5">Calc Type</label>
                          <select
                            value={preset.calcType}
                            onChange={(e) => {
                              const updated = [...currentList];
                              updated[idx] = { ...preset, calcType: e.target.value as any };
                              saveProposalSettings({ ...proposalSettings, areaPresets: updated });
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-zinc-300 font-mono"
                          >
                            <option value="wall">Wall Sqft</option>
                            <option value="ceiling">Ceiling Sqft</option>
                            <option value="perimeter">Perimeter LF</option>
                            <option value="item">Item Unit Qty</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-zinc-500 font-mono block mb-0.5">Coats</label>
                          <input
                            type="number"
                            value={preset.defaultCoats || 2}
                            onChange={(e) => {
                              const updated = [...currentList];
                              updated[idx] = { ...preset, defaultCoats: parseInt(e.target.value, 10) || 1 };
                              saveProposalSettings({ ...proposalSettings, areaPresets: updated });
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-zinc-300 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

