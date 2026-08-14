import React, { useState, useMemo } from 'react';
import { 
  ProjectDetails as ProjectType, 
  ClientLead, 
  ProposalSettings, 
  DEFAULT_PROPOSAL_SETTINGS,
  DEFAULT_REAL_PRODUCTS,
  RoomSpec 
} from '../types';
import { calculateRoomPricing } from '../utils/pricing';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  X, 
  ChevronDown, 
  Target, 
  Paintbrush, 
  Ruler, 
  Boxes,
  Check,
  Building2,
  Percent,
  Clock,
  Printer
} from 'lucide-react';

interface ProjectProfitabilityHubProps {
  projects: ProjectType[];
  clients: ClientLead[];
  onOpenProject: (project: ProjectType) => void;
  onCreateProjectFromEstimate?: (room: RoomSpec, title?: string) => void;
  proposalSettings?: ProposalSettings;
  onOpenMenu?: () => void;
}

export const ProjectProfitabilityHub: React.FC<ProjectProfitabilityHubProps> = ({
  projects,
  clients,
  onOpenProject,
  onCreateProjectFromEstimate,
  proposalSettings = DEFAULT_PROPOSAL_SETTINGS,
}) => {
  // Navigation Tabs: 'profitability' (Financial Gain & Project Linking) vs 'estimator' (Instant Paint Estimator)
  const [activeTab, setActiveTab] = useState<'profitability' | 'estimator'>('profitability');

  // -------------------------------------------------------------
  // 1. LINKED PROJECTS STATE & FILTERING
  // -------------------------------------------------------------
  // By default, link all approved, sent, in progress, and invoiced projects (or all projects)
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>(() => {
    return projects.map(p => p.id);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'In Progress' | 'Sent' | 'Invoiced' | 'Draft'>('All');

  // Modal for detailed price breakdown of a specific project
  const [breakdownModalProject, setBreakdownModalProject] = useState<ProjectType | null>(null);

  // -------------------------------------------------------------
  // 2. FINANCIAL SIMULATION & ADJUSTER CONTROLS
  // -------------------------------------------------------------
  // Default painter direct wage is $39.60/hr (~35% of $113.13 standard retail rate)
  const defaultHourlyRate = proposalSettings?.rates?.hourlyLaborRate || 113.13;
  const [painterWageRate, setPainterWageRate] = useState<number>(() => Math.round(defaultHourlyRate * 0.35 * 10) / 10);
  const [overheadPct, setOverheadPct] = useState<number>(10); // 10% overhead allocation
  const [laborHoursVariancePct, setLaborHoursVariancePct] = useState<number>(0); // e.g. +10% if jobs ran longer
  const [materialsVariancePct, setMaterialsVariancePct] = useState<number>(0); // e.g. +5% if extra paint was used

  // Helper map for client names
  const clientMap = useMemo(() => {
    const map = new Map<string, ClientLead>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Compute calculated metrics for all projects
  const projectMetricsList = useMemo(() => {
    const rates = proposalSettings?.rates;
    const realProducts = proposalSettings?.realProducts || DEFAULT_REAL_PRODUCTS;
    const calculationEngine = proposalSettings?.calculationEngine || rates?.calculationEngine || 'paintnav';

    return projects.map(project => {
      let totalHours = 0;
      let totalMaterials = 0;
      const roomBreakdowns: Array<{
        id: string;
        name: string;
        hours: number;
        materialCost: number;
        totalCost: number;
        isOption?: boolean;
      }> = [];

      (project.rooms || []).forEach(room => {
        const bd = calculateRoomPricing(room, { ...rates, calculationEngine }, realProducts);
        roomBreakdowns.push({
          id: room.id,
          name: room.name,
          hours: bd.hours,
          materialCost: bd.materialCost,
          totalCost: bd.totalCost,
          isOption: room.isOption
        });

        if (!room.isOption) {
          totalHours += bd.hours;
          totalMaterials += bd.materialCost;
        }
      });

      // Apply setup hours if any
      if (totalHours > 0) {
        const setupH = rates?.setupHours ?? 0;
        const setupM = rates?.setupMaterials ?? 0;
        totalHours += setupH;
        totalMaterials += setupM;
      }

      const retailHourlyRate = project.summary?.hourlyLaborRate || defaultHourlyRate;
      const laborRetail = Math.round(totalHours * retailHourlyRate);
      const subtotalBeforeDiscount = laborRetail + Math.round(totalMaterials);
      const discount = project.summary?.discount || 0;
      const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
      const taxRate = project.summary?.taxRate ?? 0.13;
      const tax = subtotal * taxRate;
      const grandTotal = subtotal + tax;
      const deposit = grandTotal * 0.30;
      const balance = grandTotal * 0.70;

      // Direct Cost Calculations (Simulation applied)
      const adjustedLaborHours = totalHours * (1 + laborHoursVariancePct / 100);
      const directLaborCost = Math.round(adjustedLaborHours * painterWageRate);
      const adjustedMaterialCost = Math.round(totalMaterials * (1 + materialsVariancePct / 100));
      const overheadCost = Math.round(subtotal * (overheadPct / 100));

      const totalDirectCost = directLaborCost + adjustedMaterialCost;
      const totalAllCost = totalDirectCost + overheadCost;
      const grossGain = subtotal - totalDirectCost;
      const netGain = subtotal - totalAllCost;
      const grossMarginPct = subtotal > 0 ? (grossGain / subtotal) * 100 : 0;
      const netMarginPct = subtotal > 0 ? (netGain / subtotal) * 100 : 0;

      const client = clientMap.get(project.clientId);

      return {
        project,
        client,
        totalHours: parseFloat(totalHours.toFixed(1)),
        adjustedLaborHours: parseFloat(adjustedLaborHours.toFixed(1)),
        laborRetail,
        materialsRetail: Math.round(totalMaterials),
        subtotalBeforeDiscount,
        discount,
        subtotal,
        tax,
        grandTotal,
        deposit,
        balance,
        directLaborCost,
        directMaterialCost: adjustedMaterialCost,
        overheadCost,
        totalDirectCost,
        totalAllCost,
        grossGain,
        netGain,
        grossMarginPct,
        netMarginPct,
        roomBreakdowns
      };
    });
  }, [
    projects, 
    clientMap, 
    proposalSettings, 
    defaultHourlyRate, 
    painterWageRate, 
    overheadPct, 
    laborHoursVariancePct, 
    materialsVariancePct
  ]);

  // Filter project metrics based on link status, search and status filter
  const linkedProjectMetrics = useMemo(() => {
    return projectMetricsList.filter(pm => linkedProjectIds.includes(pm.project.id));
  }, [projectMetricsList, linkedProjectIds]);

  const displayedProjectMetrics = useMemo(() => {
    return projectMetricsList.filter(pm => {
      const matchesSearch = 
        pm.project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pm.project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pm.client?.name && pm.client.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || pm.project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projectMetricsList, searchQuery, statusFilter]);

  // Aggregate Totals across all linked projects
  const aggregateMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalGrandTotal = 0;
    let totalDirectLaborCost = 0;
    let totalDirectMaterialCost = 0;
    let totalOverheadCost = 0;
    let totalHours = 0;
    let totalDeposit = 0;
    let totalBalance = 0;

    linkedProjectMetrics.forEach(pm => {
      totalRevenue += pm.subtotal;
      totalTax += pm.tax;
      totalGrandTotal += pm.grandTotal;
      totalDirectLaborCost += pm.directLaborCost;
      totalDirectMaterialCost += pm.directMaterialCost;
      totalOverheadCost += pm.overheadCost;
      totalHours += pm.adjustedLaborHours;
      totalDeposit += pm.deposit;
      totalBalance += pm.balance;
    });

    const totalDirectCost = totalDirectLaborCost + totalDirectMaterialCost;
    const totalAllCost = totalDirectCost + totalOverheadCost;
    const totalGrossGain = totalRevenue - totalDirectCost;
    const totalNetGain = totalRevenue - totalAllCost;
    const grossMarginPct = totalRevenue > 0 ? (totalGrossGain / totalRevenue) * 100 : 0;
    const netMarginPct = totalRevenue > 0 ? (totalNetGain / totalRevenue) * 100 : 0;

    return {
      count: linkedProjectMetrics.length,
      totalRevenue,
      totalTax,
      totalGrandTotal,
      totalDirectLaborCost,
      totalDirectMaterialCost,
      totalOverheadCost,
      totalDirectCost,
      totalAllCost,
      totalGrossGain,
      totalNetGain,
      grossMarginPct,
      netMarginPct,
      totalHours: parseFloat(totalHours.toFixed(1)),
      totalDeposit,
      totalBalance
    };
  }, [linkedProjectMetrics]);

  // Toggle single project link
  const toggleProjectLink = (projectId: string) => {
    setLinkedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };

  const linkAllProjects = () => {
    setLinkedProjectIds(projects.map(p => p.id));
  };

  const unlinkAllProjects = () => {
    setLinkedProjectIds([]);
  };

  // -------------------------------------------------------------
  // 3. INSTANT PAINT ESTIMATOR STATE & ENGINE
  // -------------------------------------------------------------
  const [calcLength, setCalcLength] = useState<number>(16);
  const [calcWidth, setCalcWidth] = useState<number>(14);
  const [calcHeight, setCalcHeight] = useState<number>(9);
  const [calcCoats, setCalcCoats] = useState<number>(2);
  const [calcPaintPricePerGal, setCalcPaintPricePerGal] = useState<number>(58);
  const [calcLaborRateSqFt, setCalcLaborRateSqFt] = useState<number>(2.40);
  const [calcIncludeCeilings, setCalcIncludeCeilings] = useState<boolean>(true);
  const [calcIncludeTrim, setCalcIncludeTrim] = useState<boolean>(true);
  const [calcDoorsCount, setCalcDoorsCount] = useState<number>(2);
  const [calcWindowsCount, setCalcWindowsCount] = useState<number>(2);
  const [calcDrywallPatches, setCalcDrywallPatches] = useState<number>(1);
  const [calcRoomName, setCalcRoomName] = useState<string>('Master Bedroom');

  // Estimator Calculations
  const instantMetrics = useMemo(() => {
    const wallPerimeter = 2 * (calcLength + calcWidth);
    const grossWallArea = wallPerimeter * calcHeight;
    // Standard deduction for doors (21 sqft each) and windows (15 sqft each)
    const doorAreaDeduction = calcDoorsCount * 21;
    const windowAreaDeduction = calcWindowsCount * 15;
    const netWallArea = Math.max(0, Math.round(grossWallArea - (doorAreaDeduction * 0.5) - (windowAreaDeduction * 0.5)));
    
    const ceilingArea = Math.round(calcLength * calcWidth);
    const trimLinearFeet = Math.round(wallPerimeter);

    let totalArea = netWallArea;
    if (calcIncludeCeilings) totalArea += ceilingArea;

    // Paint Gallons needed (350 sqft/gal coverage rate per coat)
    const wallGallons = (netWallArea * calcCoats) / 350;
    const ceilingGallons = calcIncludeCeilings ? (ceilingArea * Math.min(2, calcCoats)) / 350 : 0;
    const trimGallons = calcIncludeTrim ? (trimLinearFeet * 0.02) : 0;
    const totalGallonsFloat = wallGallons + ceilingGallons + trimGallons;
    const totalGallonsRounded = Math.max(1, Math.ceil(totalGallonsFloat));

    // Paint Materials Cost
    const paintMaterialCost = Math.round(totalGallonsRounded * calcPaintPricePerGal);
    const drywallSundriesCost = Math.round(calcDrywallPatches * 15 + 25); // $15 per patch + tape/plastic
    const totalMaterialCost = paintMaterialCost + drywallSundriesCost;

    // Labor Calculations
    const wallLabor = netWallArea * calcLaborRateSqFt;
    const ceilingLabor = calcIncludeCeilings ? ceilingArea * (calcLaborRateSqFt * 0.85) : 0;
    const trimLabor = calcIncludeTrim ? trimLinearFeet * 1.50 : 0;
    const doorLabor = calcDoorsCount * 35;
    const windowLabor = calcWindowsCount * 25;
    const drywallLabor = calcDrywallPatches * 45;

    const totalLaborRetail = Math.round(wallLabor + ceilingLabor + trimLabor + doorLabor + windowLabor + drywallLabor);
    const subtotal = totalLaborRetail + totalMaterialCost;
    const tax = Math.round(subtotal * 0.13);
    const grandTotal = subtotal + tax;

    // Estimated Painter Production Hours & Margin Benchmark
    const estimatedHours = parseFloat((totalLaborRetail / (defaultHourlyRate || 113.13)).toFixed(1));
    const directLaborWage = Math.round(estimatedHours * painterWageRate);
    const directCosts = directLaborWage + totalMaterialCost;
    const projectedProfit = Math.max(0, subtotal - directCosts);
    const projectedMarginPct = subtotal > 0 ? (projectedProfit / subtotal) * 100 : 0;

    return {
      grossWallArea,
      netWallArea,
      ceilingArea,
      trimLinearFeet,
      totalArea,
      totalGallons: totalGallonsRounded,
      totalGallonsExact: parseFloat(totalGallonsFloat.toFixed(1)),
      paintMaterialCost,
      drywallSundriesCost,
      totalMaterialCost,
      totalLaborRetail,
      subtotal,
      tax,
      grandTotal,
      estimatedHours,
      directLaborWage,
      directCosts,
      projectedProfit,
      projectedMarginPct
    };
  }, [
    calcLength, 
    calcWidth, 
    calcHeight, 
    calcCoats, 
    calcPaintPricePerGal, 
    calcLaborRateSqFt, 
    calcIncludeCeilings, 
    calcIncludeTrim, 
    calcDoorsCount, 
    calcWindowsCount, 
    calcDrywallPatches,
    defaultHourlyRate,
    painterWageRate
  ]);

  const handleCreateProjectClick = () => {
    if (!onCreateProjectFromEstimate) {
      alert("Project creation callback ready.");
      return;
    }

    const roomPayload: RoomSpec = {
      id: 'room-' + Math.random().toString(36).substr(2, 7),
      name: calcRoomName || 'Estimated Room',
      length: calcLength,
      width: calcWidth,
      height: calcHeight,
      wallsArea: instantMetrics.netWallArea,
      ceilingArea: instantMetrics.ceilingArea,
      paints: [
        {
          brand: 'Sherwin-Williams',
          colorName: 'Pure White',
          colorCode: 'SW 7005',
          hex: '#EDEBE6',
          finish: 'Eggshell',
          surface: 'walls',
          coats: calcCoats,
          gallonsNeeded: instantMetrics.totalGallons
        }
      ],
      walls: { checked: true, qty: 'auto', coats: calcCoats },
      ceilings: { checked: calcIncludeCeilings, qty: 'auto', coats: calcCoats },
      baseboards: { checked: calcIncludeTrim, qty: 'auto', coats: calcCoats },
      doors: { checked: calcDoorsCount > 0, qty: calcDoorsCount, coats: calcCoats },
      windows: { checked: calcWindowsCount > 0, qty: calcWindowsCount, coats: calcCoats },
      doorFrames: { checked: calcDoorsCount > 0, qty: calcDoorsCount, coats: calcCoats },
      notes: `Generated via Instant Estimator. ${calcDrywallPatches > 0 ? `Includes ${calcDrywallPatches} drywall patch repairs.` : ''}`
    };

    onCreateProjectFromEstimate(roomPayload, `Project - ${calcRoomName}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-left pb-16">
      
      {/* Top Header & Tab Navigation */}
      <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-400">
                <Calculator className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                Financial Gain & Estimator Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
              Link active CRM projects to view real-time gains, losses, total revenue, and complete price breakdowns, or use the instant paint estimator.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 self-start lg:self-auto shrink-0 shadow-inner">
            <button
              onClick={() => setActiveTab('profitability')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'profitability'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Project Gains & Linker ({linkedProjectIds.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('estimator')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'estimator'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              <span>Instant Paint Estimator</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PROJECT GAINS & FINANCIAL LINKER                   */}
      {/* ========================================================= */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">

          {/* Top Aggregate Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue */}
            <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
                  Total Revenue
                </span>
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-display text-white">
                  ${aggregateMetrics.totalRevenue.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-1">
                  <span>{aggregateMetrics.count} Linked Projects</span>
                  <span className="text-zinc-400">Gross: ${aggregateMetrics.totalGrandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Direct Labor Cost */}
            <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
                  Direct Labor (Payroll)
                </span>
                <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-display text-blue-300">
                  ${aggregateMetrics.totalDirectLaborCost.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-1">
                  <span>{aggregateMetrics.totalHours} Estimated Hrs</span>
                  <span className="text-zinc-400">@ ${painterWageRate}/hr</span>
                </div>
              </div>
            </div>

            {/* Direct Materials Cost */}
            <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
                  Paint & Materials
                </span>
                <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-display text-purple-300">
                  ${aggregateMetrics.totalDirectMaterialCost.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-1">
                  <span>
                    {aggregateMetrics.totalRevenue > 0 
                      ? ((aggregateMetrics.totalDirectMaterialCost / aggregateMetrics.totalRevenue) * 100).toFixed(1) 
                      : '0.0'}% of Revenue
                  </span>
                  <span className="text-zinc-400">Paint & Sundries</span>
                </div>
              </div>
            </div>

            {/* Net Gain / Profit */}
            <div className="bg-neutral-900 border border-emerald-900/40 rounded-2xl p-5 relative overflow-hidden group bg-gradient-to-br from-neutral-900 to-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Net Gain / Profit
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  aggregateMetrics.grossMarginPct >= 45 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {aggregateMetrics.grossMarginPct.toFixed(1)}% Margin
                </span>
              </div>
              <div className="mt-3">
                <div className={`text-2xl sm:text-3xl font-black font-display ${
                  aggregateMetrics.totalGrossGain >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  ${aggregateMetrics.totalGrossGain.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-1">
                  <span>Net Profit (after OH):</span>
                  <span className="text-zinc-200 font-bold">${aggregateMetrics.totalNetGain.toLocaleString()} ({aggregateMetrics.netMarginPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Financial Adjuster / Scenario Simulator */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Profitability Parameters & Cost Simulator
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Adjust painter wage rates and overhead assumptions to instantly calculate your true net gains.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPainterWageRate(Math.round(defaultHourlyRate * 0.35 * 10) / 10);
                  setOverheadPct(10);
                  setLaborHoursVariancePct(0);
                  setMaterialsVariancePct(0);
                }}
                className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-zinc-400 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1.5 self-start font-mono"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Painter Wage Rate */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                  Painter Direct Wage ($/hr)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-500 font-mono">$</span>
                  <input
                    type="number"
                    step="0.50"
                    value={painterWageRate}
                    onChange={(e) => setPainterWageRate(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  {((painterWageRate / (defaultHourlyRate || 1)) * 100).toFixed(1)}% of billable rate (${defaultHourlyRate}/hr)
                </span>
              </div>

              {/* Overhead Allocation */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                  Overhead & Insurance (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-sm font-bold text-zinc-500 font-mono">%</span>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  ${aggregateMetrics.totalOverheadCost.toLocaleString()} allocated across linked jobs
                </span>
              </div>

              {/* Labor Hours Variance (Job Overrun) */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                  Labor Hours Variance (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="5"
                    value={laborHoursVariancePct}
                    onChange={(e) => setLaborHoursVariancePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-sm font-bold text-zinc-500 font-mono">%</span>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  {laborHoursVariancePct > 0 ? `+${laborHoursVariancePct}% jobsite overrun` : 'On target estimate'}
                </span>
              </div>

              {/* Paint & Material Variance */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                  Material Spend Variance (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="5"
                    value={materialsVariancePct}
                    onChange={(e) => setMaterialsVariancePct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-sm font-bold text-zinc-500 font-mono">%</span>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  {materialsVariancePct > 0 ? `+${materialsVariancePct}% extra paint/supplies` : 'Standard paint usage'}
                </span>
              </div>

            </div>
          </div>

          {/* Project Linker Bar & Search */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search & Status Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by project title, #ID, or client name..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Sent">Sent</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Link All / Clear Controls */}
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                <span className="text-xs text-zinc-400 font-mono mr-1">
                  {linkedProjectIds.length} of {projects.length} linked
                </span>
                <button
                  type="button"
                  onClick={linkAllProjects}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition cursor-pointer font-mono"
                >
                  Link All
                </button>
                <button
                  type="button"
                  onClick={unlinkAllProjects}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-bold text-zinc-400 hover:text-white rounded-lg transition cursor-pointer font-mono"
                >
                  Unlink All
                </button>
              </div>

            </div>

            {/* Linked Projects Performance Table */}
            <div className="overflow-x-auto border border-neutral-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 border-b border-neutral-800 text-zinc-400 font-mono text-[10px] uppercase">
                    <th className="py-3 px-3.5 w-10 text-center">Link</th>
                    <th className="py-3 px-3">Project / Client</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                    <th className="py-3 px-3 text-right">Direct Labor</th>
                    <th className="py-3 px-3 text-right">Materials</th>
                    <th className="py-3 px-3 text-right">Net Gain</th>
                    <th className="py-3 px-3 text-center">Margin</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {displayedProjectMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 text-xs font-mono">
                        No projects found matching your search.
                      </td>
                    </tr>
                  ) : (
                    displayedProjectMetrics.map(pm => {
                      const isLinked = linkedProjectIds.includes(pm.project.id);
                      const isHighMargin = pm.grossMarginPct >= 45;
                      const isLowMargin = pm.grossMarginPct < 25;

                      return (
                        <tr 
                          key={pm.project.id}
                          className={`hover:bg-neutral-850/50 transition ${
                            isLinked ? 'bg-neutral-900/40' : 'opacity-60 bg-neutral-950/40'
                          }`}
                        >
                          {/* Checkbox Link Toggle */}
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleProjectLink(pm.project.id)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition cursor-pointer ${
                                isLinked 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-neutral-950 border border-neutral-700 text-transparent hover:border-zinc-500'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          {/* Project Details */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span className="font-mono text-zinc-400 font-normal text-[10px]">#{pm.project.id}</span>
                              <span className="truncate max-w-[180px] sm:max-w-[240px]">{pm.project.title}</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-zinc-500" />
                              <span>{pm.client?.name || 'Unassigned Client'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              pm.project.status === 'Approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' :
                              pm.project.status === 'In Progress' ? 'bg-blue-950 text-blue-300 border border-blue-800/60' :
                              pm.project.status === 'Invoiced' ? 'bg-purple-950 text-purple-300 border border-purple-800/60' :
                              pm.project.status === 'Sent' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {pm.project.status}
                            </span>
                          </td>

                          {/* Revenue */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-white">
                            ${pm.subtotal.toLocaleString()}
                          </td>

                          {/* Direct Labor */}
                          <td className="py-3 px-3 text-right font-mono text-blue-300">
                            ${pm.directLaborCost.toLocaleString()}
                            <span className="text-[10px] text-zinc-500 block">{pm.adjustedLaborHours} hrs</span>
                          </td>

                          {/* Materials */}
                          <td className="py-3 px-3 text-right font-mono text-purple-300">
                            ${pm.directMaterialCost.toLocaleString()}
                          </td>

                          {/* Net Gain */}
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <span className={pm.grossGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              ${pm.grossGain.toLocaleString()}
                            </span>
                          </td>

                          {/* Margin Badge */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isHighMargin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              isLowMargin ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            }`}>
                              {pm.grossMarginPct.toFixed(1)}%
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setBreakdownModalProject(pm.project)}
                                className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-zinc-300 hover:text-white rounded-md transition cursor-pointer flex items-center gap-1 font-mono"
                                title="View detailed price and cost breakdown"
                              >
                                <FileText className="w-3 h-3 text-blue-400" />
                                <span>Breakdown</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenProject(pm.project)}
                                className="p-1 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-md transition cursor-pointer"
                                title="Open in Project Workspace"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* ========================================================= */}
      {/* TAB 2: INSTANT PAINT & DRYWALL ESTIMATOR                  */}
      {/* ========================================================= */}
      {activeTab === 'estimator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Input Specs Panel (Left - 7 cols) */}
            <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-blue-400" />
                  <h3 className="font-display font-bold text-white text-sm">Room Physical Dimensions & Surfaces</h3>
                </div>
                <div className="w-48">
                  <input
                    type="text"
                    value={calcRoomName}
                    onChange={(e) => setCalcRoomName(e.target.value)}
                    placeholder="Room Name"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dimensions Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Length (ft)</label>
                  <input
                    type="number"
                    value={calcLength}
                    onChange={(e) => setCalcLength(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Width (ft)</label>
                  <input
                    type="number"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Height (ft)</label>
                  <input
                    type="number"
                    value={calcHeight}
                    onChange={(e) => setCalcHeight(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Surface Toggles & Features */}
              <div className="space-y-3 pt-1 border-t border-neutral-800">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                  Surfaces & Scope Items
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase font-mono block">Coats</label>
                    <select
                      value={calcCoats}
                      onChange={(e) => setCalcCoats(parseInt(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value={1}>1 Coat (Touch-up)</option>
                      <option value={2}>2 Coats (Standard)</option>
                      <option value={3}>3 Coats (Color Change)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase font-mono block">Doors (qty)</label>
                    <input
                      type="number"
                      min="0"
                      value={calcDoorsCount}
                      onChange={(e) => setCalcDoorsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase font-mono block">Windows (qty)</label>
                    <input
                      type="number"
                      min="0"
                      value={calcWindowsCount}
                      onChange={(e) => setCalcWindowsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-850 cursor-pointer hover:bg-neutral-850/50 transition">
                    <input
                      type="checkbox"
                      checked={calcIncludeCeilings}
                      onChange={(e) => setCalcIncludeCeilings(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Include Ceiling</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{instantMetrics.ceilingArea} sqft flat</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-850 cursor-pointer hover:bg-neutral-850/50 transition">
                    <input
                      type="checkbox"
                      checked={calcIncludeTrim}
                      onChange={(e) => setCalcIncludeTrim(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Include Baseboards / Trim</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{instantMetrics.trimLinearFeet} linear ft</span>
                    </div>
                  </label>
                </div>

                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Drywall Patch & Hole Repairs</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Small to medium compound patches & prep</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={calcDrywallPatches}
                      onChange={(e) => setCalcDrywallPatches(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-center"
                    />
                    <span className="text-xs text-zinc-400 font-mono">patches</span>
                  </div>
                </div>

              </div>

              {/* Pricing Rates */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Labor Rate ($/SqFt)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={calcLaborRateSqFt}
                    onChange={(e) => setCalcLaborRateSqFt(Math.max(0.5, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Paint Price ($/Gal)</label>
                  <input
                    type="number"
                    step="1"
                    value={calcPaintPricePerGal}
                    onChange={(e) => setCalcPaintPricePerGal(Math.max(10, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

            </div>

            {/* Real-Time Calculation & Profit Card (Right - 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Estimate & Resource Breakdown
                  </h3>
                  <span className="text-[10px] bg-blue-950 text-blue-300 font-mono font-bold px-2 py-0.5 rounded-full">
                    {instantMetrics.totalArea} Total SqFt
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                    <span className="text-zinc-400 block text-[10px] uppercase font-mono">Net Walls Area</span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5 block">{instantMetrics.netWallArea} sqft</span>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                    <span className="text-zinc-400 block text-[10px] uppercase font-mono">Ceiling Area</span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5 block">{calcIncludeCeilings ? `${instantMetrics.ceilingArea} sqft` : 'Excluded'}</span>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                    <span className="text-zinc-400 block text-[10px] uppercase font-mono">Paint Required</span>
                    <span className="text-sm font-bold text-blue-400 font-mono mt-0.5 block">{instantMetrics.totalGallons} Gallons</span>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-850">
                    <span className="text-zinc-400 block text-[10px] uppercase font-mono">Production Time</span>
                    <span className="text-sm font-bold text-purple-400 font-mono mt-0.5 block">~{instantMetrics.estimatedHours} Hours</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Retail Labor:</span>
                    <span className="text-zinc-200 font-bold">${instantMetrics.totalLaborRetail.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Paint & Consumables:</span>
                    <span className="text-zinc-200 font-bold">${instantMetrics.totalMaterialCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 border-t border-neutral-800 pt-1.5">
                    <span>Subtotal:</span>
                    <span className="text-white font-bold">${instantMetrics.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>HST / Tax (13%):</span>
                    <span className="text-zinc-300 font-bold">${instantMetrics.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 text-sm font-bold pt-1 border-t border-neutral-800">
                    <span>Quote Total:</span>
                    <span className="text-base">${instantMetrics.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Estimated Gain on this Room */}
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 uppercase font-mono text-[10px]">
                      Projected Gain on this Room
                    </span>
                    <span className="font-mono font-bold text-emerald-300 text-xs">
                      {instantMetrics.projectedMarginPct.toFixed(1)}% Gross Margin
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Direct Cost: ${instantMetrics.directCosts.toLocaleString()}</span>
                    <span className="text-lg font-black font-display text-emerald-400">
                      +${instantMetrics.projectedProfit.toLocaleString()} Net Gain
                    </span>
                  </div>
                </div>

                {/* Action: Convert to Project */}
                <button
                  type="button"
                  onClick={handleCreateProjectClick}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project from this Estimate</span>
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. COMPLETE PRICE BREAKDOWN MODAL                         */}
      {/* ========================================================= */}
      {breakdownModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-400 text-xs">#{breakdownModalProject.id}</span>
                  <h3 className="font-display font-bold text-white text-base">
                    {breakdownModalProject.title}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Complete price, labor, materials, and profit waterfall breakdown.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBreakdownModalProject(null)}
                className="p-1.5 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room by Room Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase font-mono">Room by Room Scope</h4>
              <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-850">
                {(breakdownModalProject.rooms || []).map((room, idx) => {
                  const bd = calculateRoomPricing(room, proposalSettings?.rates, proposalSettings?.realProducts);
                  return (
                    <div key={room.id || idx} className="p-3.5 bg-neutral-950 flex items-center justify-between gap-4 text-xs font-mono">
                      <div>
                        <span className="font-bold text-white block">{room.name}</span>
                        <span className="text-[10px] text-zinc-500">
                          {room.length}' × {room.width}' × {room.height}' ({room.wallsArea || 0} sqft walls)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-zinc-200 block">${bd.totalCost.toLocaleString()}</span>
                        <span className="text-[10px] text-zinc-500">{bd.hours} hrs labor | ${bd.materialCost} materials</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Waterfall Card */}
            {(() => {
              const pm = projectMetricsList.find(m => m.project.id === breakdownModalProject.id);
              if (!pm) return null;

              return (
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Retail Labor Billable:</span>
                    <span className="text-zinc-200 font-bold">${pm.laborRetail.toLocaleString()} ({pm.totalHours} hrs)</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Materials & Paint Retail:</span>
                    <span className="text-zinc-200 font-bold">${pm.materialsRetail.toLocaleString()}</span>
                  </div>
                  {pm.discount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Applied Discount:</span>
                      <span className="font-bold">-${pm.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-300 font-bold border-t border-neutral-800 pt-1.5">
                    <span>Contract Subtotal:</span>
                    <span className="text-white">${pm.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>HST / Tax (13%):</span>
                    <span>${pm.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold border-t border-neutral-800 pt-1">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400 font-display text-sm">${pm.grandTotal.toLocaleString()}</span>
                  </div>

                  {/* Direct Costs & Gains Breakdown */}
                  <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1.5">
                    <div className="flex justify-between text-blue-400">
                      <span>Direct Payroll (Wages @ ${painterWageRate}/hr):</span>
                      <span>-${pm.directLaborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-purple-400">
                      <span>Direct Material Cost:</span>
                      <span>-${pm.directMaterialCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1 border-t border-neutral-800">
                      <span>Net Gain / Gross Profit:</span>
                      <span>+${pm.grossGain.toLocaleString()} ({pm.grossMarginPct.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBreakdownModalProject(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-xs font-bold text-zinc-300 rounded-xl transition cursor-pointer font-mono"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = breakdownModalProject;
                  setBreakdownModalProject(null);
                  onOpenProject(target);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Project Workspace</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
