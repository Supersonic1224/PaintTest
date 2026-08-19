import React, { useState, useMemo } from 'react';
import { 
  ProjectDetails as ProjectType, 
  ClientLead, 
  ProposalSettings, 
  DEFAULT_PROPOSAL_SETTINGS,
  DEFAULT_REAL_PRODUCTS,
  RoomSpec,
  RealProduct
} from '../types';
import { calculateRoomPricing } from '../utils/pricing';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Paintbrush, 
  Ruler, 
  Boxes,
  Building2,
  Percent,
  Clock,
  Printer,
  Receipt,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Wrench,
  Package,
  Sliders,
  Info,
  Check,
  Palette
} from 'lucide-react';

interface WorkOrderPricingTabProps {
  projects: ProjectType[];
  clients: ClientLead[];
  selectedProjectId?: string;
  onSelectProjectId?: (id: string) => void;
  proposalSettings?: ProposalSettings;
  onOpenProject: (project: ProjectType) => void;
  onNavigateToWorkOrder?: (projectId: string, scope?: string) => void;
}

export const WorkOrderPricingTab: React.FC<WorkOrderPricingTabProps> = ({
  projects,
  clients,
  selectedProjectId: externalSelectedProjectId,
  onSelectProjectId,
  proposalSettings = DEFAULT_PROPOSAL_SETTINGS,
  onOpenProject,
  onNavigateToWorkOrder,
}) => {
  // Client map helper
  const clientMap = useMemo(() => {
    const map = new Map<string, ClientLead>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Selected work order ID
  const [internalSelectedId, setInternalSelectedId] = useState<string>(() => {
    if (externalSelectedProjectId && projects.some(p => p.id === externalSelectedProjectId)) {
      return externalSelectedProjectId;
    }
    return projects[0]?.id || '';
  });

  const activeSelectedId = externalSelectedProjectId || internalSelectedId;

  const handleSelectWorkOrder = (id: string, shouldScrollToBreakdown = true) => {
    setInternalSelectedId(id);
    if (onSelectProjectId) onSelectProjectId(id);

    if (shouldScrollToBreakdown) {
      setTimeout(() => {
        const el = document.getElementById('work-order-price-breakdown-details');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const handleScrollToTop = () => {
    const el = document.getElementById('work-order-list-directory');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Search and status filters for work order picker
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'In Progress' | 'Completed' | 'Sent' | 'Draft'>('All');
  const [scopeCategoryFilter, setScopeCategoryFilter] = useState<'all' | 'interior' | 'exterior' | 'deck'>('all');
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(new Set());
  const [activeLogicPillar, setActiveLogicPillar] = useState<'all' | 'labor' | 'materials' | 'rates' | 'prep'>('all');

  // Filtered projects for picker
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const client = clientMap.get(p.clientId);
      const matchesSearch = 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client?.name && client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client?.address && client.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, clientMap, searchQuery, statusFilter]);

  // Target selected project
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === activeSelectedId) || filteredProjects[0] || projects[0] || null;
  }, [projects, filteredProjects, activeSelectedId]);

  const selectedClient = useMemo(() => {
    if (!selectedProject) return null;
    return clientMap.get(selectedProject.clientId) || null;
  }, [selectedProject, clientMap]);

  // Work Order Number formatting
  const getWorkOrderNumber = (projectId: string, scope?: string) => {
    const shortId = projectId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase() || '001';
    const scopeCode = scope && scope !== 'all' ? `-${scope.toUpperCase().slice(0, 3)}` : '';
    return `WO-${shortId}${scopeCode}`;
  };

  // Pricing calculations for the selected project
  const defaultHourlyRate = proposalSettings?.rates?.hourlyLaborRate || 113.13;
  const painterWageRate = Math.round(defaultHourlyRate * 0.35 * 10) / 10; // $39.60/hr

  const projectPricingMetrics = useMemo(() => {
    if (!selectedProject) return null;

    const rates = proposalSettings?.rates;
    const realProducts = proposalSettings?.realProducts || DEFAULT_REAL_PRODUCTS;
    const calculationEngine = proposalSettings?.calculationEngine || rates?.calculationEngine || 'paintnav';

    let totalHours = 0;
    let totalMaterials = 0;
    const roomMetricsList: Array<{
      room: RoomSpec;
      pricing: ReturnType<typeof calculateRoomPricing>;
      category: 'interior' | 'exterior' | 'deck';
    }> = [];

    const rooms = selectedProject.rooms || [];
    rooms.forEach(room => {
      // Determine category
      let cat: 'interior' | 'exterior' | 'deck' = room.category || 'interior';
      const nameLower = (room.name || '').toLowerCase();
      if (nameLower.includes('exterior') || nameLower.includes('siding') || nameLower.includes('soffit') || nameLower.includes('fascia') || nameLower.includes('brick')) {
        cat = 'exterior';
      } else if (nameLower.includes('deck') || nameLower.includes('fence') || nameLower.includes('porch') || nameLower.includes('stain')) {
        cat = 'deck';
      }

      const pricing = calculateRoomPricing(room, { ...rates, calculationEngine }, realProducts);
      roomMetricsList.push({ room, pricing, category: cat });

      if (!room.isOption) {
        totalHours += pricing.hours;
        totalMaterials += pricing.materialCost;
      }
    });

    // Setup hours & materials if any
    const setupH = rates?.setupHours ?? 0;
    const setupM = rates?.setupMaterials ?? 0;
    if (totalHours > 0) {
      totalHours += setupH;
      totalMaterials += setupM;
    }

    const hourlyRate = selectedProject.summary?.hourlyLaborRate || defaultHourlyRate;
    const laborRetail = Math.round(totalHours * hourlyRate);
    const materialsRetail = Math.round(totalMaterials);
    const subtotalBeforeDiscount = laborRetail + materialsRetail;
    const discount = selectedProject.summary?.discount || 0;
    const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
    const taxRate = selectedProject.summary?.taxRate ?? 0.13;
    const tax = subtotal * taxRate;
    const grandTotal = subtotal + tax;
    const deposit = grandTotal * 0.30;
    const balance = grandTotal * 0.70;

    // Direct Costs & Company Margin Breakdown
    const directLaborCost = Math.round(totalHours * painterWageRate);
    const directMaterialCost = Math.round(totalMaterials * 0.75); // ~75% contractor wholesale/trade cost
    const totalDirectCost = directLaborCost + directMaterialCost;
    const overheadCost = Math.round(subtotal * 0.10); // 10% overhead
    const totalAllCost = totalDirectCost + overheadCost;
    const grossProfit = subtotal - totalDirectCost;
    const grossMarginPct = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;
    const netProfit = subtotal - totalAllCost;
    const netMarginPct = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;

    // Gather unique scope categories
    const availableScopes = new Set<'interior' | 'exterior' | 'deck'>();
    roomMetricsList.forEach(rm => availableScopes.add(rm.category));

    // Consolidated Paint & Shopping list
    const paintMap = new Map<string, {
      product: string;
      brand: string;
      color: string;
      finish: string;
      surface: string;
      gallons: number;
      estimatedCost: number;
    }>();

    rooms.forEach(room => {
      (room.paints || []).forEach(p => {
        const key = `${p.brand}-${p.colorName}-${p.finish}-${p.surface}`;
        const existing = paintMap.get(key);
        if (existing) {
          existing.gallons += (p.gallonsNeeded || 1);
          existing.estimatedCost += (p.gallonsNeeded || 1) * 65;
        } else {
          paintMap.set(key, {
            product: `${p.brand} ${p.finish}`,
            brand: p.brand || 'Sherwin-Williams',
            color: `${p.colorName} (${p.colorCode || 'Custom'})`,
            finish: p.finish || 'Eggshell',
            surface: p.surface || 'walls',
            gallons: p.gallonsNeeded || 1,
            estimatedCost: (p.gallonsNeeded || 1) * 65
          });
        }
      });
    });

    return {
      totalHours: parseFloat(totalHours.toFixed(1)),
      hourlyRate,
      laborRetail,
      materialsRetail,
      subtotalBeforeDiscount,
      discount,
      subtotal,
      taxRate,
      tax,
      grandTotal,
      deposit,
      balance,
      directLaborCost,
      directMaterialCost,
      overheadCost,
      totalDirectCost,
      totalAllCost,
      grossProfit,
      grossMarginPct,
      netProfit,
      netMarginPct,
      roomMetricsList,
      availableScopes: Array.from(availableScopes),
      paintShoppingList: Array.from(paintMap.values())
    };
  }, [selectedProject, proposalSettings, defaultHourlyRate, painterWageRate]);

  // Toggle expand all rooms
  const toggleRoomExpand = (roomId: string) => {
    setExpandedRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const expandAllRooms = () => {
    if (!selectedProject?.rooms) return;
    setExpandedRoomIds(new Set(selectedProject.rooms.map(r => r.id)));
  };

  const collapseAllRooms = () => {
    setExpandedRoomIds(new Set());
  };

  // Quick navigation between projects
  const currentProjectIndex = selectedProject ? filteredProjects.findIndex(p => p.id === selectedProject.id) : -1;
  const hasPrevious = currentProjectIndex > 0;
  const hasNext = currentProjectIndex >= 0 && currentProjectIndex < filteredProjects.length - 1;

  const handleGoPrevious = () => {
    if (hasPrevious) {
      handleSelectWorkOrder(filteredProjects[currentProjectIndex - 1].id);
    }
  };

  const handleGoNext = () => {
    if (hasNext) {
      handleSelectWorkOrder(filteredProjects[currentProjectIndex + 1].id);
    }
  };

  if (!selectedProject || !projectPricingMetrics) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-4">
        <div className="p-3 bg-neutral-800 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center text-zinc-400">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white font-display">No Work Orders Found</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Create or import proposals and projects in your CRM to view instant work order pricing breakdowns and margin analysis.
        </p>
      </div>
    );
  }

  // Filtered rooms based on selected scope
  const activeRooms = projectPricingMetrics.roomMetricsList.filter(rm => {
    if (scopeCategoryFilter === 'all') return true;
    return rm.category === scopeCategoryFilter;
  });

  return (
    <div className="space-y-8 text-left">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. WORK ORDER DIRECTORY LIST (STEP 1: PICK A WORK ORDER)       */}
      {/* ------------------------------------------------------------- */}
      <div id="work-order-list-directory" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold font-display text-white">
                  1. Select a Work Order from the List
                </h2>
                <span className="bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase">
                  {filteredProjects.length} Available
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click on any work order below to instantly load and scroll down to its itemized pricing math, labor speed formulas, and profit margins.
              </p>
            </div>
          </div>

          {selectedProject && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs self-start lg:self-auto shrink-0">
              <span className="text-zinc-400 hidden sm:inline">Currently Selected:</span>
              <span className="px-2.5 py-1 bg-blue-950 text-blue-400 border border-blue-800/50 rounded-lg font-bold">
                {getWorkOrderNumber(selectedProject.id)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('work-order-price-breakdown-details');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer flex items-center gap-1 font-bold whitespace-nowrap shadow-xs"
              >
                <span>Jump to Breakdown</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md font-mono">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search work order #, client, address, title..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px] font-mono overflow-x-auto max-w-full shrink-0">
            {(['All', 'Approved', 'In Progress', 'Completed', 'Sent', 'Draft'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Work Order Directory List (Table on desktop, Cards on mobile) */}
        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono min-w-[660px]">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/80 text-[10px] text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4">Work Order #</th>
                  <th className="py-3 px-4">Client & Address</th>
                  <th className="py-3 px-4">Scope / Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Est. Hours</th>
                  <th className="py-3 px-4 text-right">Total Price</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {filteredProjects.map((p) => {
                  const isSelected = p.id === selectedProject.id;
                  const c = clientMap.get(p.clientId);
                  const rates = proposalSettings?.rates;
                  const realProducts = proposalSettings?.realProducts || DEFAULT_REAL_PRODUCTS;
                  const calculationEngine = proposalSettings?.calculationEngine || rates?.calculationEngine || 'paintnav';
                  
                  let estHours = 0;
                  (p.rooms || []).forEach(r => {
                    if (!r.isOption) {
                      const pr = calculateRoomPricing(r, { ...rates, calculationEngine }, realProducts);
                      estHours += pr.hours;
                    }
                  });

                  const total = p.summary?.totalPrice || (p.rooms || []).reduce((s, r) => s + (calculateRoomPricing(r, proposalSettings.rates, proposalSettings.realProducts).totalCost), 0);
                  const roomCount = p.rooms?.length || 0;

                  return (
                    <tr 
                      key={p.id}
                      onClick={() => handleSelectWorkOrder(p.id, true)}
                      className={`group transition cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/30 hover:bg-blue-950/40 border-l-4 border-l-blue-500' 
                          : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      {/* Work Order # */}
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`${isSelected ? 'text-blue-400 font-black' : 'text-zinc-200'}`}>
                            {getWorkOrderNumber(p.id)}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 block font-normal">
                          {new Date(p.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Client & Address */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white group-hover:text-blue-300 transition truncate max-w-[180px]">
                          {c?.name || 'Customer'}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                          {c?.address || 'No address set'}
                        </div>
                      </td>

                      {/* Scope & Areas */}
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-200 font-sans font-medium truncate max-w-[180px]">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {roomCount} {roomCount === 1 ? 'Area' : 'Areas'} &bull; {p.type || 'Residential'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'Approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                          p.status === 'In Progress' ? 'bg-blue-950 text-blue-400 border border-blue-800/40' :
                          p.status === 'Completed' ? 'bg-purple-950 text-purple-400 border border-purple-800/40' :
                          'bg-neutral-900 text-zinc-400 border border-neutral-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      {/* Hours */}
                      <td className="py-3.5 px-4 text-right text-zinc-300 font-bold whitespace-nowrap">
                        {estHours > 0 ? `${parseFloat(estHours.toFixed(1))} hrs` : '—'}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-400 text-sm">
                          ${Math.round(total).toLocaleString()}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectWorkOrder(p.id, true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'bg-neutral-800 hover:bg-neutral-700 text-zinc-200 hover:text-white border border-neutral-700'
                          }`}
                        >
                          <span>{isSelected ? 'Viewing' : 'Breakdown'}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SELECTED WORK ORDER PRICE BREAKDOWN (STEP 2: DETAILS BELOW) */}
      {/* ------------------------------------------------------------- */}
      <div id="work-order-price-breakdown-details" className="space-y-6 pt-2">
        
        {/* Navigation & Selected Work Order Header */}
        <div className="bg-neutral-900 border-2 border-blue-600/40 rounded-2xl p-5 sm:p-6 shadow-lg shadow-blue-950/20 relative overflow-hidden">
          
          {/* Glow accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar: Return to List + Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-800/80 font-mono text-xs">
            <button
              type="button"
              onClick={handleScrollToTop}
              className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-zinc-300 hover:text-white rounded-xl border border-neutral-750 transition cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <ChevronLeft className="w-4 h-4 rotate-90" />
              <span>↑ Choose Different Work Order</span>
            </button>

            {/* Quick Switcher Controls (< Prev / Next >) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGoPrevious}
                disabled={!hasPrevious}
                className="p-1.5 px-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-zinc-300 rounded-lg border border-neutral-800 transition cursor-pointer flex items-center gap-1 text-xs"
                title="Previous Work Order"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <span className="text-[11px] text-zinc-400">
                {currentProjectIndex + 1} of {filteredProjects.length}
              </span>

              <button
                type="button"
                onClick={handleGoNext}
                disabled={!hasNext}
                className="p-1.5 px-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 text-zinc-300 rounded-lg border border-neutral-800 transition cursor-pointer flex items-center gap-1 text-xs"
                title="Next Work Order"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-mono font-bold shadow-xs">
                  {getWorkOrderNumber(selectedProject.id)}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase ${
                  selectedProject.status === 'Approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                  selectedProject.status === 'In Progress' ? 'bg-blue-950 text-blue-400 border border-blue-800/40' :
                  selectedProject.status === 'Completed' ? 'bg-purple-950 text-purple-400 border border-purple-800/40' :
                  'bg-neutral-800 text-zinc-300'
                }`}>
                  Status: {selectedProject.status}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Created: {new Date(selectedProject.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
                {selectedProject.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zinc-300 font-mono">
                <span>Client: <strong className="text-white">{selectedClient?.name || 'Customer'}</strong></span>
                {selectedClient?.phone && <span>Phone: <strong className="text-white">{selectedClient.phone}</strong></span>}
                {selectedClient?.email && <span>Email: <strong className="text-white">{selectedClient.email}</strong></span>}
                {selectedClient?.address && <span>Job Site: <strong className="text-white">{selectedClient.address}</strong></span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 font-mono">
              {onNavigateToWorkOrder && (
                <button
                  type="button"
                  onClick={() => onNavigateToWorkOrder(selectedProject.id, scopeCategoryFilter !== 'all' ? scopeCategoryFilter : undefined)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open in Work Orders</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenProject(selectedProject)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-neutral-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Project Details</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer border border-neutral-700"
                title="Print Pricing Breakdown Sheet"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. EXECUTIVE FINANCIAL WATERFALL & METRIC CARDS               */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Contract Subtotal & Total */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
              Contract Total (Retail)
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-white">
              ${projectPricingMetrics.grandTotal.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-1">
              <span>Subtotal: ${projectPricingMetrics.subtotal.toLocaleString()}</span>
              <span>HST (13%): ${projectPricingMetrics.tax.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Billable Labor Portion */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
              Labor Value (Billable)
            </span>
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-blue-300">
              ${projectPricingMetrics.laborRetail.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-1">
              <span>{projectPricingMetrics.totalHours} Estimated Hrs</span>
              <span>@ ${projectPricingMetrics.hourlyRate}/hr</span>
            </div>
          </div>
        </div>

        {/* Card 3: Materials & Paint Investment */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
              Materials & Paint
            </span>
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400">
              <Paintbrush className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-purple-300">
              ${projectPricingMetrics.materialsRetail.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-1">
              <span>{projectPricingMetrics.paintShoppingList.reduce((acc, p) => acc + p.gallons, 0).toFixed(1)} Gallons Est.</span>
              <span>Includes Sundries</span>
            </div>
          </div>
        </div>

        {/* Card 4: Company Gross Gain / Profit */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
              Projected Gross Margin
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-display text-emerald-400">
              {projectPricingMetrics.grossMarginPct.toFixed(1)}%
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-1">
              <span>+${projectPricingMetrics.grossProfit.toLocaleString()} Gross Gain</span>
              <span>Net: +${projectPricingMetrics.netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. "WHY IT'S PRICED LIKE THAT" - TRANSPARENT PRICING LOGIC    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <span>Why Is This Work Order Priced Like This?</span>
                <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
                  Formula Breakdown
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every line item is generated from production speeds, multi-coat coverage factors, labor rates, and material costs.
              </p>
            </div>
          </div>

          {/* Logic Pillar Selector Filter */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px] font-mono self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveLogicPillar('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeLogicPillar === 'all' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              All Logic
            </button>
            <button
              onClick={() => setActiveLogicPillar('labor')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeLogicPillar === 'labor' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Labor Speed
            </button>
            <button
              onClick={() => setActiveLogicPillar('materials')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeLogicPillar === 'materials' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Paint Spreading
            </button>
            <button
              onClick={() => setActiveLogicPillar('rates')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${activeLogicPillar === 'rates' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              $113.13/hr Breakdown
            </button>
          </div>
        </div>

        {/* 4 Interactive Logic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          
          {/* Pillar 1: Labor Production Speed */}
          {(activeLogicPillar === 'all' || activeLogicPillar === 'labor') && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>1. Labor Speed Formula</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                Labor hours are calculated based on surface square footage or unit counts divided by professional production speeds:
              </p>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 text-[10px] space-y-1 text-zinc-300">
                <div className="flex justify-between"><span>Walls (2 coats):</span> <span className="font-bold text-blue-300">250 sqft/hr</span></div>
                <div className="flex justify-between"><span>Ceilings (2 coats):</span> <span className="font-bold text-blue-300">225 sqft/hr</span></div>
                <div className="flex justify-between"><span>Baseboards (2 coats):</span> <span className="font-bold text-blue-300">100 lin ft/hr</span></div>
                <div className="flex justify-between"><span>Doors (2 coats):</span> <span className="font-bold text-blue-300">0.88 hrs/unit</span></div>
                <div className="flex justify-between"><span>Windows (2 coats):</span> <span className="font-bold text-blue-300">0.88 hrs/unit</span></div>
              </div>
              <span className="text-[10px] text-zinc-500 block">
                Formula: <code className="text-zinc-300">Hours = Qty ÷ ProductionRate</code>
              </span>
            </div>
          )}

          {/* Pillar 2: Material Spreading Rate */}
          {(activeLogicPillar === 'all' || activeLogicPillar === 'materials') && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Paintbrush className="w-4 h-4" />
                <span>2. Paint Spreading Rate</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                Gallons of paint required are determined by total surface area, number of coats, and manufacturer spreading capacity:
              </p>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 text-[10px] space-y-1 text-zinc-300">
                <div className="flex justify-between"><span>Smooth Walls/Ceilings:</span> <span className="font-bold text-purple-300">350 sqft/gal</span></div>
                <div className="flex justify-between"><span>Textured Ceilings:</span> <span className="font-bold text-purple-300">250 sqft/gal</span></div>
                <div className="flex justify-between"><span>Baseboard Trims:</span> <span className="font-bold text-purple-300">200 lin ft/gal</span></div>
                <div className="flex justify-between"><span>Standard Product Price:</span> <span className="font-bold text-purple-300">$80.00 / gal</span></div>
                <div className="flex justify-between"><span>Premium Product Price:</span> <span className="font-bold text-purple-300">$115.00 / gal</span></div>
              </div>
              <span className="text-[10px] text-zinc-500 block">
                Formula: <code className="text-zinc-300">Gallons = (Area × Coats) ÷ 350</code>
              </span>
            </div>
          )}

          {/* Pillar 3: Retail Labor Rate Justification */}
          {(activeLogicPillar === 'all' || activeLogicPillar === 'rates') && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <DollarSign className="w-4 h-4" />
                <span>3. Rate Structure ($113.13/hr)</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                The standard $113.13/hr billing rate covers direct wages, payroll insurance, company equipment, and operating margins:
              </p>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 text-[10px] space-y-1 text-zinc-300">
                <div className="flex justify-between"><span>Direct Painter Wage:</span> <span className="font-bold text-emerald-300">$39.60/hr (35%)</span></div>
                <div className="flex justify-between"><span>CPP, EI & WSIB/Liability:</span> <span className="font-bold text-zinc-400">$16.97/hr (15%)</span></div>
                <div className="flex justify-between"><span>Vans, Sprayers & Tools:</span> <span className="font-bold text-zinc-400">$11.31/hr (10%)</span></div>
                <div className="flex justify-between"><span>Overhead & Admin:</span> <span className="font-bold text-zinc-400">$11.31/hr (10%)</span></div>
                <div className="flex justify-between"><span>Company Net Margin:</span> <span className="font-bold text-emerald-400">$33.94/hr (30%)</span></div>
              </div>
              <span className="text-[10px] text-zinc-500 block">
                Ensures fully insured & licensed operation.
              </span>
            </div>
          )}

          {/* Pillar 4: Surface Preparation & Drywall Repairs */}
          {(activeLogicPillar === 'all' || activeLogicPillar === 'prep') && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Wrench className="w-4 h-4" />
                <span>4. Preparation & Drywall</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                Surface prep and patching use flat-rate time & material allocations to guarantee seamless substrate adhesion:
              </p>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 text-[10px] space-y-1 text-zinc-300">
                <div className="flex justify-between"><span>Drywall Patch Repair:</span> <span className="font-bold text-amber-300">1.0 hr + $50 mat</span></div>
                <div className="flex justify-between"><span>Crack Repair & Tape:</span> <span className="font-bold text-amber-300">0.5 hr + $25 mat</span></div>
                <div className="flex justify-between"><span>Drywall Skim Coating:</span> <span className="font-bold text-amber-300">80 sqft/hr</span></div>
                <div className="flex justify-between"><span>Caulking & Masking:</span> <span className="font-bold text-amber-300">Included in Prep</span></div>
                <div className="flex justify-between"><span>Stain Sealing / Prime:</span> <span className="font-bold text-amber-300">1.0 hr + $20 mat</span></div>
              </div>
              <span className="text-[10px] text-zinc-500 block">
                Protects floors, furniture & hardware.
              </span>
            </div>
          )}

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. ROOM-BY-ROOM & SURFACE-BY-SURFACE DETAILED BREAKDOWN       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-display text-white">
                Itemized Area Scope & Surface Math
              </h3>
              <span className="px-2 py-0.5 bg-neutral-800 text-zinc-300 rounded text-xs font-mono">
                {activeRooms.length} of {projectPricingMetrics.roomMetricsList.length} Areas
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect the exact dimensions, number of coats, labor hours, and paint allocations for each room.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Scope Category Filter */}
            {projectPricingMetrics.availableScopes.length > 1 && (
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
                <button
                  onClick={() => setScopeCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${scopeCategoryFilter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  All Scopes
                </button>
                {projectPricingMetrics.availableScopes.includes('interior') && (
                  <button
                    onClick={() => setScopeCategoryFilter('interior')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${scopeCategoryFilter === 'interior' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Interior
                  </button>
                )}
                {projectPricingMetrics.availableScopes.includes('exterior') && (
                  <button
                    onClick={() => setScopeCategoryFilter('exterior')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${scopeCategoryFilter === 'exterior' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Exterior
                  </button>
                )}
                {projectPricingMetrics.availableScopes.includes('deck') && (
                  <button
                    onClick={() => setScopeCategoryFilter('deck')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${scopeCategoryFilter === 'deck' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Deck
                  </button>
                )}
              </div>
            )}

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={expandAllRooms}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-zinc-300 rounded-lg transition cursor-pointer"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllRooms}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-zinc-300 rounded-lg transition cursor-pointer"
              >
                Collapse All
              </button>
            </div>

          </div>
        </div>

        {/* Room Accordions List */}
        <div className="space-y-3.5 font-mono">
          {activeRooms.map(({ room, pricing, category }, idx) => {
            const isExpanded = expandedRoomIds.has(room.id);
            const wArea = room.wallsArea || ((room.length || 0) * 2 + (room.width || 0) * 2) * (room.height || 8);
            const cArea = room.ceilingArea || (room.length || 0) * (room.width || 0);
            const perimeter = ((room.length || 0) + (room.width || 0)) * 2;

            return (
              <div 
                key={room.id || idx}
                className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 transition"
              >
                {/* Room Accordion Header */}
                <div 
                  onClick={() => toggleRoomExpand(room.id)}
                  className="p-4 bg-neutral-900/90 hover:bg-neutral-850 flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer select-none transition"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      className="p-1 rounded bg-neutral-800 text-zinc-400 hover:text-white transition mt-0.5 sm:mt-0 shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm">{room.name}</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                          category === 'interior' ? 'bg-blue-950 text-blue-400 border border-blue-800/40' :
                          category === 'exterior' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' :
                          'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        }`}>
                          {category}
                        </span>
                        {room.isOption && (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-purple-950 text-purple-400 border border-purple-800/40">
                            Optional Add-on
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 block sm:inline mt-0.5 sm:mt-0">
                        {room.length}' L × {room.width}' W × {room.height}' H &bull; {wArea} sqft walls &bull; {cArea} sqft ceiling &bull; {perimeter} lin ft trim
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-5 text-xs text-right shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800/60">
                    <div>
                      <span className="text-zinc-400 text-[10px] block uppercase">Est. Labor</span>
                      <span className="font-bold text-blue-300 whitespace-nowrap">{pricing.hours} hrs (${pricing.laborCost.toLocaleString()})</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] block uppercase">Materials</span>
                      <span className="font-bold text-purple-300 whitespace-nowrap">${pricing.materialCost.toLocaleString()}</span>
                    </div>
                    <div className="pl-3 border-l border-neutral-800">
                      <span className="text-zinc-400 text-[10px] block uppercase">Room Total</span>
                      <span className="font-bold text-emerald-400 text-sm whitespace-nowrap">${pricing.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Surface Breakdown Table */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950 space-y-4">
                    
                    <h5 className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">
                      Surface-by-Surface Itemized Calculations
                    </h5>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[620px]">
                        <thead>
                          <tr className="border-b border-neutral-800 text-[10px] text-zinc-500 uppercase tracking-wider bg-neutral-900/60 whitespace-nowrap">
                            <th className="py-2 px-3">Surface</th>
                            <th className="py-2 px-3">Dimensions / Qty</th>
                            <th className="py-2 px-3">Coats</th>
                            <th className="py-2 px-3">Paint Specification</th>
                            <th className="py-2 px-3 text-right">Labor Hrs</th>
                            <th className="py-2 px-3 text-right">Labor Cost</th>
                            <th className="py-2 px-3 text-right">Materials</th>
                            <th className="py-2 px-3 text-right font-bold text-zinc-300">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850">
                          {pricing.surfaceItems.map((item, itemIdx) => {
                            const hourly = selectedProject.summary?.hourlyLaborRate || defaultHourlyRate;
                            const laborDollar = Math.round(item.hours * hourly);
                            const totalLineDollar = laborDollar + item.materialCost;

                            // Formula text explanation
                            let formulaText = '';
                            if (item.key === 'walls') {
                              formulaText = `${wArea} sqft ÷ 250 sqft/hr = ${item.hours} hrs labor @ $${hourly}/hr ($${laborDollar}) | (${wArea} × ${item.coats} ÷ 350) gals paint = $${item.materialCost}`;
                            } else if (item.key === 'ceilings') {
                              formulaText = `${cArea} sqft ÷ 225 sqft/hr = ${item.hours} hrs labor @ $${hourly}/hr ($${laborDollar}) | (${cArea} × ${item.coats} ÷ 350) gals paint = $${item.materialCost}`;
                            } else if (item.key === 'baseboards') {
                              formulaText = `${perimeter} lin ft ÷ 100 lin ft/hr = ${item.hours} hrs labor @ $${hourly}/hr ($${laborDollar}) | Trim paint = $${item.materialCost}`;
                            } else {
                              formulaText = `${item.qtyLabel} (${item.coats} coats) = ${item.hours} hrs labor @ $${hourly}/hr ($${laborDollar}) + $${item.materialCost} paint/supplies`;
                            }

                            return (
                              <tr key={item.key || itemIdx} className="hover:bg-neutral-900/40">
                                <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                                  {item.name}
                                </td>
                                <td className="py-2.5 px-3 text-zinc-300 whitespace-nowrap">
                                  {item.qtyLabel}
                                </td>
                                <td className="py-2.5 px-3 text-zinc-300 whitespace-nowrap">
                                  {item.coats} {item.coats === 1 ? 'coat' : 'coats'}
                                </td>
                                <td className="py-2.5 px-3 text-zinc-300">
                                  {item.product ? (
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                      <span className="truncate max-w-[200px]">{item.product.name} ({item.product.brand})</span>
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400">Standard Contractor Grade</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right text-blue-300 font-bold whitespace-nowrap">
                                  {item.hours} hrs
                                </td>
                                <td className="py-2.5 px-3 text-right text-blue-300 whitespace-nowrap">
                                  ${laborDollar.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right text-purple-300 whitespace-nowrap">
                                  ${item.materialCost.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                                  ${totalLineDollar.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paint Color Specs for Room */}
                    {room.paints && room.paints.length > 0 && (
                      <div className="pt-2 border-t border-neutral-850">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">
                          Specified Paint Products & Colors:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {room.paints.map((p, pIdx) => (
                            <div key={pIdx} className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2.5">
                              <div 
                                className="w-5 h-5 rounded-md border border-neutral-700 shrink-0 shadow-2xs" 
                                style={{ backgroundColor: p.hex || '#EDEBE6' }} 
                              />
                              <div className="truncate">
                                <span className="font-bold text-white block truncate">{p.colorName} ({p.colorCode})</span>
                                <span className="text-[10px] text-zinc-400 block">{p.brand} &bull; {p.finish} on {p.surface}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Surface Tasks for Room */}
                    {room.surfaceTasks && room.surfaceTasks.length > 0 && (
                      <div className="pt-2 border-t border-neutral-850">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">
                          Assigned Surface Prep & Repairs:
                        </span>
                        <div className="space-y-1 text-xs">
                          {room.surfaceTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 text-zinc-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{task.text}</span>
                              <span className="text-[10px] text-zinc-500 ml-auto font-mono">0.5-1.0 hr prep included</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. CONSOLIDATED PAINT & SHOPPING LIST MANIFEST                */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/10 border border-purple-500/30 rounded-lg text-purple-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white">
                Work Order Paint & Materials Shopping List
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Consolidated material requirements, brand specifications, and gallon quantities.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/60 border border-purple-800/40 px-3 py-1 rounded-lg">
            ${projectPricingMetrics.materialsRetail.toLocaleString()} Material Budget
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          
          {/* Paint Specifications */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Paint Products & Finishes</span>
            </h4>
            
            {projectPricingMetrics.paintShoppingList.length > 0 ? (
              <div className="divide-y divide-neutral-850">
                {projectPricingMetrics.paintShoppingList.map((paint, pIdx) => (
                  <div key={pIdx} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-white block">{paint.color}</span>
                      <span className="text-[10px] text-zinc-500">{paint.brand} &bull; {paint.finish} &bull; {paint.surface}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-purple-300 block">{paint.gallons.toFixed(1)} Gal</span>
                      <span className="text-[10px] text-zinc-500">~${Math.round(paint.estimatedCost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-3 text-center">
                Standard premium interior/exterior paint specifications will be assigned upon batch order.
              </p>
            )}
          </div>

          {/* Prep Sundries & Consumables */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-400" />
              <span>Standard Jobsite Sundries & Consumables</span>
            </h4>

            <div className="divide-y divide-neutral-850 text-zinc-300">
              <div className="py-2 flex items-center justify-between">
                <span>1.5" Painter's Blue/Green Masking Tape</span>
                <span className="font-bold text-zinc-400">4-6 Rolls</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span>Heavy Duty Canvas Drop Cloths</span>
                <span className="font-bold text-zinc-400">4 Drops</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span>0.7 Mil Plastic Sheeting (Furniture Wrap)</span>
                <span className="font-bold text-zinc-400">1 Roll (12×400)</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span>Microfiber Roller Covers (3/8" Nap)</span>
                <span className="font-bold text-zinc-400">3-4 Sleeves</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span>Alex Plus Acrylic Latex Caulk & Spackle</span>
                <span className="font-bold text-zinc-400">2 Tubes / 1 Tub</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. BOTTOM NAVIGATION & SHORTCUTS                              */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Work order calculations sync in real-time with customer proposals and change orders.</span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToWorkOrder && (
            <button
              type="button"
              onClick={() => onNavigateToWorkOrder(selectedProject.id)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <FileText className="w-4 h-4" />
              <span>Go to Work Order Document</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenProject(selectedProject)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white font-bold rounded-xl transition cursor-pointer border border-neutral-700"
          >
            <span>Edit in Project Workspace</span>
          </button>
        </div>
      </div>

    </div>
  );
};
