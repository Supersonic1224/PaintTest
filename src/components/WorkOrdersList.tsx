import React, { useState, useMemo } from 'react';
import { ProjectDetails, ClientLead, RoomSpec, SurfaceTask, ProjectTask, PaintColor } from '../types';
import { 
  Wrench, 
  CheckCircle, 
  Circle, 
  ClipboardList, 
  X, 
  Printer, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  DollarSign, 
  Package, 
  FileText,
  Layers,
  ListTodo,
  Building2,
  Check,
  ShieldCheck,
  Edit3,
  Plus,
  Trash2,
  Save,
  PlusCircle,
  Tag,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Calculator,
  Info
} from 'lucide-react';

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
  onSelectProjectForFullEdit,
}: WorkOrdersListProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  
  // EDITING MODAL STATE
  const [editingProject, setEditingProject] = useState<ProjectDetails | null>(null);
  const [editTab, setEditTab] = useState<'items' | 'financials' | 'products' | 'crew' | 'tasks'>('items');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // DRAFT EDIT FIELDS
  const [draftRooms, setDraftRooms] = useState<RoomSpec[]>([]);
  const [draftLabor, setDraftLabor] = useState<number>(0);
  const [draftMaterial, setDraftMaterial] = useState<number>(0);
  const [draftTaxRate, setDraftTaxRate] = useState<number>(0.13);
  const [draftDiscount, setDraftDiscount] = useState<number>(0);
  const [draftTotalPrice, setDraftTotalPrice] = useState<number>(0);
  const [draftTeamNotes, setDraftTeamNotes] = useState<string>('');
  const [draftSpecialConditions, setDraftSpecialConditions] = useState<string>('');
  const [draftDescription, setDraftDescription] = useState<string>('');
  const [draftTasks, setDraftTasks] = useState<ProjectTask[]>([]);

  // FORM INPUTS FOR ADDING NEW SCOPE ITEM / OPTION
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<'interior' | 'exterior' | 'deck'>('interior');
  const [newItemIsOption, setNewItemIsOption] = useState<boolean>(false);
  const [newItemLength, setNewItemLength] = useState<number>(12);
  const [newItemWidth, setNewItemWidth] = useState<number>(10);
  const [newItemHeight, setNewItemHeight] = useState<number>(8);
  const [newItemWallPaint, setNewItemWallPaint] = useState<string>('Benjamin Moore Regal Select Eggshell');

  // FORM INPUTS FOR ADDING NEW PRODUCT SPECIFICATION
  const [newProdBrand, setNewProdBrand] = useState<string>('Benjamin Moore');
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdColorCode, setNewProdColorCode] = useState<string>('');
  const [newProdFinish, setNewProdFinish] = useState<'Flat' | 'Eggshell' | 'Satin' | 'Semi-Gloss' | 'Gloss'>('Eggshell');
  const [newProdDesc, setNewProdDesc] = useState<string>('');

  // FORM INPUTS FOR ADDING NEW TASK
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [newTaskIsOption, setNewTaskIsOption] = useState<boolean>(false);

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

  // Start Editing a Work Order
  const handleStartEditing = (proj: ProjectDetails) => {
    setSelectedProject(null);
    setEditingProject(proj);
    setDraftRooms(proj.rooms ? JSON.parse(JSON.stringify(proj.rooms)) : []);
    setDraftLabor(proj.summary?.laborCost || 0);
    setDraftMaterial(proj.summary?.materialCost || 0);
    setDraftTaxRate(proj.summary?.taxRate ?? 0.13);
    setDraftDiscount(proj.summary?.discount || 0);
    setDraftTotalPrice(proj.summary?.totalPrice || 0);
    setDraftTeamNotes(proj.teamNotes || '');
    setDraftSpecialConditions(proj.specialConditions || '');
    setDraftDescription(proj.description || '');
    setDraftTasks(proj.tasks ? JSON.parse(JSON.stringify(proj.tasks)) : []);
    setEditTab('items');
  };

  // Calculate detailed costs, hours, and area metrics for selected project
  const projectMetrics = useMemo(() => {
    if (!selectedProject) return { 
      laborCost: 0, 
      materialCost: 0, 
      totalHours: 0, 
      subtotal: 0, 
      hst: 0, 
      totalCost: 0, 
      productsList: [],
      wallArea: 0,
      ceilingArea: 0,
      floorArea: 0,
      trimLnft: 0
    };

    const rooms = selectedProject.rooms || [];
    let wallArea = 0;
    let ceilingArea = 0;
    let floorArea = 0;
    let trimLnft = 0;
    let totalItemsQty = 0;
    const productsSet = new Set<string>();

    rooms.forEach(r => {
      const l = r.length || 0;
      const w = r.width || 0;
      const h = r.height || 8;

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
        if (r.doorFrames?.checked) totalItemsQty += (typeof r.doorFrames.qty === 'number' ? r.doorFrames.qty : 2);
      }

      if (r.wallPaintType) productsSet.add(r.wallPaintType);

      if (r.paints && r.paints.length > 0) {
        r.paints.forEach(p => {
          if (p.brand || p.colorName) {
            productsSet.add(`${p.brand || 'Benjamin Moore'} ${p.colorName || ''} (${p.finish || 'Eggshell'})`.trim());
          }
        });
      }
    });

    const totalSqFt = wallArea + ceilingArea;
    const laborCost = selectedProject.summary?.laborCost ?? Math.round((totalSqFt * 1.85) + (totalItemsQty * 45));
    const materialCost = selectedProject.summary?.materialCost ?? Math.round((totalSqFt * 0.45) + (totalItemsQty * 12));
    const totalHours = Math.max(8, Math.round((laborCost / 65) * 10) / 10);
    const subtotal = laborCost + materialCost - (selectedProject.summary?.discount || 0);
    const taxRate = selectedProject.summary?.taxRate ?? 0.13; // 13% HST
    const hst = Math.round(subtotal * taxRate * 100) / 100;
    const totalCost = selectedProject.summary?.totalPrice ?? Math.round(subtotal + hst);

    const productsList = Array.from(productsSet);

    return {
      laborCost,
      materialCost,
      totalHours,
      subtotal,
      hst,
      totalCost,
      productsList,
      wallArea,
      ceilingArea,
      floorArea,
      trimLnft
    };
  }, [selectedProject]);

  // Recalculate draft financials from draft rooms
  const handleRecalculateDraftFinancials = () => {
    let wallSqFt = 0;
    let ceilingSqFt = 0;
    draftRooms.forEach(r => {
      if (!r.isOption) {
        const l = Number(r.length) || 0;
        const w = Number(r.width) || 0;
        const h = Number(r.height) || 8;
        wallSqFt += r.wallsArea || (2 * h * (l + w));
        ceilingSqFt += r.ceilingArea || (l * w);
      }
    });
    const totalSqFt = wallSqFt + ceilingSqFt;
    const calcLabor = Math.round(totalSqFt * 1.85);
    const calcMat = Math.round(totalSqFt * 0.45);
    const subtotal = calcLabor + calcMat - (draftDiscount || 0);
    const calcHst = Math.round(subtotal * draftTaxRate * 100) / 100;
    const calcTotal = Math.round((subtotal + calcHst) * 100) / 100;

    setDraftLabor(calcLabor);
    setDraftMaterial(calcMat);
    setDraftTotalPrice(calcTotal);
    triggerToast('Financials recalculated based on scope dimensions!');
  };

  // Add new scope item / option
  const handleAddScopeItem = () => {
    if (!newItemName.trim()) {
      alert('Please enter a scope item name or title.');
      return;
    }
    const l = Number(newItemLength) || 12;
    const w = Number(newItemWidth) || 10;
    const h = Number(newItemHeight) || 8;
    const wallsArea = 2 * h * (l + w);
    const ceilingArea = l * w;

    const newRoom: RoomSpec = {
      id: 'room-' + Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      category: newItemCategory,
      isOption: newItemIsOption,
      length: l,
      width: w,
      height: h,
      wallsArea,
      ceilingArea,
      wallPaintType: newItemWallPaint,
      walls: { checked: true, qty: 'auto', coats: 2 },
      ceilings: { checked: false, qty: 'auto', coats: 2 },
      baseboards: { checked: false, qty: 'auto', coats: 2 },
      surfaceTasks: [
        { id: 'st-1', text: 'Protect floors with clean drop cloths and plastic sheeting', completed: false },
        { id: 'st-2', text: 'Patch drywall cracks/holes with compound and sand flush', completed: false },
        { id: 'st-3', text: 'Apply 2 coats of premium low-VOC paint to specified surfaces', completed: false }
      ],
      paints: [
        {
          brand: 'Benjamin Moore',
          colorName: newItemWallPaint,
          colorCode: 'Custom',
          hex: '#ffffff',
          finish: 'Eggshell',
          surface: 'walls',
          coats: 2,
          gallonsNeeded: Math.ceil(wallsArea / 350)
        }
      ]
    };

    const updatedRooms = [...draftRooms, newRoom];
    setDraftRooms(updatedRooms);
    setNewItemName('');
    setNewItemIsOption(false);
    triggerToast(`Added "${newRoom.name}" ${newItemIsOption ? '(Option)' : ''} to work order scope!`);
  };

  // Add new product spec to draft room paints
  const handleAddProductSpec = () => {
    if (!newProdName.trim()) {
      alert('Please enter a product or paint name.');
      return;
    }
    if (draftRooms.length === 0) {
      alert('Please create at least one scope item or room first to attach product specifications.');
      return;
    }
    const updatedRooms = draftRooms.map((r, idx) => {
      if (idx === 0) {
        const paints = r.paints ? [...r.paints] : [];
        paints.push({
          brand: newProdBrand,
          colorName: newProdName.trim(),
          colorCode: newProdColorCode.trim() || 'Std',
          hex: '#ffffff',
          finish: newProdFinish,
          surface: 'walls',
          coats: 2,
          gallonsNeeded: 2
        });
        return {
          ...r,
          paints,
          wallPaintType: `${newProdBrand} ${newProdName.trim()} (${newProdFinish})`
        };
      }
      return r;
    });
    setDraftRooms(updatedRooms);
    setNewProdName('');
    setNewProdColorCode('');
    setNewProdDesc('');
    triggerToast('Added product specification to work order materials list!');
  };

  // Save all Work Order edits
  const handleSaveWorkOrderEdits = () => {
    if (!editingProject) return;

    const updatedProject: ProjectDetails = {
      ...editingProject,
      rooms: draftRooms,
      summary: {
        laborCost: Number(draftLabor) || 0,
        materialCost: Number(draftMaterial) || 0,
        taxRate: Number(draftTaxRate) || 0.13,
        discount: Number(draftDiscount) || 0,
        totalPrice: Number(draftTotalPrice) || 0,
      },
      teamNotes: draftTeamNotes,
      specialConditions: draftSpecialConditions,
      description: draftDescription,
      tasks: draftTasks,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveProject) {
      onSaveProject(updatedProject);
    }

    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }

    setEditingProject(null);
    triggerToast(`Work Order WO-#${updatedProject.id} updated and saved successfully!`);
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-emerald-100 border border-emerald-700 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-mono text-xs animate-slide-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Print Style Injector */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-work-order-document, #official-work-order-document * {
            visibility: visible;
          }
          #official-work-order-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            <span>Work Orders & Operational Schedules</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">View, customize, add items, configure options, adjust prices, edit product descriptions, and print operational work order documents.</p>
        </div>
        <span className="text-zinc-400 text-xs font-mono font-bold px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-xl shrink-0 self-start sm:self-auto">
          {activeWorkJobs.length} Active Work Order{activeWorkJobs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid of Work Order Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeWorkJobs.length === 0 ? (
          <div className="col-span-2 py-16 text-center bg-neutral-900/60 border border-neutral-800 rounded-2xl text-zinc-500 font-medium h-52 flex flex-col justify-center items-center gap-2">
            <ClipboardList className="w-10 h-10 text-zinc-600 mb-1" />
            <p className="text-sm text-zinc-400 font-bold font-mono">No active work orders found</p>
            <p className="text-xs text-zinc-600 max-w-md">Once proposals are drafted or accepted, operational work orders populate here for crew dispatch and editing.</p>
          </div>
        ) : (
          activeWorkJobs.map(p => {
            const client = clients.find(c => c.id === p.clientId);
            const totalTasks = p.tasks.length;
            const completedTasks = p.tasks.filter(t => t.completed).length;
            const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
            const optionCount = (p.rooms || []).filter(r => r.isOption).length;

            return (
              <div 
                key={p.id} 
                className="bg-neutral-900/80 hover:bg-neutral-850/90 border border-neutral-800 hover:border-blue-500/60 rounded-2xl p-5 space-y-4 transition-all duration-200 group shadow-md hover:shadow-xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between border-b border-neutral-800 pb-3 gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider font-mono bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
                        WO-#{p.id}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                        {p.status === 'Approved' ? 'PAID / APPROVED' : p.status}
                      </span>
                      {optionCount > 0 && (
                        <span className="text-[10px] text-amber-400 font-bold font-mono uppercase bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-400" />
                          <span>{optionCount} Option{optionCount > 1 ? 's' : ''}</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition mt-2">
                      {client?.name || p.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span>{client?.address || 'No physical site specified'}</span>
                    </p>
                  </div>

                  {/* Edit Work Order Quick Button */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-emerald-400 font-bold font-mono py-1 px-3 bg-emerald-950/40 border border-emerald-800/60 rounded-full">
                      {percentage}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditing(p);
                      }}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-500 text-blue-400 hover:text-white rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Edit items, options, prices, and product descriptions"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit WO</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                    <span>Task Completion</span>
                    <span>{completedTasks}/{totalTasks} items</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 border border-neutral-800 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                  </div>
                </div>

                {/* Scope & Options Summary */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                    <span>Operational Scope Items</span>
                    <span>{(p.rooms || []).length} Area{(p.rooms || []).length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1.5 bg-neutral-950/60 border border-neutral-850 p-2.5 rounded-xl max-h-[120px] overflow-y-auto font-mono text-xs">
                    {(p.rooms || []).length === 0 ? (
                      <div className="text-[11px] italic text-zinc-500 py-1">
                        No custom items configured. Click "Edit WO" to add items and options.
                      </div>
                    ) : (
                      p.rooms.map(r => (
                        <div key={r.id} className="flex items-center justify-between text-zinc-300 border-b border-neutral-850/60 pb-1 last:border-none">
                          <span className="truncate flex items-center gap-1.5">
                            <span className="text-zinc-500">&bull;</span>
                            <span className={r.isOption ? 'text-amber-300 font-semibold' : ''}>{r.name}</span>
                            {r.isOption && (
                              <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded uppercase">
                                Option
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                            {r.wallsArea || (2 * (r.height || 8) * ((r.length || 0) + (r.width || 0)))} sqft
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Card Footer prompt */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400 group-hover:text-blue-300 transition">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(p)}
                    className="flex items-center gap-1.5 hover:text-white transition cursor-pointer text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>View Official Printable Document</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEditing(p)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                    >
                      Edit Order
                    </button>
                    <span className="text-zinc-600 group-hover:text-blue-400 font-bold">&rarr;</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT WORK ORDER MODAL OVERLAY */}
      {editingProject && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl text-left font-sans flex flex-col my-auto no-print text-xs">
            
            {/* Modal Control Header */}
            <div className="sticky top-0 z-20 bg-[#111111] border-b border-neutral-800 p-4 sm:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-950 border border-blue-800 rounded-xl text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    Edit Work Order Specification
                    <span className="text-[10px] bg-blue-950 border border-blue-800 text-blue-400 font-mono px-2 py-0.5 rounded uppercase font-bold">
                      WO-#{editingProject.id}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">Add scope items, configure options, update pricing, and edit product descriptions.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSelectProjectForFullEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const pId = editingProject.id;
                      setEditingProject(null);
                      onSelectProjectForFullEdit(pId);
                    }}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-zinc-300 font-mono text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-neutral-700"
                    title="Open in full project estimator view"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Full Estimator</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveWorkOrderEdits}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
                  title="Close Editor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto font-mono text-xs">
              <button
                type="button"
                onClick={() => setEditTab('items')}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold ${
                  editTab === 'items'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-950 border border-neutral-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Items & Options ({draftRooms.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('financials')}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold ${
                  editTab === 'financials'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-950 border border-neutral-800 text-zinc-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Prices & HST (${draftTotalPrice.toLocaleString()})</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('products')}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold ${
                  editTab === 'products'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-950 border border-neutral-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Product Descriptions</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('crew')}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold ${
                  editTab === 'crew'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-950 border border-neutral-800 text-zinc-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Crew & Site Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('tasks')}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-bold ${
                  editTab === 'tasks'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-950 border border-neutral-800 text-zinc-400 hover:text-white'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Master Tasks ({draftTasks.length})</span>
              </button>
            </div>

            {/* TAB CONTENT BODY */}
            <div className="p-4 sm:p-6 space-y-6">

              {/* TAB 1: ITEMS & OPTIONS */}
              {editTab === 'items' && (
                <div className="space-y-6">
                  {/* Form to Add Scope Item or Option */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-blue-400" />
                        <span>Add New Scope Item or Optional Extra</span>
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer select-none font-mono bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-lg text-amber-300 font-bold">
                        <input
                          type="checkbox"
                          checked={newItemIsOption}
                          onChange={(e) => setNewItemIsOption(e.target.checked)}
                          className="w-4 h-4 text-amber-500 rounded border-neutral-800 focus:ring-amber-500"
                        />
                        <span>Mark as Optional Add-on</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Item / Scope Title</label>
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="e.g. Living Room Accent Wall, Garage Trim, Deck Stain Option..."
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Category</label>
                        <select
                          value={newItemCategory}
                          onChange={(e) => setNewItemCategory(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono cursor-pointer"
                        >
                          <option value="interior">Interior Painting</option>
                          <option value="exterior">Exterior Coating</option>
                          <option value="deck">Deck & Fence Stain</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Length (ft)</label>
                        <input
                          type="number"
                          value={newItemLength}
                          onChange={(e) => setNewItemLength(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Width (ft)</label>
                        <input
                          type="number"
                          value={newItemWidth}
                          onChange={(e) => setNewItemWidth(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Height (ft)</label>
                        <input
                          type="number"
                          value={newItemHeight}
                          onChange={(e) => setNewItemHeight(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-3">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Paint / Product Description</label>
                        <input
                          type="text"
                          value={newItemWallPaint}
                          onChange={(e) => setNewItemWallPaint(e.target.value)}
                          placeholder="e.g. Benjamin Moore Regal Select Eggshell (2 Coats)"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddScopeItem}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Item to Work Order</span>
                      </button>
                    </div>
                  </div>

                  {/* Existing Scope Items & Options List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center justify-between">
                      <span>Configured Scope Items & Options ({draftRooms.length})</span>
                      <span className="text-zinc-500 text-[10px]">Toggle options or edit item specs</span>
                    </h4>

                    {draftRooms.length === 0 ? (
                      <p className="text-zinc-500 italic font-mono py-4 text-center bg-neutral-900 rounded-xl border border-neutral-850">
                        No scope items configured yet. Add your first item above.
                      </p>
                    ) : (
                      draftRooms.map((room, index) => {
                        const sqft = room.wallsArea || (2 * (room.height || 8) * ((room.length || 0) + (room.width || 0)));
                        return (
                          <div 
                            key={room.id || index}
                            className={`p-4 rounded-2xl border space-y-3 transition-all ${
                              room.isOption 
                                ? 'bg-amber-950/20 border-amber-800/60' 
                                : 'bg-neutral-900 border-neutral-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-zinc-500 text-[11px]">{index + 1}.</span>
                                <input
                                  type="text"
                                  value={room.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDraftRooms(draftRooms.map((r, i) => i === index ? { ...r, name: val } : r));
                                  }}
                                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white font-bold font-mono outline-none focus:border-blue-500"
                                />
                                {room.isOption && (
                                  <span className="text-[9px] bg-amber-950 border border-amber-700 text-amber-300 font-mono font-bold px-2 py-0.5 rounded uppercase">
                                    Option Add-On
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Option toggle */}
                                <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-zinc-400 select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!room.isOption}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setDraftRooms(draftRooms.map((r, i) => i === index ? { ...r, isOption: checked } : r));
                                    }}
                                    className="w-3.5 h-3.5 text-amber-500 rounded border-neutral-800"
                                  />
                                  <span>Is Option</span>
                                </label>

                                {/* Delete button */}
                                <button
                                  type="button"
                                  onClick={() => setDraftRooms(draftRooms.filter((_, i) => i !== index))}
                                  className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-neutral-800 transition cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Item Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 font-mono text-xs">
                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase block">Length (ft)</span>
                                <input
                                  type="number"
                                  value={room.length || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDraftRooms(draftRooms.map((r, i) => i === index ? { ...r, length: val, wallsArea: 2 * (r.height || 8) * (val + (r.width || 0)) } : r));
                                  }}
                                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-white outline-none"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase block">Width (ft)</span>
                                <input
                                  type="number"
                                  value={room.width || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDraftRooms(draftRooms.map((r, i) => i === index ? { ...r, width: val, wallsArea: 2 * (r.height || 8) * ((r.length || 0) + val) } : r));
                                  }}
                                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-white outline-none"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase block">Calculated SqFt</span>
                                <div className="p-1.5 bg-neutral-950 border border-neutral-850 rounded-lg text-zinc-400 font-bold">
                                  {sqft} sqft
                                </div>
                              </div>

                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase block">Paint Product Specification</span>
                                <input
                                  type="text"
                                  value={room.wallPaintType || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDraftRooms(draftRooms.map((r, i) => i === index ? { ...r, wallPaintType: val } : r));
                                  }}
                                  placeholder="e.g. Regal Select Eggshell"
                                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-white outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCIALS & PRICING */}
              {editTab === 'financials' && (
                <div className="space-y-6">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <div>
                        <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span>Financial Budget & Pricing Adjustments</span>
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Override labor, materials, HST, discounts, or auto-recalculate based on scope items.</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRecalculateDraftFinancials}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Recalculate from SqFt</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Labor Cost ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-zinc-500 font-mono font-bold">$</span>
                          <input
                            type="number"
                            value={draftLabor}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftLabor(val);
                              const sub = val + draftMaterial - draftDiscount;
                              setDraftTotalPrice(Math.round((sub + (sub * draftTaxRate)) * 100) / 100);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 pl-8 text-xs text-white outline-none font-mono focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Material & Paint Cost ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-zinc-500 font-mono font-bold">$</span>
                          <input
                            type="number"
                            value={draftMaterial}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftMaterial(val);
                              const sub = draftLabor + val - draftDiscount;
                              setDraftTotalPrice(Math.round((sub + (sub * draftTaxRate)) * 100) / 100);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 pl-8 text-xs text-white outline-none font-mono focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Tax Rate / HST (Decimal, e.g. 0.13 for 13%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={draftTaxRate}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftTaxRate(val);
                              const sub = draftLabor + draftMaterial - draftDiscount;
                              setDraftTotalPrice(Math.round((sub + (sub * val)) * 100) / 100);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 text-xs text-white outline-none font-mono pr-12 focus:border-blue-500"
                          />
                          <span className="absolute right-3 top-2.5 text-zinc-500 font-mono font-bold">{(draftTaxRate * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Discount ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-zinc-500 font-mono font-bold">$</span>
                          <input
                            type="number"
                            value={draftDiscount}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDraftDiscount(val);
                              const sub = draftLabor + draftMaterial - val;
                              setDraftTotalPrice(Math.round((sub + (sub * draftTaxRate)) * 100) / 100);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 pl-8 text-xs text-white outline-none font-mono focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Grand Total Price ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-emerald-500 font-mono font-bold">$</span>
                          <input
                            type="number"
                            value={draftTotalPrice}
                            onChange={(e) => setDraftTotalPrice(Number(e.target.value))}
                            className="w-full bg-neutral-950 border border-emerald-500/50 rounded-xl p-2.5 pl-8 text-sm font-bold text-emerald-400 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCT DESCRIPTIONS */}
              {editTab === 'products' && (
                <div className="space-y-6">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2">
                      <Package className="w-4 h-4 text-purple-400" />
                      <span>Add Product Specification / Material Description</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Manufacturer / Brand</label>
                        <input
                          type="text"
                          value={newProdBrand}
                          onChange={(e) => setNewProdBrand(e.target.value)}
                          placeholder="e.g. Benjamin Moore, Sherwin-Williams"
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 text-white outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Product Name</label>
                        <input
                          type="text"
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="e.g. Regal Select, Emerald, Woodlux"
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 text-white outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Sheen / Finish</label>
                        <select
                          value={newProdFinish}
                          onChange={(e) => setNewProdFinish(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 text-white outline-none cursor-pointer"
                        >
                          <option value="Flat">Flat / Matte</option>
                          <option value="Eggshell">Eggshell</option>
                          <option value="Satin">Satin</option>
                          <option value="Semi-Gloss">Semi-Gloss</option>
                          <option value="Gloss">High Gloss</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddProductSpec}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Product Specification</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CREW & SITE NOTES */}
              {editTab === 'crew' && (
                <div className="space-y-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2">
                    <ClipboardList className="w-4 h-4 text-amber-400" />
                    <span>Crew Instructions & Site Notes</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Special Site Instructions & Crew Notes (`teamNotes`)</label>
                    <textarea
                      rows={4}
                      value={draftTeamNotes}
                      onChange={(e) => setDraftTeamNotes(e.target.value)}
                      placeholder="Enter special access codes, lockbox details, floor protection mandates, or crew instructions..."
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white outline-none font-mono focus:border-blue-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Work Order Scope Description (`description`)</label>
                    <textarea
                      rows={3}
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      placeholder="Overall project scope overview..."
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white outline-none font-mono focus:border-blue-500 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: MASTER TASKS */}
              {editTab === 'tasks' && (
                <div className="space-y-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h4 className="font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-blue-400" />
                      <span>Master Operational Tasks Checklist ({draftTasks.length})</span>
                    </h4>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder="Add new checklist task..."
                      className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTaskText.trim()) return;
                        setDraftTasks([...draftTasks, { id: 'task-' + Math.random().toString(36).substr(2, 6), text: newTaskText.trim(), completed: false }]);
                        setNewTaskText('');
                        triggerToast('Added task to master checklist!');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Add Task
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {draftTasks.map((t, idx) => (
                      <div key={t.id || idx} className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-xl border border-neutral-850 font-mono text-xs">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDraftTasks(draftTasks.map((tk, i) => i === idx ? { ...tk, completed: checked } : tk));
                            }}
                            className="w-4 h-4 text-blue-500 rounded border-neutral-800"
                          />
                          <span className={t.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}>{t.text}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setDraftTasks(draftTasks.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Control Footer */}
            <div className="p-4 sm:px-6 border-t border-neutral-800 bg-[#111111] flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">
                PaintCRM Editor &bull; WO-#{editingProject.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveWorkOrderEdits}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Work Order Changes</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* OFFICIAL WORK ORDER DOCUMENT MODAL OVERLAY */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[96vh] overflow-y-auto shadow-2xl text-left font-sans flex flex-col my-auto no-print">
            
            {/* Modal Control Toolbar */}
            <div className="sticky top-0 z-20 bg-[#111111] border-b border-neutral-800 p-4 sm:px-6 flex items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-950 border border-blue-800 rounded-xl text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Official Document Preview
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono px-2 py-0.5 rounded uppercase font-bold">
                      Print Ready
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">Work Order WO-#{selectedProject.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEditing(selectedProject)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Work Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer border border-neutral-700"
                  title="Print Official Work Order Document"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DOCUMENT CANVAS CONTAINER (PAPER STYLED OFFICIAL DOCUMENT) */}
            <div className="p-4 sm:p-8 bg-zinc-900/80 flex justify-center">
              <div 
                id="official-work-order-document"
                className="bg-white text-slate-900 w-full rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 space-y-6 font-sans text-xs select-text leading-normal"
              >
                
                {/* 1. DOCUMENT BRANDING & HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
                  {/* Left: Company Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm">
                        CP
                      </div>
                      <h1 className="text-lg font-black tracking-tight text-slate-900 font-serif uppercase">
                        Capstone Painting Inc.
                      </h1>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed pt-1">
                      124 Commercial Street, Suite 200<br />
                      Guelph, ON, N1C 0A2<br />
                      Phone: (226) 499-0079 &bull; GST/HST: 79421 8295 RT0001
                    </p>
                  </div>

                  {/* Center: Manager / Owner Info */}
                  <div className="space-y-1 text-slate-700 font-medium">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">Job Supervisor</span>
                    <p className="font-bold text-slate-900 text-xs">Daniel Rust, Operations Owner</p>
                    <p className="text-[11px] text-slate-600">Direct: (226) 499-0079</p>
                    <p className="text-[11px] text-slate-600">Email: daniel@capstonepainting.ca</p>
                  </div>

                  {/* Right: Work Order Official Stamp & Badge */}
                  <div className="sm:text-right space-y-2 shrink-0">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wider font-mono">
                        WORK ORDER
                      </h2>
                      <p className="text-xs font-bold font-mono text-slate-600 mt-0.5">
                        NO: <span className="text-blue-700">WO-#{selectedProject.id}</span>
                      </p>
                    </div>

                    {/* Official PAID / APPROVED Status Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-600 text-emerald-800 rounded-full font-black text-[11px] uppercase tracking-wider shadow-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>{selectedProject.status === 'Approved' ? 'PAID / APPROVED' : selectedProject.status}</span>
                    </div>
                  </div>
                </div>

                {/* 2. FOUR-COLUMN CLIENT & JOB METADATA TABLE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-300 rounded-xl p-4 font-sans text-xs">
                  {/* Contact Info */}
                  <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-mono">
                      Contact Information
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{selectedClient?.name || 'Valued Client'}</p>
                    <p className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{selectedClient?.phone || '(555) 000-0000'}</span>
                    </p>
                    <p className="text-slate-700 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{selectedClient?.email || 'client@example.com'}</span>
                    </p>
                  </div>

                  {/* Job Site Location */}
                  <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-mono">
                      Job Site Address
                    </span>
                    <p className="font-bold text-slate-900 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{selectedClient?.address || 'No physical site specified'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono pt-1">
                      Access: Keylock Box / On-site contact
                    </p>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-mono">
                      Order Specifications
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 text-[11px] font-mono">
                      <span className="text-slate-500">Date Issued:</span>
                      <span className="font-bold text-slate-900 text-right">{new Date(selectedProject.createdAt || Date.now()).toLocaleDateString()}</span>
                      <span className="text-slate-500">Total Hours:</span>
                      <span className="font-bold text-blue-700 text-right">{projectMetrics.totalHours} hrs</span>
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-emerald-700 text-right uppercase">{selectedProject.status}</span>
                    </div>
                  </div>
                </div>

                {/* 3. CREW NOTES & FINANCIAL BUDGET BOX */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-slate-700" />
                      <span>Crew Note & Financial Budget Breakdown</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-600 font-bold">Official Estimate Summary</span>
                  </div>

                  <div className="p-4 space-y-3 bg-white">
                    {/* Compact Financial Line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs">
                      <div className="flex flex-wrap items-center gap-4 text-slate-800">
                        <span><strong>L:</strong> ${projectMetrics.laborCost.toLocaleString()}</span>
                        <span className="text-slate-300">|</span>
                        <span><strong>M:</strong> ${projectMetrics.materialCost.toLocaleString()}</span>
                        <span className="text-slate-300">|</span>
                        <span><strong>Labour and Materials:</strong> ${projectMetrics.subtotal.toLocaleString()} plus HST</span>
                        <span className="text-slate-300">|</span>
                        <span><strong>Total HST ({( (selectedProject.summary?.taxRate ?? 0.13) * 100 ).toFixed(0)}%):</strong> ${projectMetrics.hst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="bg-slate-900 text-white font-bold px-3 py-1 rounded text-sm font-mono shrink-0">
                        Total: ${projectMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Site Access & Crew Instructions */}
                    {(selectedProject.teamNotes || selectedProject.specialConditions || selectedProject.description) && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 font-mono block">
                          Special Site Instructions & Crew Notes:
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                          {selectedProject.teamNotes || selectedProject.specialConditions || selectedProject.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. PRODUCT DESCRIPTION & SPECIFICATIONS */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-700" />
                      <span>Product Specifications & Paint Descriptions</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-600 font-bold">Material Supplies</span>
                  </div>

                  <div className="p-4 space-y-3 bg-white">
                    {projectMetrics.productsList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                        {projectMetrics.productsList.map((prod, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                            <span className="font-bold text-slate-900">{prod}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                              Standard
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600 italic font-mono text-xs">
                        Standard Premium Benjamin Moore / Sherwin-Williams Low-VOC Latex Primers & Paints specified.
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. TOTAL DIMENSIONS METRICS SUMMARY */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-700" />
                      <span>Total Dimensions (sqft / lnft)</span>
                    </h3>
                  </div>

                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Walls Area</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">{projectMetrics.wallArea.toFixed(2)} sq ft</span>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Ceilings Area</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">{projectMetrics.ceilingArea.toFixed(2)} sq ft</span>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Floor Area</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">{projectMetrics.floorArea.toFixed(2)} sq ft</span>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Baseboard Trim</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">{projectMetrics.trimLnft.toFixed(1)} ln ft</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. AREA & ROOM DETAILED SCOPE SPECIFICATIONS */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-slate-700" />
                      <span>Area & Room Detailed Work Scope</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-600 font-bold">
                      {(selectedProject.rooms || []).length} Scope Area{(selectedProject.rooms || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="p-4 space-y-4 bg-white">
                    {(selectedProject.rooms || []).length === 0 ? (
                      <p className="text-slate-500 italic font-mono text-xs">No specific room breakdown defined.</p>
                    ) : (
                      (selectedProject.rooms || []).map((room, idx) => (
                        <div key={room.id || idx} className={`border rounded-xl overflow-hidden ${room.isOption ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
                          {/* Room Header */}
                          <div className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${room.isOption ? 'bg-amber-100/80 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="font-bold text-slate-900 text-xs font-mono flex items-center gap-2">
                              <span>{idx + 1}. {room.name} {room.groupName ? `(${room.groupName})` : ''}</span>
                              {room.isOption && (
                                <span className="bg-amber-600 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                                  Optional Add-On
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-3 font-mono text-[10px] text-slate-600">
                              <span>Dimensions: {room.length || 0}' × {room.width || 0}' × {room.height || 8}'</span>
                              <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded uppercase">
                                {room.category || 'interior'}
                              </span>
                            </div>
                          </div>

                          {/* Room Task Checklist & Specs */}
                          <div className="p-3 text-xs space-y-2">
                            {/* Paint Specifications */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50/50 p-2 rounded border border-slate-100">
                              <div>
                                <span className="text-slate-500 font-bold">Wall Paint: </span>
                                <span className="text-slate-900 font-medium">{room.wallPaintType || 'Regal Select Eggshell'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold">Coats/Finish: </span>
                                <span className="text-slate-900 font-medium">2 Coats Premium Sheen</span>
                              </div>
                            </div>

                            {/* Task Checklist Items */}
                            {room.surfaceTasks && room.surfaceTasks.length > 0 ? (
                              <div className="space-y-1 pt-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                                  Scope Tasks:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
                                  {room.surfaceTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-2 text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-200/80">
                                      <CheckCircle className={`w-3.5 h-3.5 ${task.completed ? 'text-emerald-600' : 'text-slate-400'} shrink-0`} />
                                      <span className={task.completed ? 'line-through text-slate-400' : 'font-medium'}>{task.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500 font-mono italic">
                                Standard prep (cover floor, patch drywall, sand, mask, 2 coats paint).
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 7. OPERATIONAL TASK CHECKLIST */}
                {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-slate-700" />
                        <span>Master Operational Checklist</span>
                      </h3>
                      <span className="text-[11px] font-mono text-slate-600 font-bold">
                        {selectedProject.tasks.filter(t => t.completed).length} / {selectedProject.tasks.length} Completed
                      </span>
                    </div>

                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                        {selectedProject.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <CheckCircle className={`w-4 h-4 ${t.completed ? 'text-emerald-600' : 'text-slate-400'} shrink-0`} />
                            <span className={t.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                              {t.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. SIGNATURE & QUALITY ASSURANCE FOOTER */}
                <div className="pt-6 border-t-2 border-slate-300 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 font-mono text-xs">
                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                        Site Lead / Operations Sign-off
                      </span>
                      <div className="h-10 border-b-2 border-slate-900 flex items-end pb-1 font-bold text-slate-800">
                        Daniel Rust (Operations Lead)
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

                  <div className="bg-slate-100 p-3 rounded-lg text-center font-mono text-[10px] text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-800">CAPSTONE PAINTING INC. &bull; QUALITY ASSURANCE GUARANTEE</p>
                    <p>All work is executed according to professional painting standards using premium materials. Thank you for choosing Capstone Painting!</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Control Footer Bar */}
            <div className="p-4 sm:px-6 border-t border-neutral-800 bg-[#111111] flex items-center justify-between no-print">
              <span className="text-xs text-zinc-400 font-mono">
                PaintCRM Document Engine &bull; Official Work Order WO-#{selectedProject.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEditing(selectedProject)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Work Order</span>
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
