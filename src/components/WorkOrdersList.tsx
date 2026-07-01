import React, { useMemo } from 'react';
import { ProjectDetails, ClientLead } from '../types';
import { Wrench, CheckCircle, Circle, ClipboardList } from 'lucide-react';

interface WorkOrdersListProps {
  projects: ProjectDetails[];
  clients: ClientLead[];
}

export default function WorkOrdersList({
  projects,
  clients,
}: WorkOrdersListProps) {

  const activeWorkJobs = useMemo(() => {
    return projects.filter(p => p.status === 'Approved' || p.status === 'Completed' || p.status === 'In Progress');
  }, [projects]);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <p className="text-xs text-zinc-500">Live work order routing lists active crews, paint checklists, and job status details.</p>
        <span className="text-zinc-500 text-sm font-bold">{activeWorkJobs.length} active work orders</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeWorkJobs.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-zinc-500 font-medium h-48 flex flex-col justify-center items-center">
            <ClipboardList className="w-8 h-8 text-zinc-600 mb-2" />
            No active work orders. Once proposals are ACCEPTED, physical operational tasks populate here.
          </div>
        ) : (
          activeWorkJobs.map(p => {
            const client = clients.find(c => c.id === p.clientId);
            const totalTasks = p.tasks.length;
            const completedTasks = p.tasks.filter(t => t.completed).length;
            const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

            return (
              <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between border-b border-neutral-850 pb-3">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Job WO-#{p.id}</span>
                    <h4 className="text-base font-bold text-white mt-0.5">{client?.name || p.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 truncate">{client?.address || 'No physical site specified'}</p>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold font-mono py-1 px-3 bg-emerald-950/30 border border-emerald-900 rounded-full">
                    {percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Task completion status</span>
                    <span className="font-mono">{completedTasks}/{totalTasks} items completed</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 border border-neutral-850/50 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                  </div>
                </div>

                {/* Checklist segment */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Operational Checklist</span>
                  <div className="space-y-2 bg-neutral-950/40 border border-neutral-850 p-3 rounded-xl max-h-[180px] overflow-y-auto">
                    {p.tasks.length === 0 ? (
                      <div className="text-[11px] italic text-zinc-500 py-1 font-sans">
                        All contractor prep work completed. Site is ready for handoff.
                      </div>
                    ) : (
                      p.tasks.map(t => (
                        <div key={t.id} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          {t.completed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                          )}
                          <span className={t.completed ? 'line-through text-zinc-500 font-light' : 'font-medium'}>{t.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
