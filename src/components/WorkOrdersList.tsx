import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProjectDetails, ClientLead, RoomSpec, SurfaceTask, ProjectTask } from '../types';
import { generateWorkOrderPDF } from '../pdfGenerator';
import { getUniqueRoomName } from '../utils/roomUtils';
import { getWorkOrderNumber } from '../utils/workOrderUtils';
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
  ChevronUp,
  Share2,
  PenTool,
  CheckCircle2,
  Copy,
  ExternalLink,
  ArrowRight
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

// Helper to parse strings with various line formats into clean point-form arrays
const parseScopePoints = (rawText: string | undefined): string[] => {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.map(l => l.replace(/^[•\-\*\d\.\)\s]+/, '').trim()).filter(Boolean);
  }
  const splitPoints = rawText.split(/[•;\|\n]|(?:\s-\s)/).map(s => s.trim()).filter(Boolean);
  if (splitPoints.length > 1) {
    return splitPoints.map(l => l.replace(/^[•\-\*\d\.\)\s]+/, '').trim()).filter(Boolean);
  }
  return [rawText.trim()];
};

interface WorkOrdersListProps {
  projects: ProjectDetails[];
  clients: ClientLead[];
  onSaveProject?: (project: ProjectDetails) => void;
  onSelectProjectForFullEdit?: (projectId: string) => void;
  onNavigateToInstantCalc?: (projectId?: string) => void;
}

export default function WorkOrdersList({
  projects,
  clients,
  onSaveProject,
  onSelectProjectForFullEdit,
  onNavigateToInstantCalc,
}: WorkOrdersListProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'interior' | 'exterior' | 'deck'>('interior');
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

  // Toggles for editing scope sections inline
  const [editingDescription, setEditingDescription] = useState<boolean>(false);
  const [editingInclusions, setEditingInclusions] = useState<boolean>(false);
  const [editingExclusions, setEditingExclusions] = useState<boolean>(false);
  const [editingSpecialConditions, setEditingSpecialConditions] = useState<boolean>(false);
  const [editingTeamNotes, setEditingTeamNotes] = useState<boolean>(false);

  const [laborRatePerHour, setLaborRatePerHour] = useState<number>(100);
  const [sundriesPerRoom, setSundriesPerRoom] = useState<number>(12);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(13);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Customer Site Acceptance signature modal states
  const [isSiteSignatureModalOpen, setIsSiteSignatureModalOpen] = useState<boolean>(false);
  const [isShareWorkerModalOpen, setIsShareWorkerModalOpen] = useState<boolean>(false);
  const [signatureInputMode, setSignatureInputMode] = useState<'draw' | 'type'>('draw');
  const [typedSignerName, setTypedSignerName] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [siteProtocols, setSiteProtocols] = useState<SiteProtocolItem[]>([
    { id: 'proto-1', text: 'Cover all floor surfaces and furniture with heavy-duty drop cloths and 3 mil poly sheeting.', completed: true },
    { id: 'proto-2', text: 'Mask all trim, door casings, window frames, and light switch plates using Scotch Blue tape.', completed: true },
    { id: 'proto-3', text: 'Clean brushes, rollers, and paint trays daily in designated garage or utility sink area.', completed: true },
    { id: 'proto-4', text: 'Keep client pets safely inside specified rooms and ensure property entrance doors remain closed.', completed: true }
  ]);

  const activeWorkJobs = useMemo(() => {
    return projects.filter(p => p.status === 'Approved' || p.status === 'Completed' || p.status === 'In Progress' || p.status === 'Sent' || p.status === 'Draft');
  }, [projects]);

  // Automatically open work order if URL contains workOrder query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const woId = params.get('workOrder');
    const scopeParam = params.get('scope') as 'interior' | 'exterior' | 'deck' | null;
    if (woId && projects.length > 0) {
      const match = projects.find(p => p.id === woId);
      if (match) {
        setSelectedProject(match);
        if (scopeParam && ['interior', 'exterior', 'deck'].includes(scopeParam)) {
          setSelectedScopeFilter(scopeParam);
        }
      }
    }
  }, [projects]);

  const selectedClient = useMemo(() => {
    if (!selectedProject) return null;
    return clients.find(c => c.id === selectedProject.clientId);
  }, [selectedProject, clients]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active scope categories that actually have rooms in this project estimate
  const availableScopeCategories = useMemo(() => {
    if (!selectedProject || !selectedProject.rooms || selectedProject.rooms.length === 0) {
      return ['interior'] as Array<'interior' | 'exterior' | 'deck'>;
    }
    const scopesFound = new Set<'interior' | 'exterior' | 'deck'>();
    selectedProject.rooms.forEach(r => {
      const cat = (r.category || 'interior') as 'interior' | 'exterior' | 'deck';
      scopesFound.add(cat);
    });
    const result: Array<'interior' | 'exterior' | 'deck'> = [];
    if (scopesFound.has('interior')) result.push('interior');
    if (scopesFound.has('exterior')) result.push('exterior');
    if (scopesFound.has('deck')) result.push('deck');
    return result.length > 0 ? result : (['interior'] as Array<'interior' | 'exterior' | 'deck'>);
  }, [selectedProject]);

  // Sync selected scope filter with available categories
  useEffect(() => {
    if (availableScopeCategories.length > 0) {
      if (!availableScopeCategories.includes(selectedScopeFilter)) {
        setSelectedScopeFilter(availableScopeCategories[0]);
      }
    }
  }, [availableScopeCategories, selectedScopeFilter]);

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
      setLaborRatePerHour(selectedProject.summary?.hourlyLaborRate || 100);
      setTypedSignerName(selectedProject.siteAcceptedBy || client?.name || selectedProject.signerName || '');

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

    // EXACT USER LABOR FORMULA: Labor = 100 (rate) x 85 (Number of hours)
    let totalHours = 0;
    if (selectedProject.summary?.totalHours && selectedProject.summary.totalHours > 0) {
      totalHours = selectedProject.summary.totalHours;
    } else if (selectedProject.summary?.laborCost && selectedProject.summary.laborCost > 0) {
      const storedRate = selectedProject.summary.hourlyLaborRate || 100;
      totalHours = Math.round((selectedProject.summary.laborCost / storedRate) * 10) / 10;
    } else {
      const estHours = (totalSqFt / 150) + (totalItemsQty * 0.5) + (trimLnft / 50);
      totalHours = Math.max(0.5, Math.round(estHours * 10) / 10);
    }

    const currentRate = laborRatePerHour || 100;
    const laborCost = Math.round(totalHours * currentRate);

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
    if (selectedScopeFilter === 'interior') {
      triggerToast('Interior areas cannot be added in Work Orders. Interior scope is locked to the proposal estimate.');
      return;
    }
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
    triggerToast(`Saved Work Order ${getWorkOrderNumber(selectedProject.id, selectedScopeFilter)} changes!`);
  };

  // SIGNATURE CANVAS DRAWING HANDLERS
  const clearSiteSignatureCanvas = () => {
    if (sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
      }
    }
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!sigCanvasRef.current) return { x: 0, y: 0 };
    const rect = sigCanvasRef.current.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const handleSigStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleSigDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleSigEnd = () => {
    setIsDrawing(false);
  };

  const handleSaveCustomerSiteSignature = () => {
    if (!selectedProject) return;
    let signatureDataUrl = '';
    if (sigCanvasRef.current) {
      signatureDataUrl = sigCanvasRef.current.toDataURL('image/png');
    }
    const signer = typedSignerName.trim() || clientName || 'Customer';
    const nowIso = new Date().toISOString();

    const updatedProject: ProjectDetails = {
      ...selectedProject,
      siteAcceptanceSignatureDataUrl: signatureDataUrl || selectedProject.siteAcceptanceSignatureDataUrl,
      siteAcceptanceDate: nowIso,
      siteAcceptedBy: signer
    };

    if (onSaveProject) {
      onSaveProject(updatedProject);
    }
    setSelectedProject(updatedProject);
    setIsSiteSignatureModalOpen(false);
    triggerToast('Customer site acceptance signature captured and saved!');
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
                      {getWorkOrderNumber(project.id)}
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
                    <p className="text-[11px] text-zinc-400 font-mono">{getWorkOrderNumber(selectedProject.id, selectedScopeFilter)} &bull; {activeRoomsForScope.length} Scope Area(s)</p>
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
                {/* Scope Filter Tabs (Only shown if more than 1 scope category exists in the project estimate) */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-xl font-mono text-xs overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
                  {availableScopeCategories.length > 1 ? (
                    <>
                      <span className="text-[10px] uppercase text-zinc-500 font-bold px-2 hidden sm:inline">Active Scope:</span>
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
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-2.5 py-1">
                      <span className="text-[10px] uppercase text-zinc-500 font-bold">Scope:</span>
                      <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {availableScopeCategories[0] || 'Interior'} Scope ({(selectedProject.rooms || []).length} Areas)
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Save Changes, Share/Email, Export PDF, Print, Close */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveDocument}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30 min-h-[38px] flex-1 sm:flex-none"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>

                  {/* SHARE / EMAIL WORK ORDER TO WORKERS */}
                  <button
                    type="button"
                    onClick={() => setIsShareWorkerModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[38px] flex-1 sm:flex-none"
                    title="Share / Email Work Order to Painters & Workers"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share / Email to Workers</span>
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
                        a.download = `Master_WorkOrder_${getWorkOrderNumber(selectedProject.id, selectedScopeFilter)}.pdf`;
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
                        a.download = `PainterCrew_WorkOrder_${getWorkOrderNumber(selectedProject.id, selectedScopeFilter)}.pdf`;
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
                        NO: <span className="text-blue-700">{getWorkOrderNumber(selectedProject.id, selectedScopeFilter)}</span>
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

                {/* 2B. IMPORTED SCOPE PARAMETERS: INCLUSIONS, EXCLUSIONS, SPECIAL CONDITIONS & NOTES (END-TO-END POINT FORM) */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm space-y-0">
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-sky-300" />
                      <span>Contract Scope, Inclusions, Exclusions & Special Notes</span>
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-200 font-mono px-2 py-0.5 rounded uppercase font-bold border border-slate-700">
                      End-to-End Point-Form Scope
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4 font-mono text-xs">
                    {/* 1. Project Overview & Scope Description (Full Width End-to-End) */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span>Project Overview & Scope Description</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingDescription(!editingDescription)}
                          className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingDescription ? 'Done Editing' : 'Edit Description'}</span>
                        </button>
                      </div>

                      {editingDescription ? (
                        <textarea
                          rows={3}
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          className="w-full text-xs font-mono text-slate-900 bg-white border border-blue-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                          placeholder="Enter general scope overview..."
                        />
                      ) : (
                        <ul className="space-y-1.5 pl-1">
                          {parseScopePoints(projectDescription).map((pt, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-slate-700 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                              <span className="font-sans font-medium">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* 2. Contract Inclusions (Full Width End-to-End) */}
                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                        <label className="text-xs font-bold uppercase text-emerald-900 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Contract Inclusions (What IS Included)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingInclusions(!editingInclusions)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-emerald-200 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingInclusions ? 'Done Editing' : 'Edit Inclusions'}</span>
                        </button>
                      </div>

                      {editingInclusions ? (
                        <textarea
                          rows={3}
                          value={projectInclusions}
                          onChange={(e) => setProjectInclusions(e.target.value)}
                          className="w-full text-xs font-mono text-slate-900 bg-white border border-emerald-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
                          placeholder="List inclusions (one per line or separated by bullets)..."
                        />
                      ) : (
                        <ul className="space-y-1.5 pl-1">
                          {parseScopePoints(projectInclusions).map((pt, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-emerald-950 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                              <span className="font-sans font-medium">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* 3. Contract Exclusions (Full Width End-to-End) */}
                    <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                        <label className="text-xs font-bold uppercase text-rose-900 flex items-center gap-2">
                          <X className="w-4 h-4 text-rose-600" />
                          <span>Contract Exclusions (What IS NOT Included)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingExclusions(!editingExclusions)}
                          className="text-[11px] text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-rose-200 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingExclusions ? 'Done Editing' : 'Edit Exclusions'}</span>
                        </button>
                      </div>

                      {editingExclusions ? (
                        <textarea
                          rows={3}
                          value={projectExclusions}
                          onChange={(e) => setProjectExclusions(e.target.value)}
                          className="w-full text-xs font-mono text-slate-900 bg-white border border-rose-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20 leading-relaxed"
                          placeholder="List exclusions (one per line or separated by bullets)..."
                        />
                      ) : (
                        <ul className="space-y-1.5 pl-1">
                          {parseScopePoints(projectExclusions).map((pt, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-rose-950 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                              <span className="font-sans font-medium">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* 4. Special Access & Lockbox Notes (Full Width End-to-End) */}
                    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                        <label className="text-xs font-bold uppercase text-amber-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-amber-600" />
                          <span>Special Site Access & Lockbox Notes</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingSpecialConditions(!editingSpecialConditions)}
                          className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-amber-200 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingSpecialConditions ? 'Done Editing' : 'Edit Access Notes'}</span>
                        </button>
                      </div>

                      {editingSpecialConditions ? (
                        <textarea
                          rows={2}
                          value={specialConditions}
                          onChange={(e) => setSpecialConditions(e.target.value)}
                          className="w-full text-xs font-mono text-slate-900 bg-white border border-amber-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed"
                          placeholder="Lockbox codes, pet rules, entrance notes..."
                        />
                      ) : (
                        <ul className="space-y-1.5 pl-1">
                          {parseScopePoints(specialConditions).map((pt, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-amber-950 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              <span className="font-sans font-medium">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* 5. Team & Crew Site Briefing Notes (Full Width End-to-End) */}
                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                        <label className="text-xs font-bold uppercase text-blue-900 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-blue-600" />
                          <span>Team & Crew Site Briefing Notes</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingTeamNotes(!editingTeamNotes)}
                          className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-blue-200 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingTeamNotes ? 'Done Editing' : 'Edit Briefing'}</span>
                        </button>
                      </div>

                      {editingTeamNotes ? (
                        <textarea
                          rows={2}
                          value={teamNotes}
                          onChange={(e) => setTeamNotes(e.target.value)}
                          className="w-full text-xs font-mono text-slate-900 bg-white border border-blue-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                          placeholder="Daily crew briefing, paint storage rules..."
                        />
                      ) : (
                        <ul className="space-y-1.5 pl-1">
                          {parseScopePoints(teamNotes).map((pt, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-blue-950 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                              <span className="font-sans font-medium">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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

                          {selectedScopeFilter === 'interior' ? (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 font-mono font-bold rounded-lg text-xs border border-slate-300/80 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Interior Areas Locked to Estimate</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleAddRoomToDocument}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add New {selectedScopeFilter.toUpperCase()} Area Note</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Room Note Cards List */}
                      {activeRoomsForScope.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs italic bg-white rounded-xl border border-slate-300">
                          {selectedScopeFilter === 'interior'
                            ? 'No interior areas configured in proposal estimate scope.'
                            : `No areas configured for "${selectedScopeFilter.toUpperCase()}". Click "Add New ${selectedScopeFilter.toUpperCase()} Area Note" above to create one.`}
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
                        {selectedScopeFilter === 'interior'
                          ? 'No interior areas found in proposal estimate scope.'
                          : `No rooms found for scope filter "${selectedScopeFilter.toUpperCase()}". Click "Add New ${selectedScopeFilter.toUpperCase()} Area" below to create one!`}
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
                                <div className="space-y-1">
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
                                  <div className="flex items-center gap-1 text-[10px] pl-5 text-slate-600">
                                    <span className="font-bold">Coats:</span>
                                    <select
                                      value={room.walls?.coats || 2}
                                      onChange={(e) => handleUpdateRoomField(roomIdx, {
                                        walls: { checked: room.walls?.checked !== false, qty: room.walls?.qty ?? 'auto', coats: Number(e.target.value) }
                                      })}
                                      className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                    >
                                      <option value={1}>1 Coat</option>
                                      <option value={2}>2 Coats</option>
                                      <option value={3}>3 Coats</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
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
                                  <div className="flex items-center gap-1 text-[10px] pl-5 text-slate-600">
                                    <span className="font-bold">Coats:</span>
                                    <select
                                      value={room.ceilings?.coats || 2}
                                      onChange={(e) => handleUpdateRoomField(roomIdx, {
                                        ceilings: { checked: !!room.ceilings?.checked, qty: room.ceilings?.qty ?? 'auto', coats: Number(e.target.value) }
                                      })}
                                      className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                    >
                                      <option value={1}>1 Coat</option>
                                      <option value={2}>2 Coats</option>
                                      <option value={3}>3 Coats</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
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
                                  <div className="flex items-center gap-1 text-[10px] pl-5 text-slate-600">
                                    <span className="font-bold">Coats:</span>
                                    <select
                                      value={room.baseboards?.coats || 2}
                                      onChange={(e) => handleUpdateRoomField(roomIdx, {
                                        baseboards: { checked: !!room.baseboards?.checked, qty: room.baseboards?.qty ?? 'auto', coats: Number(e.target.value) }
                                      })}
                                      className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                    >
                                      <option value={1}>1 Coat</option>
                                      <option value={2}>2 Coats</option>
                                      <option value={3}>3 Coats</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                                    <span>Win: {typeof room.windows?.qty === 'number' ? room.windows.qty : 2}</span>
                                    <span>&bull;</span>
                                    <span>Door: {typeof room.doors?.qty === 'number' ? room.doors.qty : 1}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                    <span className="font-bold">Coats:</span>
                                    <select
                                      value={room.windows?.coats || room.doors?.coats || 2}
                                      onChange={(e) => {
                                        const coats = Number(e.target.value);
                                        handleUpdateRoomField(roomIdx, {
                                          windows: { checked: !!room.windows?.checked, qty: room.windows?.qty ?? 2, coats },
                                          doors: { checked: !!room.doors?.checked, qty: room.doors?.qty ?? 1, coats }
                                        });
                                      }}
                                      className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                    >
                                      <option value={1}>1 Coat</option>
                                      <option value={2}>2 Coats</option>
                                      <option value={3}>3 Coats</option>
                                    </select>
                                  </div>
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
                              {selectedScopeFilter === 'interior'
                                ? 'No interior areas found in proposal estimate scope.'
                                : `No rooms found for scope filter "${selectedScopeFilter.toUpperCase()}". Click "Add New ${selectedScopeFilter.toUpperCase()} Area" below to create one!`}
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

                                    {/* Walls Checkbox & SqFt & Coats */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200 space-y-1">
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
                                      </label>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                        <span className="font-bold">Coats:</span>
                                        <select
                                          value={room.walls?.coats || 2}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, {
                                            walls: { checked: room.walls?.checked !== false, qty: room.walls?.qty ?? 'auto', coats: Number(e.target.value) }
                                          })}
                                          className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                        >
                                          <option value={1}>1 Coat</option>
                                          <option value={2}>2 Coats</option>
                                          <option value={3}>3 Coats</option>
                                        </select>
                                      </div>
                                    </td>

                                    {/* Ceiling Checkbox & SqFt & Coats */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200 space-y-1">
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
                                      </label>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                        <span className="font-bold">Coats:</span>
                                        <select
                                          value={room.ceilings?.coats || 2}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, {
                                            ceilings: { checked: !!room.ceilings?.checked, qty: room.ceilings?.qty ?? 'auto', coats: Number(e.target.value) }
                                          })}
                                          className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                        >
                                          <option value={1}>1 Coat</option>
                                          <option value={2}>2 Coats</option>
                                          <option value={3}>3 Coats</option>
                                        </select>
                                      </div>
                                    </td>

                                    {/* Baseboard Checkbox & Coats */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200 space-y-1">
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
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                        <span className="font-bold">Coats:</span>
                                        <select
                                          value={room.baseboards?.coats || 2}
                                          onChange={(e) => handleUpdateRoomField(roomIdx, {
                                            baseboards: { checked: !!room.baseboards?.checked, qty: room.baseboards?.qty ?? 'auto', coats: Number(e.target.value) }
                                          })}
                                          className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                        >
                                          <option value={1}>1 Coat</option>
                                          <option value={2}>2 Coats</option>
                                          <option value={3}>3 Coats</option>
                                        </select>
                                      </div>
                                    </td>

                                    {/* Windows & Doors Quantities & Coats */}
                                    <td className="p-2 sm:p-2.5 border-r border-slate-200 space-y-1 text-[10px]">
                                      <div className="flex items-center justify-between gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Quantity locked from initial estimate">
                                        <span className="text-slate-600 font-bold">Win: {typeof room.windows?.qty === 'number' ? room.windows.qty : 2}</span>
                                        <span className="text-slate-600 font-bold">Door: {typeof room.doors?.qty === 'number' ? room.doors.qty : 1}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                        <span className="font-bold">Coats:</span>
                                        <select
                                          value={room.windows?.coats || room.doors?.coats || 2}
                                          onChange={(e) => {
                                            const coats = Number(e.target.value);
                                            handleUpdateRoomField(roomIdx, {
                                              windows: { checked: !!room.windows?.checked, qty: room.windows?.qty ?? 2, coats },
                                              doors: { checked: !!room.doors?.checked, qty: room.doors?.qty ?? 1, coats }
                                            });
                                          }}
                                          className="bg-white border border-slate-300 rounded px-1 py-0.5 font-bold outline-none cursor-pointer"
                                        >
                                          <option value={1}>1 Coat</option>
                                          <option value={2}>2 Coats</option>
                                          <option value={3}>3 Coats</option>
                                        </select>
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
                  {selectedScopeFilter === 'interior' ? (
                    <div className="p-3 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Interior areas cannot be added directly in Work Orders. Interior scope is locked to proposal estimate details.</span>
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold uppercase border border-slate-300">Scope Fixed</span>
                    </div>
                  ) : (
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
                  )}
                    </div>
                  )}
                </div>

                {/* 6. OPERATIONAL SCOPE SUMMARY & INSTANT CALCULATOR PRICE BREAKDOWN LINK */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 shadow-sm p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono">
                          Work Order Scope & Operational Overview
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Financial formulas, labor rates & margin models have been centralized in the Instant Calculator
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleSaveDocument();
                        if (onNavigateToInstantCalc) {
                          onNavigateToInstantCalc(selectedProject.id);
                        } else {
                          triggerToast('Navigate to Instant Calculator from the top navigation bar');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>View Price Breakdown in Instant Calculator</span>
                    </button>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs text-center">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Scope Category</span>
                      <span className="text-sm font-black text-slate-900 uppercase">{selectedScopeFilter}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Areas</span>
                      <span className="text-sm font-black text-blue-700">{activeRoomsForScope.length} Rooms</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Est. Labor Time</span>
                      <span className="text-sm font-black text-emerald-700">{projectMetrics.totalHours} Hours</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Shopping Line Items</span>
                      <span className="text-sm font-black text-indigo-700">{editableShoppingList.length} Items</span>
                    </div>
                  </div>
                </div>

                {/* 7. SIGNATURE & CLIENT SITE ACCEPTANCE SECTION */}
                <div className="pt-4 border-t-2 border-slate-300 space-y-6 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Site Lead / Supervisor Sign-off */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider block flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Site Lead / Operations Sign-off</span>
                      </span>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">Lead Name / Crew Lead:</label>
                        <input 
                          type="text"
                          value={supervisorName}
                          onChange={(e) => setSupervisorName(e.target.value)}
                          placeholder="Enter site lead name..."
                          className="w-full font-bold text-slate-900 border-b border-slate-400 bg-transparent py-1 outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                        <span className="text-emerald-700 font-bold">✓ Authorized Crew Lead</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Customer Site Acceptance */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Customer Site Acceptance</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSiteSignatureModalOpen(true)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{selectedProject.siteAcceptanceSignatureDataUrl ? 'Update Signature' : 'Sign On Site'}</span>
                        </button>
                      </div>

                      {selectedProject.siteAcceptanceSignatureDataUrl ? (
                        <div className="space-y-2 bg-white p-2.5 rounded-lg border border-emerald-300">
                          <img
                            src={selectedProject.siteAcceptanceSignatureDataUrl}
                            alt="Customer Acceptance Signature"
                            className="h-14 max-w-full object-contain mx-auto border-b border-slate-200 pb-1"
                          />
                          <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold">
                            <span>Signed by: {selectedProject.siteAcceptedBy || clientName || 'Customer'}</span>
                            <span>{selectedProject.siteAcceptanceDate ? new Date(selectedProject.siteAcceptanceDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsSiteSignatureModalOpen(true)}
                          className="h-16 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 cursor-pointer transition"
                        >
                          <span className="text-[11px] font-bold">Click here to capture customer sign-off</span>
                          <span className="text-[9px]">Confirm completed scope with customer on site</span>
                        </div>
                      )}

                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Client Signature Status: <strong className={selectedProject.siteAcceptanceSignatureDataUrl ? 'text-emerald-700' : 'text-amber-700'}>{selectedProject.siteAcceptanceSignatureDataUrl ? 'ACCEPTED' : 'PENDING'}</strong></span>
                        <span>Date: {selectedProject.siteAcceptanceDate ? new Date(selectedProject.siteAcceptanceDate).toLocaleDateString() : 'Pending'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3.5 rounded-xl text-center text-[10px] text-slate-600 space-y-0.5 border border-slate-200">
                    <p className="font-bold text-slate-800 tracking-wide uppercase">CAPSTONE PAINTING INC. &bull; QUALITY ASSURANCE & SITE COMPLETION GUARANTEE</p>
                    <p>All work is executed according to professional painting standards using premium materials. Customer signature confirms work was reviewed and approved.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Control Footer Bar */}
            <div className="p-4 sm:px-6 border-t border-neutral-800 bg-[#111111] flex flex-wrap items-center justify-between gap-3 no-print">
              <span className="text-xs text-zinc-400 font-mono">
                PaintCRM Interactive Document Engine &bull; Official Work Order {getWorkOrderNumber(selectedProject.id, selectedScopeFilter)}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareWorkerModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Email / Share to Workers</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer border border-neutral-700"
                >
                  Print Document
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

      {/* CUSTOMER SITE ACCEPTANCE SIGNATURE MODAL */}
      {isSiteSignatureModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl text-white font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Customer Site Acceptance Sign-off</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSiteSignatureModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Please have the customer sign below to confirm that all completed scope, areas, and surfaces for project <strong className="text-white">{selectedProject.name}</strong> have been inspected and accepted.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-bold uppercase block">Customer / Signer Full Name:</label>
              <input
                type="text"
                value={typedSignerName}
                onChange={(e) => setTypedSignerName(e.target.value)}
                placeholder="Enter customer name..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Signature Canvas Pad */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400 font-bold uppercase block">Digital Signature (Draw or Sign):</label>
                <button
                  type="button"
                  onClick={clearSiteSignatureCanvas}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                >
                  Clear Signature Pad
                </button>
              </div>

              <div className="bg-white rounded-xl border border-neutral-700 overflow-hidden touch-none relative">
                <canvas
                  ref={sigCanvasRef}
                  width={460}
                  height={150}
                  onMouseDown={handleSigStart}
                  onMouseMove={handleSigDraw}
                  onMouseUp={handleSigEnd}
                  onMouseLeave={handleSigEnd}
                  onTouchStart={handleSigStart}
                  onTouchMove={handleSigDraw}
                  onTouchEnd={handleSigEnd}
                  className="w-full h-[150px] bg-white cursor-crosshair"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 select-none pointer-events-none">
                  Sign above with finger or stylus
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsSiteSignatureModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomerSiteSignature}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Customer Acceptance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE / EMAIL WORK ORDER TO WORKERS MODAL */}
      {isShareWorkerModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl text-white font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Email & Share Work Order to Workers</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareWorkerModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Workers and crew leads can access this work order directly on mobile or tablet, view room dimensions and prep notes, and obtain customer site acceptance signatures upon job completion.
            </p>

            <div className="space-y-3 bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-bold uppercase">Work Order Link:</span>
                <button
                  type="button"
                  onClick={() => {
                    const directUrl = `${window.location.origin}${window.location.pathname}?workOrder=${selectedProject.id}&scope=${selectedScopeFilter}`;
                    navigator.clipboard.writeText(directUrl);
                    triggerToast('Copied Work Order Link to clipboard!');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Direct URL</span>
                </button>
              </div>

              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?workOrder=${selectedProject.id}&scope=${selectedScopeFilter}`}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-zinc-300 font-mono select-all"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs text-zinc-400 font-bold uppercase block">Quick Email Crew Dispatch:</span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Work Order: ${selectedProject.name} (${selectedScopeFilter.toUpperCase()})`)}&body=${encodeURIComponent(
                    `Hello Crew,\n\nPlease find the active Work Order for ${selectedProject.name} (${clientAddress || 'Client Site'}).\n\nScope: ${selectedScopeFilter.toUpperCase()}\nAreas: ${activeRoomsForScope.length} Rooms\nEst. Labor Hours: ${projectMetrics.totalHours} hrs\n\nOnline Work Order & Customer Site Acceptance Link:\n${window.location.origin}${window.location.pathname}?workOrder=${selectedProject.id}&scope=${selectedScopeFilter}\n\nPlease review all site preparation, room notes, and obtain customer sign-off upon completion.\n\nThank you,\nCapstone Painting Operations`
                  )}`}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md flex-1 justify-center"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Email App (Dispatch to Crew)</span>
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsShareWorkerModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
