import React, { useState, useMemo } from 'react';
import { ProjectDetails, ClientLead } from '../types';
import { Search, ChevronDown, SlidersHorizontal, Plus, ArrowUpDown } from 'lucide-react';

interface ProposalsListProps {
  projects: ProjectDetails[];
  clients: ClientLead[];
  onSelectProject: (projectId: string) => void;
  onNewProposal: () => void;
}

export default function ProposalsList({
  projects,
  clients,
  onSelectProject,
  onNewProposal,
}: ProposalsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Approved'>('All');

  // Format Helper for Date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
    } catch (e) {
      return 'Jun 10, 2026';
    }
  };

  // Filter project lists
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const client = clients.find(c => c.id === p.clientId);
      const clientName = client?.name || p.title || '';
      const address = client?.address || '';
      const matchesSearch = 
        clientName.toLowerCase().includes(search.toLowerCase()) || 
        address.toLowerCase().includes(search.toLowerCase()) || 
        p.id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = 
        statusFilter === 'All' || 
        (statusFilter === 'Draft' && p.status === 'Draft') || 
        (statusFilter === 'Approved' && (p.status === 'Approved' || p.status === 'Completed'));

      return matchesSearch && matchesStatus;
    });
  }, [projects, clients, search, statusFilter]);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* Filters toolbar matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search Input bar */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, address, #..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition font-sans"
          />
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2.5">
          <div className="relative inline-block text-left">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-850 text-zinc-300 rounded-xl px-4 py-2.5 text-sm font-semibold pr-10 hover:text-white cursor-pointer select-none appearance-none font-sans focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Proposals</option>
              <option value="Draft">Drafts Only</option>
              <option value="Approved">Accepted Only</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            </div>
          </div>

          <span className="text-zinc-500 text-sm font-bold tracking-tight px-1 font-sans">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'proposal' : 'proposals'}
          </span>
        </div>

        {/* Create Proposal Action Button */}
        <button 
          onClick={onNewProposal}
          className="sm:ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-lg shadow-blue-500/10 active:scale-95"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Proposal</span>
        </button>
      </div>

      {/* Proposals List Table Container */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-800 text-[11px] font-bold text-zinc-500 uppercase tracking-widest select-none bg-neutral-950/20">
                <th className="py-4 px-4 md:px-6 font-sans">PROPOSAL #</th>
                <th className="py-4 px-4 md:px-6 font-sans">CUSTOMER</th>
                <th className="py-4 px-6 font-sans hidden md:table-cell">ADDRESS</th>
                <th className="py-4 px-6 font-sans hidden sm:table-cell">DATE</th>
                <th className="py-4 px-4 md:px-6 font-sans">STATUS</th>
                <th className="py-4 px-4 md:px-6 font-sans text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-medium font-sans">
                    No matching painting proposals found.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const client = clients.find(c => c.id === p.clientId);
                  const clientName = client?.name || p.title;
                  const addressText = client?.address || '—';
                  const isAccepted = p.status === 'Approved' || p.status === 'Completed';

                  return (
                    <tr 
                      key={p.id}
                      onClick={() => onSelectProject(p.id)}
                      className="hover:bg-neutral-950/40 cursor-pointer group transition duration-150"
                    >
                      {/* Proposal ID */}
                      <td className="py-4 px-4 md:px-6 text-sm font-bold text-blue-500 group-hover:text-blue-400 font-mono transition">
                        {p.id}
                      </td>

                      {/* Customer Name */}
                      <td className="py-4 px-4 md:px-6 text-sm font-bold text-white tracking-tight">
                        {clientName}
                      </td>

                      {/* Address */}
                      <td className="py-4 px-6 text-xs text-zinc-400 font-mono max-w-[280px] truncate leading-tight hidden md:table-cell">
                        {addressText}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-xs text-zinc-400 font-sans hidden sm:table-cell">
                        {formatDate(p.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 md:px-6 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest uppercase border ${
                          isAccepted 
                            ? 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400' 
                            : 'bg-zinc-800 border-zinc-750 text-zinc-300'
                        }`}>
                          {isAccepted ? 'ACCEPTED' : 'DRAFT'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 md:px-6 text-sm font-bold text-white text-right font-mono">
                        ${p.summary.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
