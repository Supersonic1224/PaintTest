import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, AlertTriangle, Loader2, Plus, Trash2, 
  Lock, UserPlus, ShieldAlert, LogOut, CheckCircle2, XCircle,
  Users, RefreshCw, Download, Upload, HardDrive, Search, Mail, Sparkles
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
  // Registry & UI states
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // Backup & Import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; success: boolean | null; text: string | null }>({
    loading: false,
    success: null,
    text: null
  });

  const activeEmail = dbProvider === 'supabase' ? supabaseUser?.email : currentUser?.email;
  const cleanActiveEmail = activeEmail?.trim().toLowerCase() || '';
  const isOwner = cleanActiveEmail === 'aalnasih4846@gmail.com' || cleanActiveEmail === 'daniel@capstonepainting.ca';
  const userSignedIn = dbProvider === 'supabase' ? !!supabaseUser : !!currentUser;
  const userIsAuthorized = isOwner || (dbProvider === 'supabase' ? isSupabaseAuthorized : isFirestoreAuthorized);

  const loadAuthorizedUsersList = async () => {
    setLoadingUsers(true);
    try {
      // Fetch both Firestore and Supabase lists to make team directory universal
      const [firestoreList, supabaseList] = await Promise.allSettled([
        fetchAuthorizedUsersFromFirestore(),
        fetchAuthorizedUsers()
      ]);

      const mergedMap = new Map<string, AuthorizedUser>();

      if (firestoreList.status === 'fulfilled') {
        firestoreList.value.forEach(u => {
          if (u.email) {
            mergedMap.set(u.email.toLowerCase().trim(), u);
          }
        });
      }

      if (supabaseList.status === 'fulfilled') {
        supabaseList.value.forEach(u => {
          if (u.email) {
            const clean = u.email.toLowerCase().trim();
            if (!mergedMap.has(clean)) {
              mergedMap.set(clean, u);
            }
          }
        });
      }

      // If empty or offline, ensure local storage and owner defaults are present
      const list = Array.from(mergedMap.values());
      if (list.length === 0) {
        if (dbProvider === 'supabase') {
          const fallback = await fetchAuthorizedUsers();
          setAuthorizedUsers(fallback);
        } else {
          const fallback = await fetchAuthorizedUsersFromFirestore();
          setAuthorizedUsers(fallback);
        }
      } else {
        setAuthorizedUsers(list);
      }
    } catch (err) {
      console.error('Failed to load authorized users list:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAuthorizedUsersList();
  }, [isSupabaseAuthorized, isFirestoreAuthorized, dbProvider, userSignedIn]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setUserActionSuccess(null);
    
    const emailToAuthorize = newAuthEmail.trim().toLowerCase();
    if (!emailToAuthorize) {
      setUserActionError('Please provide a valid email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAuthorize)) {
      setUserActionError('Please enter a valid email format (e.g. name@company.com).');
      return;
    }

    setAddingUser(true);
    try {
      let sbSuccess = false;
      let fsSuccess = false;
      let errors: string[] = [];

      // 1. Add to Firestore (primary persistent storage)
      try {
        await addAuthorizedUserToFirestore(emailToAuthorize);
        fsSuccess = true;
      } catch (err: any) {
        console.warn('Could not add authorized user to Firestore:', err);
        errors.push(`Firestore: ${err.message || err}`);
      }

      // 2. Add to Supabase (if active or configured)
      const sb = getSupabase();
      if (sb) {
        try {
          await addAuthorizedUser(emailToAuthorize);
          sbSuccess = true;
        } catch (err: any) {
          console.warn('Could not add authorized user to Supabase:', err);
        }
      }

      if (!fsSuccess && !sbSuccess) {
        throw new Error(`Failed to save authorization: ${errors.join('; ')}`);
      }

      setUserActionSuccess(`Successfully authorized ${emailToAuthorize}! They now have full workspace access.`);
      setNewAuthEmail('');
      await loadAuthorizedUsersList();
      await onCheckAuth();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to authorize user.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (id: string, email: string) => {
    setUserActionError(null);
    setUserActionSuccess(null);
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === 'aalnasih4846@gmail.com') {
      alert('The primary owner account cannot be removed from the authorized directory.');
      return;
    }

    if (!window.confirm(`Revoke authorized access for ${email}? They will no longer be able to edit or create proposals.`)) {
      return;
    }

    try {
      // 1. Remove from Firestore
      const docId = cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      await removeAuthorizedUserFromFirestore(docId);

      // 2. Remove from Supabase if configured
      const sb = getSupabase();
      if (sb) {
        try {
          await removeAuthorizedUser(id);
        } catch (e) {
          // Ignore secondary DB error
        }
      }

      setUserActionSuccess(`Successfully revoked access for ${email}.`);
      await loadAuthorizedUsersList();
      await onCheckAuth();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to remove user.');
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

  const filteredUsers = authorizedUsers.filter(u => 
    !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left pb-16">
      
      {/* Top Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">Authorized Personnel Directory</h2>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Manage who has access to view, edit, and create proposals and customer portfolios. Any signed-in authorized person can authorize team members directly below.
          </p>
        </div>

        {/* Current Active User Status Pill */}
        <div className="flex flex-wrap items-center gap-3">
          {userSignedIn ? (
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-neutral-950/80 border border-neutral-800 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Signed in as</span>
                <span className="font-semibold text-zinc-200">{activeEmail || 'User'}</span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="ml-2 p-1.5 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onSignIn && (
              <button
                onClick={onSignIn}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Access Gate: If not signed in or not authorized */}
      {!userIsAuthorized && (
        <div className="bg-neutral-900 border border-amber-900/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Authorization Required to Manage Team</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You must be signed into an authorized account or owner email (<span className="text-zinc-200 font-mono">aalnasih4846@gmail.com</span>) to grant workspace privileges to colleagues.
          </p>
          {onSignIn && !userSignedIn && (
            <button
              onClick={onSignIn}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Sign In to Continue</span>
            </button>
          )}
        </div>
      )}

      {/* Main Personnel Management Section (Available to authorized users/owner) */}
      {userIsAuthorized && (
        <div className="space-y-6">

          {/* Quick Add Personnel Form (NO PASSWORD NEEDED) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Authorize New Team Member</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Instant 1-Click Authorization</span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Enter the Google or company email address of the painter, estimator, or office staff. Once added, they will have instant full access upon signing in.
            </p>

            <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={newAuthEmail}
                  onChange={(e) => setNewAuthEmail(e.target.value)}
                  placeholder="e.g. teammate@capstonepainting.ca or worker@gmail.com"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none transition font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={addingUser || !newAuthEmail.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition duration-150 shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {addingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Authorize Personnel</span>
                  </>
                )}
              </button>
            </form>

            {userActionSuccess && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{userActionSuccess}</span>
              </div>
            )}

            {userActionError && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{userActionError}</span>
              </div>
            )}
          </div>

          {/* Table of Authorized Users */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-display">Active Authorized Personnel</h3>
                <span className="px-2 py-0.5 bg-neutral-800 text-zinc-300 text-xs font-mono rounded-full font-bold">
                  {authorizedUsers.length}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email..."
                    className="bg-neutral-950 border border-neutral-800 text-xs text-zinc-200 placeholder-zinc-600 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-neutral-700 w-44 sm:w-56"
                  />
                </div>

                <button
                  onClick={loadAuthorizedUsersList}
                  disabled={loadingUsers}
                  className="p-2 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
                  title="Refresh table"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center gap-3 py-12 text-zinc-500 text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Loading authorized user registry...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 bg-neutral-950 rounded-xl border border-neutral-850 text-center text-zinc-500 text-xs">
                {searchQuery ? `No authorized personnel matching "${searchQuery}".` : 'No authorized users found.'}
              </div>
            ) : (
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-900 border-b border-neutral-800 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-3 px-4">Authorized User / Email</th>
                        <th className="py-3 px-4">Role & Access</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date Added</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {filteredUsers.map((user) => {
                        const emailLower = user.email.toLowerCase().trim();
                        const isMainOwner = emailLower === 'aalnasih4846@gmail.com' || emailLower === 'daniel@capstonepainting.ca';
                        const isCurrent = emailLower === cleanActiveEmail;
                        const dateFormatted = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Active';

                        return (
                          <tr key={user.id || user.email} className="hover:bg-neutral-900/40 text-zinc-300 transition duration-100">
                            {/* User / Email */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase shrink-0">
                                  {user.email.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white truncate max-w-[220px] sm:max-w-xs" title={user.email}>
                                      {user.email}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role & Access */}
                            <td className="py-3.5 px-4">
                              {isMainOwner ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded-full font-semibold">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Owner / Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-850 text-zinc-300 border border-neutral-700 px-2 py-0.5 rounded-full font-medium">
                                  Authorized Personnel
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Authorized
                              </span>
                            </td>

                            {/* Date Added */}
                            <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                              {dateFormatted}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              {isMainOwner ? (
                                <span className="text-[10px] text-zinc-600 font-mono italic">
                                  Protected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUser(user.id, user.email)}
                                  className="px-2.5 py-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition duration-150 text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Revoke access"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Revoke</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* CRM Data Portability & Backup Section */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>CRM Data Backup & Export</span>
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Export a standalone JSON backup of your active clients ({clients.length}) and estimates ({projects.length}) to your computer anytime.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Download Backup */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-blue-400" /> Download Local Backup
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Save all estimates and clients to a local <code>.json</code> file.
                  </p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="w-full px-3 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-zinc-200 hover:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export Backup (.json)</span>
                </button>
              </div>

              {/* Upload Backup */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" /> Restore Backup
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Upload a previously exported JSON backup file.
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
                    className="w-full px-3 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-zinc-200 hover:text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload JSON File</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Import feedback */}
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
          </div>

        </div>
      )}

    </div>
  );
}
