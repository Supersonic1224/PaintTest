import React, { useState, useMemo, useEffect } from 'react';
import { ProjectDetails, ClientLead, RoomSpec, SurfaceTask, ProjectTask } from '../types';
import { generateWorkOrderPDF } from '../pdfGenerator';
import { getUniqueRoomName } from '../utils/roomUtils';
import { 
  Wrench, 
  CheckCircle, 
  ClipboardList, 
  X, 
  Printer, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  DollarSign, 
  FileText,
  Layers,
  Check,
  ShieldCheck,
  Edit3,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Calculator,
  Download,
  ShoppingCart,
  Grid,
  Info,
  Building,
  UserCheck,
  Lock,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface PainterShoppingItem {
  key: string;
  brand: string;
  paintName: string;
  colorName: string;
  colorCode: string;
  sheen: string;
  surface: string;
  assignedRooms: { name: string; sqft: number; coats: number }[];
  totalSqFt: number;
  totalCoats: number;
  gallonsExact: number;
  gallonsToBuy: number;
  unitPrice: number;
  estMaterialBudget: number;
  estLaborHours: number;
}

export interface SiteProtocolItem {
  id: string;
  text: string;
  completed: boolean;
}

function computeShoppingListForRooms(rooms: RoomSpec[]): PainterShoppingItem[] {
  const map = new Map<string, PainterShoppingItem>();

  rooms.forEach(r => {
    if (r.isOption) return;
    const l = Number(r.length) || 0;
    const w = Number(r.width) || 0;
    const h = Number(r.height) || 8;
    const wallSqFt = r.wallsArea || (2 * h * (l + w));
    const ceilingSqFt = r.ceilingArea || (l * w);
    const trimLnft = 2 * (l + w);

    // 1. Wall Paint
    if (r.walls?.checked !== false && wallSqFt > 0) {
      const paintSpec = r.wallPaintType || 'Benjamin Moore Regal Select Eggshell';
      const wallCoats = r.walls?.coats || 2;
      const explicitPaint = r.paints?.find(p => p.surface === 'walls' || !p.surface);
      const colorName = explicitPaint?.colorName || 'Selected Color';
      const colorCode = explicitPaint?.colorCode || 'SW/BM';
      const brand = explicitPaint?.brand || (paintSpec.includes('Sherwin') ? 'Sherwin-Williams' : 'Benjamin Moore');
      const sheen = explicitPaint?.finish || 'Eggshell';
      const key = `${brand}::${paintSpec}::${colorName}::${colorCode}::${sheen}`;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          brand,
          paintName: paintSpec,
          colorName,
          colorCode,
          sheen,
          surface: 'Walls',
          assignedRooms: [],
          totalSqFt: 0,
          totalCoats: wallCoats,
          gallonsExact: 0,
          gallonsToBuy: 0,
          unitPrice: 68,
          estMaterialBudget: 0,
          estLaborHours: 0
        };
        map.set(key, entry);
      }
      entry.assignedRooms.push({ name: r.name, sqft: wallSqFt, coats: wallCoats });
      entry.totalSqFt += wallSqFt;
    }

    // 2. Ceiling Paint
    if (r.ceilings?.checked && ceilingSqFt > 0) {
      const explicitPaint = r.paints?.find(p => p.surface === 'ceiling');
      const paintSpec = 'Benjamin Moore Waterborne Ceiling Paint Flat';
      const ceilCoats = r.ceilings?.coats || 2;
      const colorName = explicitPaint?.colorName || 'Chantilly Lace';
      const colorCode = explicitPaint?.colorCode || 'OC-65';
      const brand = explicitPaint?.brand || 'Benjamin Moore';
      const sheen = 'Flat';
      const key = `${brand}::${paintSpec}::${colorName}::${colorCode}::${sheen}`;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          brand,
          paintName: paintSpec,
          colorName,
          colorCode,
          sheen,
          surface: 'Ceilings',
          assignedRooms: [],
          totalSqFt: 0,
          totalCoats: ceilCoats,
          gallonsExact: 0,
          gallonsToBuy: 0,
          unitPrice: 68,
          estMaterialBudget: 0,
          estLaborHours: 0
        };
        map.set(key, entry);
      }
      entry.assignedRooms.push({ name: r.name, sqft: ceilingSqFt, coats: ceilCoats });
      entry.totalSqFt += ceilingSqFt;
    }

    // 3. Trim / Baseboards
    if (r.baseboards?.checked && trimLnft > 0) {
      const explicitPaint = r.paints?.find(p => p.surface === 'trim');
      const paintSpec = 'Benjamin Moore ADVANCE Satin/Semi-Gloss';
      const trimCoats = r.baseboards?.coats || 2;
      const colorName = explicitPaint?.colorName || 'Simply White';
      const colorCode = explicitPaint?.colorCode || 'OC-117';
      const brand = explicitPaint?.brand || 'Benjamin Moore';
      const sheen = 'Semi-Gloss';
      const trimSqFt = trimLnft * 0.5;
      const key = `${brand}::${paintSpec}::${colorName}::${colorCode}::${sheen}`;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          brand,
          paintName: paintSpec,
          colorName,
          colorCode,
          sheen,
          surface: 'Trim & Baseboards',
          assignedRooms: [],
          totalSqFt: 0,
          totalCoats: trimCoats,
          gallonsExact: 0,
          gallonsToBuy: 0,
          unitPrice: 68,
          estMaterialBudget: 0,
          estLaborHours: 0
        };
        map.set(key, entry);
      }
      entry.assignedRooms.push({ name: r.name, sqft: Math.round(trimSqFt), coats: trimCoats });
      entry.totalSqFt += trimSqFt;
    }
  });

  const results = Array.from(map.values());
  results.forEach(item => {
    item.gallonsExact = Math.round(((item.totalSqFt * item.totalCoats) / 350) * 100) / 100;
    item.gallonsToBuy = Math.max(1, Math.ceil(item.gallonsExact));
    item.unitPrice = 68;
    item.estMaterialBudget = Math.round(item.gallonsToBuy * item.unitPrice);
    item.estLaborHours = Math.round((item.totalSqFt / 140) * 10) / 10;
  });

  return results;
}

interface WorkOrdersListProps {
  projects: ProjectDetails[];
  clients: ClientLead[];
  onSaveProject?: (project: ProjectDetails) => void;
  onSelectProjectForFullEdit?: (projectId: string) => void;
}

export default function WorkOrdersList({
  projects,
  clients,
  onSaveProject,
}: WorkOrdersListProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'interior' | 'exterior' | 'deck'>('interior');
  const [showCalculationRundown, setShowCalculationRundown] = useState<boolean>(true);
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // VIEW MODE: 'matrix' (table grid) vs 'paintScoutNotes' (PaintScout "write it yourself" freeform notes mode)
  const [workOrderViewMode, setWorkOrderViewMode] = useState<'matrix' | 'paintScoutNotes'>('matrix');

  // EDITABLE DOCUMENT STATE OVERRIDES
  const [editableShoppingList, setEditableShoppingList] = useState<PainterShoppingItem[]>([]);
  const [showMobileOptions, setShowMobileOptions] = useState<boolean>(false);
  const [supervisorName, setSupervisorName] = useState<string>('Daniel Rust, Operations Owner');
  const [supervisorPhone, setSupervisorPhone] = useState<string>('(226) 499-0079');
  const [supervisorEmail, setSupervisorEmail] = useState<string>('daniel@capstonepainting.ca');

  const [companyName, setCompanyName] = useState<string>('Capstone Painting Inc.');
  const [companyAddress, setCompanyAddress] = useState<string>('124 Commercial Street, Suite 200, Guelph, ON, N1C 0A2');
  const [companyTaxInfo, setCompanyTaxInfo] = useState<string>('GST/HST: 79421 8295 RT0001');

  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');

  const [projectDescription, setProjectDescription] = useState<string>('');
  const [projectInclusions, setProjectInclusions] = useState<string>('');
  const [projectExclusions, setProjectExclusions] = useState<string>('');
  const [specialConditions, setSpecialConditions] = useState<string>('');
  const [teamNotes, setTeamNotes] = useState<string>('');

  const [laborRatePerHour, setLaborRatePerHour] = useState<number>(65);
  const [sundriesPerRoom, setSundriesPerRoom] = useState<number>(12);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(13);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const [siteProtocols, setSiteProtocols] = useState<SiteProtocolItem[]>([
    { id: 'proto-1', text: 'Cover all floor surfaces and furniture with heavy-duty drop cloths and 3 mil poly sheeting.', completed: true },
    { id: 'proto-2', text: 'Mask all trim, door casings, window frames, and light switch plates using Scotch Blue tape.', completed: true },
    { id: 'proto-3', text: 'Clean brushes, rollers, and paint trays daily in designated garage or utility sink area.', completed: true },
    { id: 'proto-4', text: 'Keep client pets safely inside specified rooms and ensure property entrance doors remain closed.', completed: true }
  ]);

  const activeWorkJobs = useMemo(() => {
    return projects.filter(p => p.status === 'Approved' || p.status === 'Completed' || p.status === 'In Progress' || p.status === 'Sent' || p.status === 'Draft');
  }, [projects]);

  const selectedClient = useMemo(() => {
    if (!selectedProject) return null;
    return clients.find(c => c.id === selectedProject.clientId);
  }, [selectedProject, clients]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Available scope categories in selected project
  const availableScopeCategories = useMemo(() => {
    if (!selectedProject?.rooms || selectedProject.rooms.length === 0) return ['interior'] as ('interior' | 'exterior' | 'deck')[];
    const set = new Set<'interior' | 'exterior' | 'deck'>();
    selectedProject.rooms.forEach(r => {
      const cat = (r.category || 'interior') as 'interior' | 'exterior' | 'deck';
      set.add(cat);
    });
    const list = Array.from(set);
    return list.length > 0 ? list : (['interior'] as ('interior' | 'exterior' | 'deck')[]);
  }, [selectedProject]);

  // Sync selected scope filter with available categories
  useEffect(() => {
    if (selectedProject && availableScopeCategories.length > 0) {
      if (!availableScopeCategories.includes(selectedScopeFilter)) {
        setSelectedScopeFilter(availableScopeCategories[0]);
      }
    }
  }, [selectedProject, availableScopeCategories]);

  // Initialize editable states whenever selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      const client = clients.find(c => c.id === selectedProject.clientId);
      setClientName(client?.name || selectedProject.title || 'Valued Client');
      setClientPhone(client?.phone || '(555) 000-0000');
      setClientEmail(client?.email || 'client@example.com');
      setClientAddress(client?.address || '123 Main Street, Guelph, ON');
      setDiscountAmount(selectedProject.summary?.discount || 0);
      setTaxRatePercent((selectedProject.summary?.taxRate ?? 0.13) * 100);

      // Seed contract notes, inclusions, exclusions, and descriptions
      setProjectDescription(selectedProject.description || 'Full surface prep, patching, and two full coats of premium paint specification.');
      setProjectInclusions(selectedProject.inclusions || 'Includes 2 coats wall paint, baseboard trim masking, floor drop cloth covering, nail hole patching, and daily cleanup.');
      setProjectExclusions(selectedProject.exclusions || 'Excludes major drywall sheet replacement, structural framing, exterior window staining, and unlisted basement spaces.');
      setSpecialConditions(selectedProject.specialConditions || 'Lockbox Code #4821 at side door entrance. Keep client pets inside master bedroom.');
      setTeamNotes(selectedProject.teamNotes || 'Clean brushes and paint trays daily in garage sink only. Ensure floor drop cloths are taped at baseboard edges.');

      // Seed initial shopping list from rooms
      const scopeRooms = (selectedProject.rooms || []).filter(r => (r.category || 'interior') === (selectedScopeFilter || 'interior'));
      setEditableShoppingList(computeShoppingListForRooms(scopeRooms));
    }
  }, [selectedProject, selectedScopeFilter, clients]);

  // Active rooms filtered by current scope category
  const activeRoomsForScope = useMemo(() => {
    if (!selectedProject) return [];
    const rooms = selectedProject.rooms || [];
    return rooms.filter(r => (r.category || 'interior') === selectedScopeFilter);
  }, [selectedProject, selectedScopeFilter]);

  // Calculate detailed metrics, hours, shopping list totals, and area totals
  const projectMetrics = useMemo(() => {
    if (!selectedProject) return { 
      laborCost: 0, 
      materialCost: 0, 
      totalHours: 0, 
      subtotal: 0, 
      hst: 0, 
      totalCost: 0, 
      wallArea: 0,
      ceilingArea: 0,
      floorArea: 0,
      trimLnft: 0,
      sumPaintMaterial: 0,
      sundriesBudget: 0
    };

    const rooms = activeRoomsForScope;
    let wallArea = 0;
    let ceilingArea = 0;
    let floorArea = 0;
    let trimLnft = 0;
    let totalItemsQty = 0;

    rooms.forEach(r => {
      const l = Number(r.length) || 0;
      const w = Number(r.width) || 0;
      const h = Number(r.height) || 8;

      const roomWall = r.wallsArea || (2 * h * (l + w));
      const roomCeil = r.ceilingArea || (l * w);
      const roomFloor = (l * w);
      const roomTrim = (2 * (l + w));

      if (!r.isOption) {
        if (r.walls?.checked !== false) wallArea += roomWall;
        if (r.ceilings?.checked) ceilingArea += roomCeil;
        if (r.category === 'deck') floorArea += roomFloor;
        if (r.baseboards?.checked) trimLnft += roomTrim;

        if (r.windows?.checked) totalItemsQty += (typeof r.windows.qty === 'number' ? r.windows.qty : 2);
        if (r.doors?.checked) totalItemsQty += (typeof r.doors.qty === 'number' ? r.doors.qty : 2);
      }
    });

    const totalSqFt = wallArea + ceilingArea;
    
    // Sum Paint Materials from the EDITABLE shopping list!
    const sumPaintMaterial = editableShoppingList.reduce((acc, item) => acc + (Number(item.estMaterialBudget) || (Number(item.gallonsToBuy) * Number(item.unitPrice || 68))), 0);
    const sundriesBudget = rooms.length * sundriesPerRoom;
    const materialCost = Math.max(50, sumPaintMaterial + sundriesBudget);

    // Use labor cost from proposal summary if defined, ensuring 1:1 parity between Estimate and Work Order!
    const summaryLabor = selectedProject.summary?.laborCost;
    const baseLabor = Math.round((totalSqFt * 1.85) + (totalItemsQty * 45));
    const laborCost = (summaryLabor && summaryLabor > 0) ? summaryLabor : Math.max(150, baseLabor);
    const totalHours = Math.max(0.5, Math.round((laborCost / (laborRatePerHour || 85)) * 10) / 10);
    const subtotal = Math.max(0, laborCost + materialCost - discountAmount);
    const hst = Math.round(subtotal * (taxRatePercent / 100) * 100) / 100;
    const totalCost = Math.round(subtotal + hst);

    return {
      laborCost,
      materialCost,
      totalHours,
      subtotal,
      hst,
      totalCost,
      wallArea,
      ceilingArea,
      floorArea,
      trimLnft,
      sumPaintMaterial,
      sundriesBudget
    };
  }, [selectedProject, activeRoomsForScope, editableShoppingList, laborRatePerHour, sundriesPerRoom, taxRatePercent, discountAmount]);

  // IN-PLACE SHOPPING LIST EDITING HANDLERS
  const handleUpdateShoppingItem = (index: number, updates: Partial<PainterShoppingItem>) => {
    const list = [...editableShoppingList];
    const target = list[index];
    if (!target) return;

    const updated = { ...target, ...updates };
    const galToBuy = Number(updated.gallonsToBuy) || 1;
    const unitP = Number(updated.unitPrice) || 68;
    updated.estMaterialBudget = Math.round(galToBuy * unitP);

    list[index] = updated;
    setEditableShoppingList(list);
  };

  const handleAddShoppingItem = () => {
    const newItem: PainterShoppingItem = {
      key: 'custom-paint-' + Date.now(),
      brand: 'Benjamin Moore',
      paintName: 'Regal Select Premium Interior',
      colorName: 'Custom Paint Color',
      colorCode: 'BM-101',
      sheen: 'Eggshell',
      surface: 'Walls',
      assignedRooms: [{ name: 'Custom Specified Area', sqft: 350, coats: 2 }],
      totalSqFt: 350,
      totalCoats: 2,
      gallonsExact: 1,
      gallonsToBuy: 1,
      unitPrice: 68,
      estMaterialBudget: 68,
      estLaborHours: 2.5
    };
    setEditableShoppingList([...editableShoppingList, newItem]);
    triggerToast('Added new paint product specification to shopping list!');
  };

  const handleDeleteShoppingItem = (index: number) => {
    const list = editableShoppingList.filter((_, i) => i !== index);
    setEditableShoppingList(list);
    triggerToast('Removed paint product from shopping list.');
  };

  // IN-PLACE ROOM EDITING HANDLERS
  const handleUpdateRoomField = (roomIndex: number, updates: Partial<RoomSpec>) => {
    if (!selectedProject) return;
    const rooms = [...(selectedProject.rooms || [])];
    const targetRoom = rooms[roomIndex];
    if (!targetRoom) return;

    const newRoom = { ...targetRoom, ...updates };
    const l = Number(newRoom.length) || 0;
    const w = Number(newRoom.width) || 0;
    const h = Number(newRoom.height) || 8;
    newRoom.wallsArea = 2 * h * (l + w);
    newRoom.ceilingArea = l * w;

    rooms[roomIndex] = newRoom;
    setSelectedProject({ ...selectedProject, rooms });
  };

  const handleAddRoomToDocument = () => {
    if (!selectedProject) return;
    const newCat = selectedScopeFilter;
    const baseName = `New ${newCat.charAt(0).toUpperCase() + newCat.slice(1)} Area`;
    const uniqueName = getUniqueRoomName(selectedProject.rooms || [], baseName);

    const newRoom: RoomSpec = {
      id: 'room-' + Date.now(),
      name: uniqueName,
      category: newCat,
      length: 12,
      width: 10,
      height: 8,
      wallsArea: 352,
      ceilingArea: 120,
      wallPaintType: 'Benjamin Moore Regal Select Eggshell',
      paints: [],
      walls: { checked: true, qty: 'auto', coats: 2 },
      ceilings: { checked: true, qty: 'auto', coats: 2 },
      baseboards: { checked: true, qty: 'auto', coats: 2 },
      windows: { checked: true, qty: 2, coats: 2 },
      doors: { checked: true, qty: 1, coats: 2 }
    };
    setSelectedProject({
      ...selectedProject,
      rooms: [...(selectedProject.rooms || []), newRoom]
    });
    triggerToast(`Added ${uniqueName} to ${newCat.toUpperCase()} work order!`);
  };

  const handleDeleteRoomFromDocument = (roomIndex: number) => {
    if (!selectedProject) return;
    const rooms = (selectedProject.rooms || []).filter((_, i) => i !== roomIndex);
    setSelectedProject({ ...selectedProject, rooms });
    triggerToast('Removed area from work order scope.');
  };

  // IN-PLACE SITE PROTOCOLS HANDLERS
  const handleUpdateProtocol = (id: string, updates: Partial<SiteProtocolItem>) => {
    setSiteProtocols(siteProtocols.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleAddProtocol = () => {
    const newProto: SiteProtocolItem = {
      id: 'proto-' + Date.now(),
      text: 'New custom jobsite protocol or crew safety requirement',
      completed: true
    };
    setSiteProtocols([...siteProtocols, newProto]);
    triggerToast('Added new crew protocol item!');
  };

  const handleDeleteProtocol = (id: string) => {
    setSiteProtocols(siteProtocols.filter(p => p.id !== id));
  };

  // PAINTSCOUT NOTES GENERATOR HELPER
  const generateProposalNoteForRoom = (room: RoomSpec): string => {
    const l = Number(room.length) || 0;
    const w = Number(room.width) || 0;
    const h = Number(room.height) || 8;
    
    const surfaces: string[] = [];
    if (room.walls?.checked !== false) {
      surfaces.push(`Walls (${room.walls?.coats || 2} coats ${room.wallPaintType ? `- ${room.wallPaintType}` : ''})`);
    }
    if (room.ceilings?.checked) {
      surfaces.push(`Ceilings (${room.ceilings?.coats || 2} coats Flat White)`);
    }
    if (room.baseboards?.checked) {
      surfaces.push(`Baseboards & Trim (${room.baseboards?.coats || 2} coats Pearl/Semi-Gloss)`);
    }
    if (room.windows?.checked) {
      surfaces.push(`Windows (${typeof room.windows?.qty === 'number' ? room.windows.qty : 2} units)`);
    }
    if (room.doors?.checked) {
      surfaces.push(`Doors (${typeof room.doors?.qty === 'number' ? room.doors.qty : 1} units)`);
    }
    if (room.doorFrames?.checked) {
      surfaces.push(`Door Frames (${typeof room.doorFrames?.qty === 'number' ? room.doorFrames.qty : 1} units)`);
    }

    const lines: string[] = [];
    lines.push(`• AREA DIMENSIONS: ${l}' × ${w}' × ${h}' (${room.wallsArea || (2*h*(l+w))} sq ft walls)`);
    lines.push(`• WORK SCOPE: ${surfaces.length > 0 ? surfaces.join('; ') : 'General painting as required'}`);
    lines.push(`• PREP REQUIRED: Fill fastener holes, patch plaster/drywall gouges, sand smooth, spot prime raw areas.`);
    lines.push(`• CREW INSTRUCTIONS: Mask adjacent trim & glass, lay heavy drop cloths over floor perimeters, clean work area daily.`);

    return lines.join('\n');
  };

  const handlePrefillAllProposalNotes = () => {
    if (!selectedProject) return;
    const updatedRooms = (selectedProject.rooms || []).map(room => ({
      ...room,
      notes: generateProposalNoteForRoom(room)
    }));
    setSelectedProject({ ...selectedProject, rooms: updatedRooms });
    triggerToast('Pre-filled all room notes with detailed proposal specs!');
  };

  const handleSaveDocument = () => {
    if (!selectedProject) return;
    const updatedProject: ProjectDetails = {
      ...selectedProject,
      description: projectDescription,
      inclusions: projectInclusions,
      exclusions: projectExclusions,
      specialConditions: specialConditions,
      teamNotes: teamNotes,
      summary: {
        ...selectedProject.summary,
        laborCost: projectMetrics.laborCost,
        materialCost: projectMetrics.materialCost,
        taxRate: taxRatePercent / 100,
        discount: discountAmount,
        totalPrice: projectMetrics.totalCost
      }
    };
    if (onSaveProject) {
      onSaveProject(updatedProject);
    }
    setSelectedProject(updatedProject);
    triggerToast(`Saved Work Order WO-#${selectedProject.id} changes!`);
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-mono animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header & Job Counts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#18181b] p-6 rounded-3xl border border-neutral-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white font-mono tracking-tight">
              Work Orders & Painter Specifications
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono pl-10">
            Click any Work Order to open the document editor. Edit rooms, paint specs, client details, crew instructions, and shopping lists directly on the page!
          </p>
        </div>

        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-2 rounded-2xl shrink-0 font-mono text-xs">
          <span className="text-zinc-400 font-bold px-2">Active Jobs:</span>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-xl font-bold">
            {activeWorkJobs.length} Approved Work Orders
          </span>
        </div>
      </div>

      {/* List of Active Work Order Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeWorkJobs.map(project => {
          const client = clients.find(c => c.id === project.clientId);
          const projectCategories = Array.from(new Set((project.rooms || []).map(r => r.category || 'interior')));

          return (
            <div 
              key={project.id}
              className="bg-[#18181b] border border-neutral-800 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition shadow-lg group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider block">
                      WO-#{project.id}
                    </span>
                    <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition">
                      {project.title || client?.name || 'Painting Work Order'}
                    </h3>
                  </div>

                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg uppercase shrink-0">
                    {project.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-400 font-mono">
                  <p className="flex items-center gap-1.5 text-zinc-300">
                    <Wrench className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Client: <strong>{client?.name || 'Valued Client'}</strong></span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{client?.address || 'Guelph, ON'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {projectCategories.map(cat => (
                    <span key={cat} className="text-[10px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-zinc-300 px-2 py-0.5 rounded-md font-bold">
                      {cat} WO ({project.rooms?.filter(r => (r.category || 'interior') === cat).length})
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Total Budget</span>
                  <span className="text-sm font-bold text-emerald-400">
                    ${(project.summary?.totalPrice || 0).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProject(project)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Work Order</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* OFFICIAL WORK ORDER INTERACTIVE DOCUMENT CANVAS MODAL OVERLAY */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#18181b] border border-neutral-800 rounded-2xl md:rounded-3xl max-w-6xl w-full max-h-[96vh] overflow-y-auto shadow-2xl text-left font-sans flex flex-col my-auto no-print">
            
            {/* Modal Control Toolbar */}
            <div className="sticky top-0 z-20 bg-[#111111] border-b border-neutral-800 p-3 sm:p-4 md:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
              
              {/* Header Bar: Title + Mobile Expand Toggle + Close Button */}
              <div className="flex items-center justify-between w-full lg:w-auto gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-950 border border-blue-800 rounded-xl text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex flex-wrap items-center gap-1.5">
                      <span>Work Order</span>
                      <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                        <Edit3 className="w-2.5 h-2.5" /> Live
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">WO-#{selectedProject.id} &bull; {activeRoomsForScope.length} Scope Area(s)</p>
                  </div>
                </div>

                {/* Mobile Right Controls: Options Toggle & Close X */}
                <div className="flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setShowMobileOptions(!showMobileOptions)}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-blue-400 text-xs font-mono font-bold rounded-xl flex items-center gap-1 cursor-pointer transition"
                    title="Toggle Work Order Options & PDF Exports"
                  >
                    <span>Options</span>
                    {showMobileOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
                    title="Close Document"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expandable Options & Action Buttons (Always visible on desktop lg, toggled on mobile) */}
              <div className={showMobileOptions ? 'flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full lg:w-auto pt-2 lg:pt-0 border-t border-neutral-800/80 lg:border-t-0' : 'hidden lg:flex lg:flex-row items-center justify-between gap-3 w-full lg:w-auto'}>
                {/* Scope Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-xl font-mono text-xs overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold px-2 hidden sm:inline">Active Scope Filter:</span>
                  {availableScopeCategories.map(cat => {
                    const roomCount = (selectedProject.rooms || []).filter(r => (r.category || 'interior') === cat).length;
                    const labelMap: Record<string, string> = {
                      interior: 'Interior WO',
                      exterior: 'Exterior WO',
                      deck: 'Deck WO'
                    };
                    const colorMap: Record<string, string> = {
                      interior: 'bg-emerald-600',
                      exterior: 'bg-sky-600',
                      deck: 'bg-amber-600'
                    };
                    const activeBg = colorMap[cat] || 'bg-blue-600';

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedScopeFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer shrink-0 ${
                          selectedScopeFilter === cat
                            ? `${activeBg} text-white shadow`
                            : 'text-zinc-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        {labelMap[cat] || `${cat.toUpperCase()} WO`} ({roomCount})
                      </button>
                    );
                  })}
                </div>

                {/* Action Buttons: Save Changes, Export PDF, Print, Close */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveDocument}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30 min-h-[38px] flex-1 sm:flex-none"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const pdf = generateWorkOrderPDF({
                        project: selectedProject,
                        client: {
                          id: selectedProject.clientId,
                          name: clientName,
                          phone: clientPhone,
                          email: clientEmail,
                          address: clientAddress,
                          status: 'Active',
                          notes: '',
                          createdAt: '',
                          updatedAt: ''
                        },
                        rooms: activeRoomsForScope,
                        scopeCategory: selectedScopeFilter,
                        liveSummary: {
                          laborCost: projectMetrics.laborCost,
                          materialCost: projectMetrics.materialCost,
                          totalHours: projectMetrics.totalHours,
                          subtotal: projectMetrics.subtotal,
                          hst: projectMetrics.hst,
                          totalCost: projectMetrics.totalCost
                        },
                        teamNotes: teamNotes,
                        specialConditions: specialConditions,
                        inclusions: projectInclusions,
                        exclusions: projectExclusions,
                        description: projectDescription,
                        shoppingList: editableShoppingList
                      });
                      if (pdf.blobUrl) {
                        const a = document.createElement('a');
                        a.href = pdf.blobUrl;
                        a.download = `Master_WorkOrder_${selectedProject.id}_${selectedScopeFilter.toUpperCase()}.pdf`;
                        a.click();
                      }
                      triggerToast(`Downloaded ${selectedScopeFilter.toUpperCase()} Work Order PDF!`);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[38px] flex-1 sm:flex-none"
                    title="Generate & Download Full Master Work Order PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {selectedScopeFilter.toUpperCase()} PDF</span>
                  </button>

                  {/* PAINTER CREW COPY PDF BUTTON (EXCLUDES PRICE BREAKDOWNS) */}
                  <button
                    type="button"
                    onClick={() => {
                      const pdf = generateWorkOrderPDF({
                        project: selectedProject,
                        client: {
                          id: selectedProject.clientId,
                          name: clientName,
                          phone: clientPhone,
                          email: clientEmail,
                          address: clientAddress,
                          status: 'Active',
                          notes: '',
                          createdAt: '',
                          updatedAt: ''
                        },
                        rooms: activeRoomsForScope,
                        scopeCategory: selectedScopeFilter,
                        liveSummary: {
                          laborCost: projectMetrics.laborCost,
                          materialCost: projectMetrics.materialCost,
                          totalHours: projectMetrics.totalHours,
                          subtotal: projectMetrics.subtotal,
                          hst: projectMetrics.hst,
                          totalCost: projectMetrics.totalCost
                        },
                        teamNotes: teamNotes,
                        specialConditions: specialConditions,
                        inclusions: projectInclusions,
                        exclusions: projectExclusions,
                        description: projectDescription,
                        shoppingList: editableShoppingList,
                        hidePrices: true
                      });
                      if (pdf.blobUrl) {
                        const a = document.createElement('a');
                        a.href = pdf.blobUrl;
                        a.download = `PainterCrew_WorkOrder_${selectedProject.id}_${selectedScopeFilter.toUpperCase()}.pdf`;
                        a.click();
                      }
                      triggerToast(`Downloaded Painter Crew Copy (No Prices) for ${selectedScopeFilter.toUpperCase()}!`);
                    }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[38px] flex-1 sm:flex-none"
                    title="Download Painter Crew Copy (Confidential operational copy with no price details)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Painter Crew PDF (No Prices)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700 min-h-[38px]"
                    title="Print Official Work Order Document"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="hidden lg:flex p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer min-h-[38px] items-center justify-center"
                    title="Close Document"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DOCUMENT CANVAS CONTAINER (PAPER STYLED OFFICIAL DOCUMENT WITH LIVE EDITABLE CONTROLS) */}
            <div className="p-3 sm:p-6 md:p-8 bg-zinc-900/80 flex justify-center">
              <div 
                id="official-work-order-document"
                className="bg-white text-slate-900 w-full rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-200 space-y-6 sm:space-y-8 font-sans text-xs select-text leading-normal overflow-hidden"
              >
                
                {/* 1. DOCUMENT BRANDING & HEADER (EDITABLE COMPANY & SUPERVISOR INFO) */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6 pb-6 border-b-2 border-slate-900">
                  {/* Left: Company Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm shrink-0">
                        CP
                      </div>
                      <input 
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="text-base font-black tracking-tight text-slate-900 font-serif uppercase border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none w-full"
                      />
                    </div>
                    <div className="space-y-1 pt-1 font-mono text-[11px]">
                      <input 
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none"
                      />
                      <input 
                        type="text"
                        value={companyTaxInfo}
                        onChange={(e) => setCompanyTaxInfo(e.target.value)}
                        className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Center: Job Supervisor Info (Editable) */}
                  <div className="space-y-1 text-slate-700 font-mono text-xs flex-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-600" />
                      <span>Job Supervisor / Operations Lead</span>
                    </span>
                    <input 
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="font-bold text-slate-900 text-xs w-full border-b border-slate-200 focus:border-blue-600 outline-none bg-slate-50/50 p-1 rounded"
                    />
                    <input 
                      type="text"
                      value={supervisorPhone}
                      onChange={(e) => setSupervisorPhone(e.target.value)}
                      className="text-[11px] text-slate-600 w-full border-b border-slate-200 focus:border-blue-600 outline-none bg-slate-50/50 p-1 rounded"
                    />
                    <input 
                      type="text"
                      value={supervisorEmail}
                      onChange={(e) => setSupervisorEmail(e.target.value)}
                      className="text-[11px] text-slate-600 w-full border-b border-slate-200 focus:border-blue-600 outline-none bg-slate-50/50 p-1 rounded"
                    />
                  </div>

                  {/* Right: Work Order Stamp & Status Selection */}
                  <div className="md:text-right space-y-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                    <div>
                      <h2 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-wider font-mono flex items-center md:justify-end gap-2">
                        <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 uppercase">
                          {selectedScopeFilter}
                        </span>
                        <span>WORK ORDER</span>
                      </h2>
                      <p className="text-xs font-bold font-mono text-slate-600 mt-0.5">
                        NO: <span className="text-blue-700">WO-#{selectedProject.id}</span>
                      </p>
                    </div>

                    {/* Status Select Dropdown */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-600 text-emerald-800 rounded-lg font-mono font-black text-[11px] uppercase tracking-wider shadow-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <select
                        value={selectedProject.status}
                        onChange={(e) => setSelectedProject({ ...selectedProject, status: e.target.value as any })}
                        className="bg-transparent font-black text-emerald-900 outline-none cursor-pointer uppercase text-xs"
                      >
                        <option value="Approved">Approved / Active</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Sent">Sent to Client</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. THREE-COLUMN CLIENT & JOB METADATA TABLE (FULLY EDITABLE & IPAD RESPONSIVE) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 border border-slate-300 rounded-xl p-3 sm:p-4 font-sans text-xs">
                  {/* Contact Info */}
                  <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4 font-mono">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Client Contact Info (Editable)
                    </span>
                    <input 
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Client Name..."
                      className="font-bold text-slate-900 text-sm w-full bg-white border border-slate-300 rounded p-1.5 focus:border-blue-600 outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <input 
                        type="text"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Phone..."
                        className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] text-slate-800 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <input 
                        type="text"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="Email..."
                        className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] text-slate-800 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Job Site Location */}
                  <div className="space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4 font-mono">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Job Site Address & Access
                    </span>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-1" />
                      <input 
                        type="text"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="Site Address..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 focus:border-blue-600 outline-none text-xs"
                      />
                    </div>
                    <div className="pt-1">
                      <input 
                        type="text"
                        value={specialConditions}
                        onChange={(e) => setSpecialConditions(e.target.value)}
                        placeholder="Lockbox code / Entrance instructions..."
                        className="w-full bg-amber-50 border border-amber-300 rounded p-1.5 text-[11px] text-amber-900 font-bold focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-1 col-span-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-mono">
                      Work Order Scope Metrics
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono">
                      <span className="text-slate-500">Active Scope:</span>
                      <span className="font-bold text-slate-900 text-right uppercase">{selectedScopeFilter}</span>
                      <span className="text-slate-500">Total Areas:</span>
                      <span className="font-bold text-slate-900 text-right">{activeRoomsForScope.length} Rooms</span>
                      <span className="text-slate-500">Est. Hours:</span>
                      <span className="font-bold text-blue-700 text-right">{projectMetrics.totalHours} hrs</span>
                      <span className="text-slate-500">Scope Budget:</span>
                      <span className="font-bold text-emerald-700 text-right">${projectMetrics.subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 2B. IMPORTED SCOPE PARAMETERS: INCLUSIONS, EXCLUSIONS, SPECIAL CONDITIONS & NOTES */}
                <div className="border border-sky-200 bg-sky-50/40 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-sky-900 text-white px-4 py-2 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-sky-300" />
                      <span>Contract Scope, Inclusions, Exclusions & Special Notes</span>
                    </h3>
                    <span className="text-[10px] bg-sky-800 text-sky-100 font-mono px-2 py-0.5 rounded uppercase font-bold">
                      Worker Guidelines
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono text-xs">
                    {/* Project Description */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-extrabold uppercase text-slate-700 block flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        <span>Project Overview & Scope Description (Editable)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded p-2 focus:border-blue-600 outline-none leading-relaxed"
                        placeholder="Enter general scope overview..."
                      />
                    </div>

                    {/* Inclusions */}
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-emerald-800 block flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contract Inclusions (What IS Included)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={projectInclusions}
                        onChange={(e) => setProjectInclusions(e.target.value)}
                        className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded p-2 focus:border-emerald-600 outline-none leading-relaxed"
                        placeholder="List inclusions..."
                      />
                    </div>

                    {/* Exclusions */}
                    <div className="bg-white p-3 rounded-lg border border-rose-200 space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-rose-800 block flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        <span>Contract Exclusions (What IS NOT Included)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={projectExclusions}
                        onChange={(e) => setProjectExclusions(e.target.value)}
                        className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded p-2 focus:border-rose-600 outline-none leading-relaxed"
                        placeholder="List exclusions..."
                      />
                    </div>

                    {/* Special Access Notes */}
                    <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-amber-800 block flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>Special Site Access & Lockbox Notes</span>
                      </label>
                      <textarea
                        rows={2}
                        value={specialConditions}
                        onChange={(e) => setSpecialConditions(e.target.value)}
                        className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded p-2 focus:border-amber-600 outline-none leading-relaxed"
                        placeholder="Lockbox codes, pet rules, entrance notes..."
                      />
                    </div>

                    {/* Crew Notes */}
                    <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-blue-800 block flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-blue-600" />
                        <span>Team & Crew Site Briefing Notes</span>
                      </label>
                      <textarea
                        rows={2}
                        value={teamNotes}
                        onChange={(e) => setTeamNotes(e.target.value)}
                        className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded p-2 focus:border-blue-600 outline-none leading-relaxed"
                        placeholder="Daily crew briefing, paint storage rules..."
                      />
                    </div>
                  </div>
                </div>

                {/* 3. EXECUTIVE CREW OVERVIEW & EDITABLE SITE PROTOCOLS */}
                <div className="border border-blue-200 bg-blue-50/40 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-blue-900 text-white px-4 py-2 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-300" />
                      <span>Executive Crew Overview & Job Site Protocols</span>
                    </h3>
                    <span className="text-[10px] bg-blue-800 text-blue-100 font-mono px-2 py-0.5 rounded uppercase font-bold">
                      Painters Briefing
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 space-y-4">
                    {/* Key Metrics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 font-mono text-center">
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Areas / Rooms</span>
                        <span className="text-sm sm:text-base font-black text-slate-900">{activeRoomsForScope.length}</span>
                      </div>
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Wall Sq Ft</span>
                        <span className="text-sm sm:text-base font-black text-blue-800">{projectMetrics.wallArea.toFixed(0)}</span>
                      </div>
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Ceiling Sq Ft</span>
                        <span className="text-sm sm:text-base font-black text-indigo-800">{projectMetrics.ceilingArea.toFixed(0)}</span>
                      </div>
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Labor Hours</span>
                        <span className="text-sm sm:text-base font-black text-emerald-800">{projectMetrics.totalHours} hrs</span>
                      </div>
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-blue-200 shadow-2xs col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Scope Subtotal</span>
                        <span className="text-sm sm:text-base font-black text-slate-900">${projectMetrics.subtotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Job Site Protocol Checklist (Editable List) */}
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-extrabold text-slate-800 uppercase text-[10px] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Crew Site Setup & Quality Protocols Checklist (Editable)</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleAddProtocol}
                          className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Protocol Item</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {siteProtocols.map(proto => (
                          <div key={proto.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={proto.completed}
                              onChange={(e) => handleUpdateProtocol(proto.id, { completed: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={proto.text}
                              onChange={(e) => handleUpdateProtocol(proto.id, { text: e.target.value })}
                              className="w-full bg-slate-50/80 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:border-blue-600 outline-none text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteProtocol(proto.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                              title="Delete protocol item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. PAINTER MATERIAL & PAINT SHOPPING LIST (WITH SHEEN & EDITABLE FEILDS) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-900 text-white px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-400" />
                      <span>Painter Shopping List & Material Budget (Editable Sheens)</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddShoppingItem}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Paint Spec</span>
                      </button>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 uppercase">
                        {editableShoppingList.length} Item(s)
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 space-y-3 bg-white">
                    <p className="text-xs text-slate-600 font-mono">
                      Painters: Edit brand, product name, sheen, color codes, and gallon quantities directly below. Everything updates live!
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      {editableShoppingList.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                          <p className="text-slate-500 italic font-mono text-xs">No paint products in list yet.</p>
                          <button
                            type="button"
                            onClick={handleAddShoppingItem}
                            className="px-3 py-1.5 bg-blue-600 text-white font-mono font-bold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Paint Product</span>
                          </button>
                        </div>
                      ) : (
                        editableShoppingList.map((item, idx) => {
                          const isChecked = !!checkedShoppingItems[item.key || `item-${idx}`];
                          return (
                            <div 
                              key={item.key || idx}
                              className={`p-3.5 rounded-xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 font-mono text-xs ${
                                isChecked ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50/90 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {/* Left: Product & Color Editable Controls */}
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCheckedShoppingItems({ ...checkedShoppingItems, [item.key || `item-${idx}`]: !isChecked })}
                                    className={`w-5 h-5 rounded flex items-center justify-center transition border cursor-pointer shrink-0 ${
                                      isChecked ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-400 text-transparent hover:border-slate-600'
                                    }`}
                                    title="Mark purchased"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>

                                  {/* Brand */}
                                  <input 
                                    type="text"
                                    value={item.brand}
                                    onChange={(e) => handleUpdateShoppingItem(idx, { brand: e.target.value })}
                                    placeholder="Brand..."
                                    className="font-black text-slate-900 text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:border-blue-600 outline-none w-32 sm:w-36"
                                  />

                                  {/* Paint Product Name */}
                                  <input 
                                    type="text"
                                    value={item.paintName}
                                    onChange={(e) => handleUpdateShoppingItem(idx, { paintName: e.target.value })}
                                    placeholder="Paint product name..."
                                    className="font-bold text-slate-800 text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:border-blue-600 outline-none flex-1 min-w-[150px]"
                                  />

                                  {/* Sheen Select Dropdown */}
                                  <div className="flex items-center gap-1 bg-sky-100 border border-sky-300 rounded px-2 py-0.5">
                                    <span className="text-[10px] text-sky-800 font-extrabold uppercase">Sheen:</span>
                                    <select
                                      value={item.sheen || 'Eggshell'}
                                      onChange={(e) => handleUpdateShoppingItem(idx, { sheen: e.target.value })}
                                      className="bg-transparent text-sky-950 font-black text-xs outline-none cursor-pointer uppercase"
                                    >
                                      <option value="Flat">Flat</option>
                                      <option value="Matte">Matte</option>
                                      <option value="Eggshell">Eggshell</option>
                                      <option value="Satin">Satin</option>
                                      <option value="Semi-Gloss">Semi-Gloss</option>
                                      <option value="Gloss">Gloss</option>
                                      <option value="High-Gloss">High-Gloss</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {/* Color Name */}
                                  <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                                    <span className="text-[10px] text-blue-700 font-bold uppercase">Color:</span>
                                    <input 
                                      type="text"
                                      value={item.colorName}
                                      onChange={(e) => handleUpdateShoppingItem(idx, { colorName: e.target.value })}
                                      className="bg-transparent text-blue-900 font-bold outline-none text-xs w-28 sm:w-36"
                                    />
                                  </div>

                                  {/* Color Code */}
                                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Code:</span>
                                    <input 
                                      type="text"
                                      value={item.colorCode}
                                      onChange={(e) => handleUpdateShoppingItem(idx, { colorCode: e.target.value })}
                                      className="bg-transparent text-slate-900 font-mono font-bold outline-none text-xs w-20"
                                    />
                                  </div>

                                  {/* Surface Target */}
                                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Surface:</span>
                                    <input 
                                      type="text"
                                      value={item.surface}
                                      onChange={(e) => handleUpdateShoppingItem(idx, { surface: e.target.value })}
                                      className="bg-transparent text-slate-900 font-bold outline-none text-xs w-24"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Right: Cans to Buy, Price per Gal & Item Budget */}
                              <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                <div className="space-y-1 text-right">
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Buy Gallons:</span>
                                    <input 
                                      type="number"
                                      min={1}
                                      value={item.gallonsToBuy}
                                      onChange={(e) => handleUpdateShoppingItem(idx, { gallonsToBuy: Number(e.target.value) })}
                                      className="w-12 bg-emerald-50 border border-emerald-300 rounded p-1 font-black text-emerald-900 text-center outline-none"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1 justify-end text-[11px] text-slate-600">
                                    <span className="text-[10px] text-slate-500 font-bold">$/Gal:</span>
                                    <input 
                                      type="number"
                                      value={item.unitPrice || 68}
                                      onChange={(e) => handleUpdateShoppingItem(idx, { unitPrice: Number(e.target.value) })}
                                      className="w-14 bg-slate-50 border border-slate-300 rounded p-0.5 font-bold text-slate-900 text-center outline-none text-[11px]"
                                    />
                                  </div>

                                  <div className="text-[11px] font-bold text-slate-900 border-t border-slate-200 pt-1">
                                    Budget: ${item.estMaterialBudget || (item.gallonsToBuy * (item.unitPrice || 68))}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteShoppingItem(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Delete paint specification"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. ROOM X SURFACE OBJECT SPECIFICATION MATRIX TABLE (IPAD & MOBILE RESPONSIVE WRAPPER) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-3.5 sm:px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <Grid className="w-4 h-4 text-indigo-700" />
                      <span>Room x Surface Specification (Live Editor)</span>
                    </h3>

                    {/* VIEW MODE TOGGLE BUTTONS */}
                    <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-xl border border-slate-300 font-mono text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setWorkOrderViewMode('matrix')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                          workOrderViewMode === 'matrix' 
                            ? 'bg-indigo-700 text-white shadow-sm' 
                            : 'text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Structured Matrix Table View"
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Structured Table View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWorkOrderViewMode('paintScoutNotes');
                          if (selectedProject) {
                            let updated = false;
                            const updatedRooms = (selectedProject.rooms || []).map(r => {
                              if (r.notes === undefined || r.notes === null) {
                                updated = true;
                                return { ...r, notes: generateProposalNoteForRoom(r) };
                              }
                              return r;
                            });
                            if (updated) {
                              setSelectedProject({ ...selectedProject, rooms: updatedRooms });
                            }
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                          workOrderViewMode === 'paintScoutNotes' 
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300' 
                            : 'text-slate-700 hover:bg-slate-300'
                        }`}
                        title="PaintScout Style Freeform Editable Notes Mode (Write It Yourself)"
                      >
                        <FileText className="w-3.5 h-3.5 text-yellow-300" />
                        <span>PaintScout Notes View</span>
                        <span className="text-[9px] bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded font-extrabold uppercase">Write Mode</span>
                      </button>
                    </div>
                  </div>

                  {/* PAINTSCOUT EDITABLE NOTES VIEW MODE */}
                  {workOrderViewMode === 'paintScoutNotes' ? (
                    <div className="p-3.5 sm:p-5 bg-slate-100 space-y-4 font-mono">
                      {/* Sub-Header Toolbar */}
                      <div className="bg-blue-950 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-blue-800">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-bold text-sm text-blue-300">
                            <Edit3 className="w-4 h-4 text-emerald-400" />
                            <span>PaintScout Freeform Scope Notes Mode ("Write It Yourself")</span>
                          </div>
                          <p className="text-blue-200 text-xs">
                            Each area is pre-populated from proposal details into multi-line editable notes. Customize instructions, add specific prep notes, or overwrite text directly.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handlePrefillAllProposalNotes}
                            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 border border-blue-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer text-xs"
                            title="Reset all room note boxes with proposal data"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Pre-fill All from Proposal</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleAddRoomToDocument}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add New Area Note</span>
                          </button>
                        </div>
                      </div>

                      {/* Room Note Cards List */}
                      {activeRoomsForScope.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs italic bg-white rounded-xl border border-slate-300">
                          No areas configured for "{selectedScopeFilter.toUpperCase()}". Click "Add New Area Note" above to create one.
                        </div>
                      ) : (
                        (selectedProject.rooms || [])
                          .map((room, roomIdx) => ({ room, roomIdx }))
                          .filter(({ room }) => (room.category || 'interior') === selectedScopeFilter)
                          .map(({ room, roomIdx }) => {
                            const roomNoteValue = room.notes !== undefined && room.notes !== null 
                              ? room.notes 
                              : generateProposalNoteForRoom(room);

                            return (
                              <div key={room.id || roomIdx} className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                                {/* Room Card Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                                  <div className="flex flex-col flex-1 min-w-[220px] gap-1">
                                    <input
                                      type="text"
                                      value={room.name}
                                      onChange={(e) => handleUpdateRoomField(roomIdx, { name: e.target.value })}
                                      className="font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:border-blue-600 outline-none w-full font-mono"
                                      placeholder="Area / Room Name..."
                                    />
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-500 pl-0.5">
                                      <span className="font-semibold text-slate-500">Dimensions:</span>
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold">
                                        {room.length || 0}' × {room.width || 0}' × {room.height || 8}' ft
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRoomField(roomIdx, { notes: generateProposalNoteForRoom(room) })}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition cursor-pointer flex items-center gap-1"
                                      title="Reset this area's text box to proposal defaults"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-600" />
                                      <span>Reset to Proposal</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRoomFromDocument(roomIdx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Delete area"
                                    >
                                      <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Freeform PaintScout Note Text Area */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-xs uppercase font-extrabold text-slate-700 flex items-center gap-1.5">
                                      <FileText className="w-4 h-4 text-blue-600" /> Write Area Specifications & Crew Notes
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Freeform Multi-line Editor</span>
                                  </div>

                                  <textarea
                                    rows={5}
                                    value={roomNoteValue}
                                    onChange={(e) => handleUpdateRoomField(roomIdx, { notes: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl p-3.5 text-slate-900 text-xs sm:text-sm font-mono leading-relaxed outline-none shadow-inner transition"
                                    placeholder="Type complete work order description, surface details, coat counts, prep instructions, or crew warnings..."
                                  />

                                  {/* Quick Tag Insert Chips */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Insert Snippets:</span>
                                    {[
                                      '• PREP: Fill nail holes, patch plaster, sand smooth',
                                      '• WALLS: 2 coats BM Regal Select Eggshell',
                                      '• CEILINGS: 2 coats Flat White',
                                      '• BASEBOARDS: 2 coats Pearl/Semi-Gloss',
                                      '• MASKING: Mask all casing & floor perimeters',
                                      '• PROTECTION: Cover floors with heavy drop cloths'
                                    ].map((chip, chipIdx) => (
                                      <button
                                        key={chipIdx}
                                        type="button"
                                        onClick={() => {
                                          const existing = roomNoteValue ? roomNoteValue + '\n' : '';
                                          handleUpdateRoomField(roomIdx, { notes: existing + chip });
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 text-[10px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
                                      >
                                        + {chip.split(':')[0]}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}

                      {/* MASTER COMBINED SCOPE DOCUMENT BOX */}
                      {activeRoomsForScope.length > 0 && (
                        <div className="bg-amber-950/90 text-amber-100 border border-amber-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                          <div className="flex items-center justify-between gap-2 border-b border-amber-800/80 pb-2.5">
                            <h4 className="font-bold text-xs sm:text-sm text-amber-300 uppercase flex items-center gap-2">
                              <FileText className="w-4 h-4 text-amber-400" />
                              <span>Master Combined Scope Document ({selectedScopeFilter.toUpperCase()})</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => {
                                const masterText = activeRoomsForScope.map(r => `=== ${r.name.toUpperCase()} ===\n${(r.notes !== undefined && r.notes !== null) ? r.notes : generateProposalNoteForRoom(r)}`).join('\n\n');
                                navigator.clipboard.writeText(masterText);
                                triggerToast('Copied Master Scope Notes to clipboard!');
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Copy Master Document</span>
                            </button>
                          </div>

                          <pre className="text-xs text-amber-200/90 bg-neutral-900/80 p-3.5 rounded-xl border border-amber-900/50 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                            {activeRoomsForScope.map(r => `=== ${r.name.toUpperCase()} ===\n${(r.notes !== undefined && r.notes !== null) ? r.notes : generateProposalNoteForRoom(r)}`).join('\n\n')}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* STRUCTURED MATRIX VIEW (MOBILE CARDS + DESKTOP TABLE) */}
                  <div className="md:hidden divide-y divide-slate-200 bg-white">
                    {activeRoomsForScope.length === 0 ? (
                      <div className="p-6 text-slate-500 italic text-center text-xs font-mono">
                        No rooms found for scope filter "{selectedScopeFilter.toUpperCase()}". Click "Add New Area" below to create one!
                      </div>
                    ) : (
                      (selectedProject.rooms || [])
                        .map((room, roomIdx) => ({ room, roomIdx }))
                        .filter(({ room }) => (room.category || 'interior') === selectedScopeFilter)
                        .map(({ room, roomIdx }) => {
                          const l = Number(room.length) || 0;
                          const w = Number(room.width) || 0;
                          const h = Number(room.height) || 8;
                          const wallSqFt = room.wallsArea || (2 * h * (l + w));
                          const ceilingSqFt = room.ceilingArea || (l * w);

                          return (
                            <div key={room.id || roomIdx} className="p-3.5 space-y-3 font-mono text-xs">
                              {/* Card Header: Room Name + Dimensions (smaller & under title) + Delete */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={room.name}
                                    onChange={(e) => handleUpdateRoomField(roomIdx, { name: e.target.value })}
                                    className="font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs focus:border-blue-600 outline-none w-full"
                                  />
                                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 pl-0.5">
                                    <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>Dimensions: {l}' × {w}' × {h}' ft</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRoomFromDocument(roomIdx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer shrink-0 mt-0.5"
                                  title="Remove room from scope"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Surface Checkboxes Grid */}
                              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={room.walls?.checked !== false}
                                    onChange={(e) => handleUpdateRoomField(roomIdx, { 
                                      walls: { checked: e.target.checked, qty: room.walls?.qty ?? 'auto', coats: room.walls?.coats || 2 } 
                                    })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <span className="font-bold text-slate-900">Walls</span>
                                  <span className="text-[10px] text-slate-500 font-bold">({wallSqFt.toFixed(0)}sf)</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!room.ceilings?.checked}
                                    onChange={(e) => handleUpdateRoomField(roomIdx, { 
                                      ceilings: { checked: e.target.checked, qty: room.ceilings?.qty ?? 'auto', coats: room.ceilings?.coats || 2 } 
                                    })}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                  />
                                  <span className="font-bold text-indigo-900">Ceiling</span>
                                  <span className="text-[10px] text-indigo-500 font-bold">({ceilingSqFt.toFixed(0)}sf)</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!room.baseboards?.checked}
                                    onChange={(e) => handleUpdateRoomField(roomIdx, { 
                                      baseboards: { checked: e.target.checked, qty: room.baseboards?.qty ?? 'auto', coats: room.baseboards?.coats || 2 } 
                                    })}
                                    className="w-4 h-4 text-slate-700 rounded"
                                  />
                                  <span className="text-slate-800 font-medium">Baseboards</span>
                                </label>

                                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                                  <span>Win: {typeof room.windows?.qty === 'number' ? room.windows.qty : 2}</span>
                                  <span>&bull;</span>
                                  <span>Door: {typeof room.doors?.qty === 'number' ? room.doors.qty : 1}</span>
                                </div>
                              </div>

                              {/* Paint Product Spec Input */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Paint Specification</span>
                                <input
                                  type="text"
                                  value={room.wallPaintType || 'Benjamin Moore Regal Select Eggshell'}
                                  onChange={(e) => handleUpdateRoomField(roomIdx, { wallPaintType: e.target.value })}
                                  className="w-full bg-blue-50/60 border border-blue-200 rounded p-1.5 text-[11px] text-blue-900 font-bold focus:border-blue-600 outline-none"
                                />
                              </div>

                              {/* Area Notes Input */}
                              <div className="space-y-1 bg-amber-50/50 p-2 rounded-lg border border-amber-200/80">
                                <span className="text-[10px] font-bold text-amber-900 uppercase block flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-amber-600" /> Area Notes / Instructions
                                </span>
                                <input
                                  type="text"
                                  value={room.notes || ''}
                                  onChange={(e) => handleUpdateRoomField(roomIdx, { notes: e.target.value })}
                                  placeholder="Add prep condition or crew instructions..."
                                  className="w-full bg-white border border-amber-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-amber-700/50 focus:border-amber-500 outline-none font-mono"
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* DESKTOP TABLE VIEW (hidden on mobile, block on md+) */}
                  <div className="hidden md:block overflow-x-auto bg-white scrollbar-thin">
                    <table className="w-full text-left font-mono text-xs border-collapse min-w-full">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                          <th className="p-2.5 sm:p-3 border-r border-slate-800">Room / Area & Dimensions</th>
                          <th className="p-2.5 sm:p-3 border-r border-slate-800">Walls Area</th>
                          <th className="p-2.5 sm:p-3 border-r border-slate-800">Ceiling Area</th>
                          <th className="p-2.5 sm:p-3 border-r border-slate-800">Baseboards</th>
                          <th className="p-2.5 sm:p-3 border-r border-slate-800">Win & Door Qty</th>
                          <th className="p-2.5 sm:p-3 border-r border-slate-800">Paint Specification</th>
                          <th className="p-2.5 sm:p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {activeRoomsForScope.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-slate-500 italic text-center">
                              No rooms found for scope filter "{selectedScopeFilter.toUpperCase()}". Click "Add New Area" below to create one!
                            </td>
                          </tr>
                        ) : (
                          (selectedProject.rooms || [])
                            .map((room, roomIdx) => ({ room, roomIdx }))
                            .filter(({ room }) => (room.category || 'interior') === selectedScopeFilter)
                            .map(({ room, roomIdx }, idx) => {
                              const l = Number(room.length) || 0;
                              const w = Number(room.width) || 0;
                              const h = Number(room.height) || 8;
                              const wallSqFt = room.wallsArea || (2 * h * (l + w));
                              const ceilingSqFt = room.ceilingArea || (l * w);

                              return (
                                <React.Fragment key={room.id || roomIdx}>
                                  <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                    {/* Room Name Input & Smaller Dimensions Under Title */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          value={room.name}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, { name: e.target.value })}
                                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 focus:border-blue-600 outline-none text-xs font-mono"
                                        />
                                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 font-semibold pl-0.5" title="Room dimensions locked from initial scope estimate">
                                          <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                          <span>{l}' × {w}' × {h}' ft</span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Walls Checkbox & SqFt */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={room.walls?.checked !== false}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, { 
                                            walls: { checked: e.target.checked, qty: room.walls?.qty ?? 'auto', coats: room.walls?.coats || 2 } 
                                          })}
                                          className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="font-bold text-slate-900">{wallSqFt.toFixed(0)} sqft</span>
                                        <span className="text-[10px] text-slate-500 font-mono">(2 coats)</span>
                                      </label>
                                    </td>

                                    {/* Ceiling Checkbox & SqFt */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={!!room.ceilings?.checked}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, { 
                                            ceilings: { checked: e.target.checked, qty: room.ceilings?.qty ?? 'auto', coats: room.ceilings?.coats || 2 } 
                                          })}
                                          className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span className="font-bold text-indigo-900">{ceilingSqFt.toFixed(0)} sqft</span>
                                        <span className="text-[10px] text-indigo-500 font-mono">(2 coats)</span>
                                      </label>
                                    </td>

                                    {/* Baseboard Checkbox */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={!!room.baseboards?.checked}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, { 
                                            baseboards: { checked: e.target.checked, qty: room.baseboards?.qty ?? 'auto', coats: room.baseboards?.coats || 2 } 
                                          })}
                                          className="w-4 h-4 text-slate-700 rounded"
                                        />
                                        <span className="text-slate-800 font-medium">Baseboards</span>
                                      </label>
                                    </td>

                                    {/* Windows & Doors Locked Quantities */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200 space-y-1 text-[10px]">
                                      <div className="flex items-center justify-between gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Quantity locked from initial estimate">
                                        <span className="text-slate-600 font-bold">Win:</span>
                                        <span className="font-mono font-bold text-slate-900">{typeof room.windows?.qty === 'number' ? room.windows.qty : 2}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Quantity locked from initial estimate">
                                        <span className="text-slate-600 font-bold">Door:</span>
                                        <span className="font-mono font-bold text-slate-900">{typeof room.doors?.qty === 'number' ? room.doors.qty : 1}</span>
                                      </div>
                                    </td>

                                    {/* Paint Product Specification Input */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200">
                                      <input
                                        type="text"
                                        value={room.wallPaintType || 'Benjamin Moore Regal Select Eggshell'}
                                        onChange={(e) => handleUpdateRoomField(roomIdx, { wallPaintType: e.target.value })}
                                        className="w-full bg-blue-50/50 border border-blue-200 rounded p-1 text-[10px] text-blue-900 font-bold focus:border-blue-600 outline-none"
                                      />
                                    </td>

                                    {/* Delete Row Action */}
                                    <td className="p-2 sm:p-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRoomFromDocument(roomIdx)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                        title="Remove room from scope"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>

                                  {/* EXPANDABLE AREA NOTES ROW FOR WORK ORDER CREW */}
                                  <tr className="bg-amber-50/40 border-b border-slate-200">
                                    <td colSpan={8} className="p-2 px-3 sm:px-4">
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span className="text-[10px] font-extrabold text-amber-900 uppercase font-mono shrink-0">Area Notes ({room.name}):</span>
                                        <input
                                          type="text"
                                          value={room.notes || ''}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, { notes: e.target.value })}
                                          placeholder="Add inclusions, exclusions, prep condition or crew instructions for this specific area..."
                                          className="w-full bg-white border border-amber-200/80 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-amber-700/50 focus:border-amber-500 focus:bg-amber-50/30 outline-none font-mono"
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Room Button Bar */}
                      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-mono">
                          Need to add another area or room to the {selectedScopeFilter.toUpperCase()} scope?
                        </span>
                        <button
                          type="button"
                          onClick={handleAddRoomToDocument}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New {selectedScopeFilter.toUpperCase()} Area</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. PRICE & QUANTITY CALCULATION FORMULAS RUNDOWN (EDITABLE FINANCIAL PARAMS) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-700" />
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono">
                          Financial Rates & Calculation Formula Parameters
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Adjust labor rates, sundries per room, tax rates, and discounts directly below
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCalculationRundown(!showCalculationRundown)}
                      className="text-xs font-mono font-bold text-blue-700 bg-white px-2.5 py-1 rounded border border-slate-300 self-start sm:self-auto cursor-pointer"
                    >
                      {showCalculationRundown ? 'Hide Formulas ▲' : 'View Formulas ▼'}
                    </button>
                  </div>

                  {/* Financial Rate Inputs Bar */}
                  <div className="p-4 bg-slate-100/70 border-b border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="bg-white p-2 rounded border border-slate-300 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block">Labor Rate ($/hr)</label>
                      <input 
                        type="number"
                        value={laborRatePerHour}
                        onChange={(e) => setLaborRatePerHour(Number(e.target.value))}
                        className="w-full font-black text-slate-900 text-sm outline-none bg-slate-50 p-1 rounded"
                      />
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-300 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block">Sundries / Room ($)</label>
                      <input 
                        type="number"
                        value={sundriesPerRoom}
                        onChange={(e) => setSundriesPerRoom(Number(e.target.value))}
                        className="w-full font-black text-slate-900 text-sm outline-none bg-slate-50 p-1 rounded"
                      />
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-300 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block">Tax Rate (HST %)</label>
                      <input 
                        type="number"
                        value={taxRatePercent}
                        onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                        className="w-full font-black text-slate-900 text-sm outline-none bg-slate-50 p-1 rounded"
                      />
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-300 space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block">Discount ($)</label>
                      <input 
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                        className="w-full font-black text-rose-700 text-sm outline-none bg-rose-50 p-1 rounded"
                      />
                    </div>
                  </div>

                  {showCalculationRundown && (
                    <div className="p-5 space-y-4 bg-white font-mono text-xs text-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Area Formula Box */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>1. Surface Area Formulas</span>
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <strong>Wall Surface:</strong> <code>2 × Height × (Length + Width)</code><br />
                            <strong>Ceiling Surface:</strong> <code>Length × Width</code><br />
                            <strong>Trim Length:</strong> <code>2 × (Length + Width)</code>
                          </p>
                          <div className="text-[11px] text-slate-800 font-bold pt-1 bg-white p-2 rounded border border-slate-200">
                            Scope Totals: {projectMetrics.wallArea.toFixed(0)} sq ft Walls + {projectMetrics.ceilingArea.toFixed(0)} sq ft Ceilings
                          </div>
                        </div>

                        {/* 2. Paint Gallons Required Formula Box */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1">
                            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                            <span>2. Paint Gallons Formula</span>
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <strong>Exact Gallons:</strong> <code>(Total Sq Ft × Coats) ÷ 350 sq ft/gal</code><br />
                            <strong>Store Cans to Buy:</strong> <code>Math.ceil(Exact Gallons)</code> (Min 1 can/color)
                          </p>
                          <div className="text-[11px] text-slate-800 font-bold pt-1 bg-white p-2 rounded border border-slate-200">
                            Standard Paint Coverage: 350 sq ft per gallon (2 full coats standard)
                          </div>
                        </div>

                        {/* 3. Material Budget Breakdown Box */}
                        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1.5">
                          <h4 className="font-bold text-emerald-900 text-xs uppercase flex items-center gap-1.5 border-b border-emerald-200 pb-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                            <span>3. Material Budget Breakdown & Formula</span>
                          </h4>
                          <p className="text-[11px] text-emerald-900 leading-relaxed">
                            <strong>Paint Materials:</strong> <code>Sum of Shopping Items = ${projectMetrics.sumPaintMaterial.toLocaleString()}</code><br />
                            <strong>Sundries & Prep:</strong> <code>{activeRoomsForScope.length} Areas × ${sundriesPerRoom}.00 / area = ${projectMetrics.sundriesBudget}</code><br />
                            <em>(Covers Scotch Blue tape, 3 mil poly drop cloths, spackle, caulk, roller covers & mini-rollers)</em>
                          </p>
                          <div className="text-[11px] text-emerald-950 font-bold pt-1 bg-white p-2 rounded border border-emerald-300">
                            Total Scope Material Budget = ${projectMetrics.materialCost.toLocaleString()}
                          </div>
                        </div>

                        {/* 4. Financial & Tax Pricing Formula Box */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>4. Labor & Financial Grand Total Formula</span>
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <strong>Labor Hours:</strong> <code>Total Sq Ft ÷ 150 sq ft/hr = {projectMetrics.totalHours} hrs</code><br />
                            <strong>Labor Cost:</strong> <code>{projectMetrics.totalHours} hrs × ${laborRatePerHour}.00 / hr = ${projectMetrics.laborCost.toLocaleString()}</code><br />
                            <strong>HST Tax ({taxRatePercent}%):</strong> <code>Subtotal (${projectMetrics.subtotal.toLocaleString()}) × {taxRatePercent / 100} = ${projectMetrics.hst.toLocaleString()}</code>
                          </p>
                          <div className="text-[11px] text-slate-900 font-bold pt-1 bg-slate-200 p-2 rounded">
                            Grand Total: ${projectMetrics.subtotal.toLocaleString()} Subtotal + ${projectMetrics.hst.toLocaleString()} HST = ${projectMetrics.totalCost.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. FINANCIAL SUMMARY BAR */}
                <div className="border-2 border-slate-900 rounded-xl overflow-hidden p-4 bg-slate-50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Scope Financial Breakdown</span>
                      <div className="flex flex-wrap items-center gap-4 text-slate-800 font-bold">
                        <span>Labor Budget: ${projectMetrics.laborCost.toLocaleString()}</span>
                        <span>&bull;</span>
                        <span>Material Budget: ${projectMetrics.materialCost.toLocaleString()}</span>
                        <span>&bull;</span>
                        <span>Subtotal: ${projectMetrics.subtotal.toLocaleString()}</span>
                        <span>&bull;</span>
                        <span>HST ({taxRatePercent}%): ${projectMetrics.hst.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-3 rounded-lg text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Grand Total ({selectedScopeFilter.toUpperCase()})</span>
                      <span className="text-lg font-black text-emerald-400">${projectMetrics.totalCost.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 50% Target Benchmark Breakdown Card */}
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-mono text-slate-800 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-blue-900">
                      <span className="flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-blue-600 shrink-0" />
                        Project Target Benchmark (35% Labor Target | 15% Material Target | 50% Margin Target)
                      </span>
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] uppercase">Target Gross Margin: 50.0%</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                      <div className="bg-white p-2.5 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Labor (35%)</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">${Math.round(projectMetrics.subtotal * 0.35).toLocaleString()}</span>
                        <div className="text-[10px] text-slate-600 mt-1">
                          Actual Labor: <strong className={projectMetrics.laborCost <= projectMetrics.subtotal * 0.35 ? 'text-emerald-700' : 'text-amber-700'}>${projectMetrics.laborCost.toLocaleString()}</strong> ({((projectMetrics.laborCost / (projectMetrics.subtotal || 1)) * 100).toFixed(1)}%)
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Material (15%)</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">${Math.round(projectMetrics.subtotal * 0.15).toLocaleString()}</span>
                        <div className="text-[10px] text-slate-600 mt-1">
                          Actual Material: <strong className={projectMetrics.materialCost <= projectMetrics.subtotal * 0.15 ? 'text-emerald-700' : 'text-amber-700'}>${projectMetrics.materialCost.toLocaleString()}</strong> ({((projectMetrics.materialCost / (projectMetrics.subtotal || 1)) * 100).toFixed(1)}%)
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Combined Target Cost (50%)</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">${Math.round(projectMetrics.subtotal * 0.50).toLocaleString()}</span>
                        <div className="text-[10px] text-slate-600 mt-1">
                          Actual Total Direct: <strong>${(projectMetrics.laborCost + projectMetrics.materialCost).toLocaleString()}</strong> ({(((projectMetrics.laborCost + projectMetrics.materialCost) / (projectMetrics.subtotal || 1)) * 100).toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. SIGNATURE & QUALITY ASSURANCE FOOTER */}
                <div className="pt-6 border-t-2 border-slate-300 space-y-6 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                        Site Lead / Operations Sign-off
                      </span>
                      <div className="h-10 border-b-2 border-slate-900 flex items-end pb-1 font-bold text-slate-800">
                        <input 
                          type="text"
                          value={supervisorName}
                          onChange={(e) => setSupervisorName(e.target.value)}
                          className="w-full font-bold text-slate-900 outline-none bg-transparent"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Authorized Signature</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                        Customer Site Acceptance
                      </span>
                      <div className="h-10 border-b-2 border-slate-300 flex items-end pb-1 text-slate-400 italic">
                        Sign upon job completion
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Client Signature</span>
                        <span>Date: ____ / ____ / ________</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3 rounded-lg text-center text-[10px] text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-800">CAPSTONE PAINTING INC. &bull; QUALITY ASSURANCE GUARANTEE</p>
                    <p>All work is executed according to professional painting standards using premium materials. Thank you for choosing Capstone Painting!</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Control Footer Bar */}
            <div className="p-4 sm:px-6 border-t border-neutral-800 bg-[#111111] flex items-center justify-between no-print">
              <span className="text-xs text-zinc-400 font-mono">
                PaintCRM Interactive Document Engine &bull; Official Work Order WO-#{selectedProject.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Work Order Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer border border-neutral-700"
                >
                  Print Official Document
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
