import React, { useMemo } from 'react';
import { ProjectDetails, ClientLead } from '../types';
import { FileSpreadsheet, CheckCircle2, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';

interface InvoicesListProps {
  projects: ProjectDetails[];
  clients: ClientLead[];
  onSelectProject: (projectId: string) => void;
}

export default function InvoicesList({
  projects,
  clients,
  onSelectProject,
}: InvoicesListProps) {

  const invoiceList = useMemo(() => {
    // Generate invoices dynamically based on proposals
    return projects.map((p, index) => {
      const client = clients.find(c => c.id === p.clientId);
      const isAccepted = p.status === 'Approved' || p.status === 'Completed';
      
      return {
        invoiceNum: `INV-2026-${1000 + index}`,
        proposalNum: p.id,
        customer: client?.name || p.title,
        date: p.createdAt,
        amount: p.summary.totalPrice,
        status: isAccepted ? 'PAID' : 'PENDING_SIGN',
        address: client?.address || '—'
      };
    });
  }, [projects, clients]);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <p className="text-xs text-zinc-500">Invoices and payouts generated automatically from accepted contractor estimates.</p>
        <span className="text-zinc-500 text-sm font-bold">{invoiceList.length} total bills</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Total Invoiced</span>
          <span className="text-2xl font-extrabold text-white block mt-1">
            ${invoiceList.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {/* Metric 2 */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Collections (Received)</span>
          <span className="text-2xl font-extrabold text-emerald-400 block mt-1">
            ${invoiceList.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {/* Metric 3 */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Outstanding Balance</span>
          <span className="text-2xl font-extrabold text-amber-500 block mt-1">
            ${invoiceList.filter(i => i.status !== 'PAID').reduce((sum, inv) => sum + inv.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-800 text-[11px] font-bold text-zinc-500 uppercase tracking-widest bg-neutral-950/20">
                <th className="py-4 px-4 md:px-6">INVOICE #</th>
                <th className="py-4 px-4 md:px-6">CUSTOMER</th>
                <th className="py-4 px-6 hidden sm:table-cell">REL. PROPOSAL</th>
                <th className="py-4 px-4 md:px-6">STATUS</th>
                <th className="py-4 px-4 md:px-6 text-right">AMOUNT OUTSTANDING</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {invoiceList.map((inv) => (
                <tr 
                  key={inv.invoiceNum}
                  onClick={() => onSelectProject(inv.proposalNum)}
                  className="hover:bg-neutral-950/40 cursor-pointer group transition duration-150"
                >
                  <td className="py-4 px-4 md:px-6 text-sm font-bold text-zinc-100 font-mono">
                    {inv.invoiceNum}
                  </td>
                  <td className="py-4 px-4 md:px-6 text-sm font-bold text-white">
                    {inv.customer}
                  </td>
                  <td className="py-4 px-6 text-xs text-blue-500 font-mono font-bold hidden sm:table-cell">
                    {inv.proposalNum}
                  </td>
                  <td className="py-4 px-4 md:px-6 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${
                      inv.status === 'PAID' 
                        ? 'bg-emerald-950/50 border border-emerald-950 text-emerald-400' 
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {inv.status === 'PAID' ? '● PAID' : 'PENDING SIGN'}
                    </span>
                  </td>
                  <td className="py-4 px-4 md:px-6 text-sm font-bold text-white text-right font-mono">
                    ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
