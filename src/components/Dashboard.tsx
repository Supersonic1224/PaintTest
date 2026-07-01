import React, { useMemo } from 'react';
import { ClientLead, ProjectDetails } from '../types';
import { 
  Users, 
  Paintbrush, 
  FileText, 
  DollarSign, 
  CheckSquare, 
  Send,
  Bell,
  Eye,
  Clock,
  ExternalLink,
  ArrowUpRight,
  Plus,
  CheckCircle,
  TrendingUp,
  FolderOpen
} from 'lucide-react';

interface DashboardProps {
  clients: ClientLead[];
  projects: ProjectDetails[];
  onSelectProject: (projectId: string) => void;
  onNewClient: () => void;
  onOpenEstimator: () => void;
  userName: string;
  driveConnected: boolean;
}

export default function Dashboard({
  clients,
  projects,
  onSelectProject,
  onNewClient,
  onOpenEstimator,
  userName,
  driveConnected,
}: DashboardProps) {

  // Statistics calculations matching the screenshot:
  const stats = useMemo(() => {
    // Exact counts for Demo mode or live data
    const totalCount = projects.length;
    // Map status 'Approved' to accepted
    const acceptedCount = projects.filter(p => p.status === 'Approved' || p.status === 'Completed').length;
    const sentCount = projects.filter(p => p.status === 'Sent').length;
    const totalRev = projects
      .filter(p => p.status === 'Approved' || p.status === 'Completed' || p.status === 'Invoiced')
      .reduce((sum, p) => sum + p.summary.totalPrice, 0);

    return {
      totalProposals: totalCount,
      accepted: acceptedCount,
      sent: sentCount,
      totalRevenue: totalRev
    };
  }, [projects]);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Proposals */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">Total Proposals</span>
            <div className="text-4xl font-display font-extrabold text-white mt-1">{stats.totalProposals}</div>
          </div>
          <div className="p-2.5 bg-blue-950/40 border border-blue-900/40 rounded-xl text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Accepted */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">Accepted</span>
            <div className="text-4xl font-display font-extrabold text-white mt-1">{stats.accepted}</div>
          </div>
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Sent */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">Sent</span>
            <div className="text-4xl font-display font-extrabold text-white mt-1">{stats.sent}</div>
          </div>
          <div className="p-2.5 bg-amber-950/40 border border-amber-900/40 rounded-xl text-amber-550">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">Total Revenue</span>
            <div className="text-4xl font-display font-extrabold text-white tracking-tight mt-1">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl text-emerald-450">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Bottom Grid Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Accepted Proposals */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Bell className="w-5 h-5 text-blue-400" />
            <h3 className="font-display font-bold text-white text-base">Accepted Proposals</h3>
          </div>

          <div className="space-y-3">
            {projects.filter(p => p.status === 'Approved' || p.status === 'Completed').length === 0 ? (
              <div className="text-zinc-500 text-sm py-8 text-center bg-neutral-950/30 rounded-xl border border-dashed border-neutral-850">
                No accepted proposals yet. Use estimator to create and approve quotes.
              </div>
            ) : (
              projects.filter(p => p.status === 'Approved' || p.status === 'Completed').map(p => {
                const clientName = clients.find(c => c.id === p.clientId)?.name || p.title;
                return (
                  <div 
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="p-4 bg-neutral-950/40 border border-neutral-850 hover:border-blue-500/50 rounded-xl flex items-center justify-between group cursor-pointer transition duration-250"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-850 flex items-center justify-center text-zinc-400 border border-neutral-800 group-hover:bg-blue-950/30 group-hover:text-blue-400 transition duration-200">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white leading-snug group-hover:text-blue-400 transition">
                          {clientName} accepted proposal {p.id}
                        </h4>
                        <p className="text-xs text-zinc-300 mt-0.5">
                          Signed by {clientName} • ${p.summary.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-mono mt-1 block">2 days ago</span>
                      </div>
                    </div>
                    <div>
                      <ArrowUpRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Proposal View Times */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Eye className="w-5 h-5 text-blue-400" />
            <h3 className="font-display font-bold text-white text-base">Proposal View Times</h3>
          </div>

          <div className="space-y-3">
            {projects.filter(p => p.status === 'Approved' || p.status === 'Completed').length === 0 ? (
              <div className="text-zinc-500 text-sm py-8 text-center bg-neutral-950/30 rounded-xl border border-dashed border-neutral-850">
                No active engagement tracking logs yet.
              </div>
            ) : (
              projects.filter(p => p.status === 'Approved' || p.status === 'Completed').map(p => {
                const clientName = clients.find(c => c.id === p.clientId)?.name || p.title;
                return (
                  <div 
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="p-4 bg-neutral-950/40 border border-neutral-850 hover:border-blue-500/50 rounded-xl flex items-center justify-between group cursor-pointer transition duration-250"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-850 flex items-center justify-center text-zinc-400 border border-neutral-800 group-hover:bg-blue-950/30 group-hover:text-blue-400 transition duration-200">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-white leading-snug group-hover:text-blue-400 transition">
                            {clientName}
                          </h4>
                          <span className="px-2 py-0.5 text-[8px] font-extrabold bg-emerald-950/60 border border-emerald-900 text-emerald-400 rounded-full select-none tracking-wider font-sans">
                            ACCEPTED
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono mt-1">
                          {p.id} • ${p.summary.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </p>
                        <span className="text-[10px] text-zinc-400 block mt-1">Last viewed 2 days ago</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-white tracking-tight block">30s</span>
                        <span className="text-[10px] text-zinc-300 font-bold block">Medium</span>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cloud & Drive Active Backup Health bar */}
      <div className={`p-4 rounded-xl border flex items-center justify-between bg-neutral-950 border-neutral-800 text-zinc-400 shadow-inner`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-blue-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              Google Drive Cloud Integration
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            </h4>
            <p className="text-xs text-zinc-300 mt-1">
              Active Sync maps contract documents, client specifications, and estimates automatically to Google Workspace.
            </p>
          </div>
        </div>
        <div>
          <span className="text-[10px] tracking-wider uppercase font-bold text-emerald-400 bg-emerald-950 border border-emerald-900 px-3 py-1 rounded-full">
            ● Synced
          </span>
        </div>
      </div>
    </div>
  );
}
