import React, { useRef, useState, useEffect } from 'react';
import { ProjectDetails, ClientLead, RoomSpec, PaintColor } from '../types';
import { calculateRoomPricing, DEFAULT_REAL_PRODUCTS } from '../utils/pricing';
import { fetchSingleProjectFromFirestore, fetchSingleClientFromFirestore, updateProjectSignatureInFirestore, saveProjectToFirestore } from '../firebaseService';
import { fetchSingleProjectFromSupabase, fetchSingleClientFromSupabase, updateProjectSignatureInSupabase, saveProjectToSupabase } from '../supabaseService';
import { generateProposalPDF, generateReceiptPDF } from '../pdfGenerator';
import { sendProposalEmail } from '../gmailService';
import { 
  CheckCircle, 
  FileText, 
  PenTool, 
  Type, 
  Info, 
  AlertCircle, 
  MapPin, 
  Mail, 
  Phone, 
  ShieldCheck,
  Paintbrush,
  Download,
  X,
  Diamond,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';

interface RoomCostDetail {
  roomId: string;
  roomName: string;
  isOption: boolean;
  totalCost: number;
  laborCost: number;
  materialCost: number;
  surfaceItems: {
    label: string;
    coats: number;
    qtyOrArea: string;
    cost: number;
    paint?: PaintColor;
  }[];
  taskItems: {
    text: string;
    cost: number;
    completed: boolean;
  }[];
}

function computeDetailedRoomBreakdownMap(rooms: RoomSpec[], proposalSubtotal: number, projectHourlyRate: number = 85): Record<string, RoomCostDetail> {
  const hourlyLaborRate = projectHourlyRate || 85;
  const rawBreakdowns: Record<string, {
    roomId: string;
    roomName: string;
    isOption: boolean;
    rawTotal: number;
    rawLabor: number;
    rawMaterial: number;
    surfaceItems: { label: string; coats: number; qtyOrArea: string; cost: number; paint?: PaintColor }[];
    taskItems: { text: string; cost: number; completed: boolean }[];
  }> = {};

  let sumRawNonOptionTotals = 0;

  rooms.forEach(room => {
    let rHours = 0;
    let rMat = 0;
    const surfaceItems: { label: string; coats: number; qtyOrArea: string; cost: number; paint?: PaintColor }[] = [];
    const taskItems: { text: string; cost: number; completed: boolean }[] = [];

    const rL = Number(room.length) || 12;
    const rW = Number(room.width) || 12;
    const rH = Number(room.height) || 9;

    const wArea = 2 * rH * (rL + rW);
    const cArea = rL * rW;
    const perimeter = 2 * (rL + rW);
    const category = room.category || 'interior';

    if (category === 'exterior') {
      const extConfigs = [
        { key: 'ext-siding', label: 'Exterior Siding', speed: 120, coverage: 250, matCost: 35, area: wArea, unit: 'sq ft' },
        { key: 'ext-brick-stain', label: 'Brick Stain', speed: 100, coverage: 200, matCost: 45, area: wArea, unit: 'sq ft' },
        { key: 'ext-porch-floor', label: 'Porch Floor', speed: 100, coverage: 250, matCost: 30, area: cArea, unit: 'sq ft' },
        { key: 'ext-soffits', label: 'Soffits', speed: 100, coverage: 350, matCost: 20, area: perimeter, unit: 'lin ft' },
        { key: 'ext-gutters', label: 'Gutters', speed: 100, coverage: 350, matCost: 20, area: perimeter, unit: 'lin ft' },
        { key: 'ext-fascia', label: 'Fascia', speed: 100, coverage: 350, matCost: 20, area: perimeter, unit: 'lin ft' },
        { key: 'ext-trims', label: 'Exterior Trims', speed: 100, coverage: 350, matCost: 20, area: perimeter, unit: 'lin ft' },
        { key: 'ext-railings', label: 'Railings', speed: 60, coverage: 200, matCost: 25, area: perimeter, unit: 'lin ft' },
      ];

      extConfigs.forEach(cfg => {
        const item = (room as any)[cfg.key];
        if (item && item.checked) {
          const coats = Number(item.coats) || 2;
          const h = (cfg.area / cfg.speed) * coats;
          const m = (cfg.area / cfg.coverage) * coats * cfg.matCost;
          const cost = Math.round(h * hourlyLaborRate + m);
          rHours += h;
          rMat += m;
          surfaceItems.push({ label: cfg.label, coats, qtyOrArea: `${cfg.area} ${cfg.unit}`, cost });
        }
      });

      const extItems = [
        { key: 'ext-garage-door', label: 'Garage Door', hPerCoat: 1.5, mPerCoat: 15 },
        { key: 'ext-doors', label: 'Front / Exterior Doors', hPerCoat: 1.2, mPerCoat: 12 },
        { key: 'ext-windows-fixed', label: 'Exterior Windows', hPerCoat: 0.8, mPerCoat: 8 },
        { key: 'ext-shutters', label: 'Shutters', hPerCoat: 0.6, mPerCoat: 6 },
      ];

      extItems.forEach(cfg => {
        const item = (room as any)[cfg.key];
        if (item && item.checked) {
          const qty = Number(item.qty) || 1;
          const coats = Number(item.coats) || 2;
          const h = qty * cfg.hPerCoat * coats;
          const m = qty * cfg.mPerCoat * coats;
          const cost = Math.round(h * hourlyLaborRate + m);
          rHours += h;
          rMat += m;
          surfaceItems.push({ label: cfg.label, coats, qtyOrArea: `${qty} unit(s)`, cost });
        }
      });
    } else if (category === 'deck') {
      const deckConfigs = [
        { key: 'washing', label: 'Power Washing', h: cArea / 300, m: cArea * 0.10 },
        { key: 'stripping', label: 'Chemical Stripping', h: cArea / 200, m: cArea * 0.25 },
        { key: 'reviving', label: 'Wood Brightening', h: cArea / 250, m: cArea * 0.15 },
        { key: 'sanding', label: 'Deck Floor Sanding', h: cArea / 150, m: 25 },
        { key: 'staining', label: 'Stain Coating', h: (cArea / 80) * 2, m: (cArea / 250) * 2 * 60 },
      ];
      deckConfigs.forEach(cfg => {
        const item = (room as any)[cfg.key];
        if (item && item.checked) {
          const coats = Number(item.coats) || 1;
          const cost = Math.round(cfg.h * hourlyLaborRate + cfg.m);
          rHours += cfg.h;
          rMat += cfg.m;
          surfaceItems.push({ label: cfg.label, coats, qtyOrArea: `${cArea} sq ft`, cost });
        }
      });
    } else {
      // Interior
      const rWalls = (room as any).walls || { checked: true, qty: 'auto', coats: 2 };
      const rCeilings = (room as any).ceilings || { checked: true, qty: 'auto', coats: 2 };
      const rBaseboards = (room as any).baseboards || { checked: true, qty: 'auto', coats: 2 };
      const rWindows = (room as any).windows || { checked: false, qty: 2, coats: 2 };
      const rDoors = (room as any).doors || { checked: false, qty: 2, coats: 2 };
      const rDoorFrames = (room as any).doorFrames || { checked: false, qty: 2, coats: 2 };

      const wallPaint = room.paints?.find(p => p.surface === 'walls');
      const ceilingPaint = room.paints?.find(p => p.surface === 'ceiling');
      const trimPaint = room.paints?.find(p => p.surface === 'trim');
      const doorPaint = room.paints?.find(p => p.surface === 'doors');

      if (rWalls.checked) {
        const h = (wArea / 150) * rWalls.coats;
        const m = (wArea / 350) * rWalls.coats * 25;
        const cost = Math.round(h * hourlyLaborRate + m);
        rHours += h;
        rMat += m;
        surfaceItems.push({ label: 'Walls', coats: rWalls.coats, qtyOrArea: `${wArea} sq ft`, cost, paint: wallPaint });
      }

      if (rCeilings.checked) {
        const h = (cArea / 120) * rCeilings.coats;
        const m = (cArea / 350) * rCeilings.coats * 28;
        const cost = Math.round(h * hourlyLaborRate + m);
        rHours += h;
        rMat += m;
        surfaceItems.push({ label: 'Ceiling', coats: rCeilings.coats, qtyOrArea: `${cArea} sq ft`, cost, paint: ceilingPaint });
      }

      if (rBaseboards.checked) {
        const h = (perimeter / 100) * rBaseboards.coats;
        const m = (perimeter / 400) * rBaseboards.coats * 18;
        const cost = Math.round(h * hourlyLaborRate + m);
        rHours += h;
        rMat += m;
        surfaceItems.push({ label: 'Baseboards', coats: rBaseboards.coats, qtyOrArea: `${perimeter} lin ft`, cost, paint: trimPaint });
      }

      if (rWindows.checked) {
        const qty = Number(rWindows.qty) || 2;
        const h = qty * 0.75 * rWindows.coats;
        const m = qty * 6 * rWindows.coats;
        const cost = Math.round(h * hourlyLaborRate + m);
        rHours += h;
        rMat += m;
        surfaceItems.push({ label: 'Windows', coats: rWindows.coats, qtyOrArea: `${qty} unit(s)`, cost, paint: trimPaint });
      }

      if (rDoors.checked) {
        const qty = Number(rDoors.qty) || 2;
        const h = qty * 0.75 * rDoors.coats;
        const m = qty * 7 * rDoors.coats;
        const cost = Math.round(h * hourlyLaborRate + m);
        rHours += h;
        rMat += m;
        surfaceItems.push({ label: 'Doors', coats: rDoors.coats, qtyOrArea: `${qty} unit(s)`, cost, paint: doorPaint });
      }

      if (rDoorFrames.checked) {
        const qty = Number(rDoorFrames.qty) || 2;
        const h = qty * 0.5 * rDoorFrames.coats;
        const m = qty * 5 * rDoorFrames.coats;
        const cost = Math.round(h * hourlyLaborRate + m);
        rHours += h;
        rMat += m;
        surfaceItems.push({ label: 'Door Frames', coats: rDoorFrames.coats, qtyOrArea: `${qty} unit(s)`, cost, paint: trimPaint });
      }
    }

    if ((room as any).customAreas) {
      (room as any).customAreas.forEach((cItem: any) => {
        if (cItem.checked !== false) {
          const coats = Number(cItem.coats) || 2;
          const qty = cItem.qty === 'auto' ? 1 : (Number(cItem.qty) || 1);
          let h = qty * 0.75 * coats;
          let m = qty * 7.00 * coats;
          const cost = Math.round(h * hourlyLaborRate + m);
          rHours += h;
          rMat += m;
          surfaceItems.push({ label: cItem.label || 'Custom Surface', coats, qtyOrArea: `${qty} unit(s)`, cost });
        }
      });
    }

    if (room.surfaceTasks) {
      room.surfaceTasks.forEach(task => {
        let tCost = 35;
        const textLower = (task.text || '').toLowerCase();
        if (textLower.includes('wash') || textLower.includes('clean')) tCost = 25;
        else if (textLower.includes('patch') || textLower.includes('drywall')) tCost = 45;
        else if (textLower.includes('prime') || textLower.includes('stain')) tCost = 50;

        rHours += tCost / hourlyLaborRate;
        rMat += 10;
        taskItems.push({ text: task.text, cost: tCost, completed: task.completed });
      });
    }

    const roomPricing = calculateRoomPricing(room);
    const rawLabor = roomPricing.laborCost;
    const rawMaterial = roomPricing.materialCost;
    const rawTotal = roomPricing.totalCost;

    if (!room.isOption) {
      sumRawNonOptionTotals += rawTotal;
    }

    rawBreakdowns[room.id] = {
      roomId: room.id,
      roomName: room.name,
      isOption: !!room.isOption,
      rawTotal,
      rawLabor,
      rawMaterial,
      surfaceItems,
      taskItems
    };
  });

  const scaleFactor = (proposalSubtotal > 0 && sumRawNonOptionTotals > 0)
    ? (proposalSubtotal / sumRawNonOptionTotals)
    : 1;

  const resultMap: Record<string, RoomCostDetail> = {};

  rooms.forEach(room => {
    const raw = rawBreakdowns[room.id];
    if (!raw) return;

    const sf = room.isOption ? 1 : scaleFactor;
    const finalTotal = Math.round(raw.rawTotal * sf);
    const finalLabor = Math.round(raw.rawLabor * sf);
    const finalMaterial = Math.round(raw.rawMaterial * sf);

    const scaledSurfaces = raw.surfaceItems.map(s => ({
      ...s,
      cost: Math.round(s.cost * sf)
    }));

    const scaledTasks = raw.taskItems.map(t => ({
      ...t,
      cost: Math.round(t.cost * sf)
    }));

    resultMap[room.id] = {
      roomId: room.id,
      roomName: room.name,
      isOption: !!room.isOption,
      totalCost: finalTotal,
      laborCost: finalLabor,
      materialCost: finalMaterial,
      surfaceItems: scaledSurfaces,
      taskItems: scaledTasks
    };
  });

  return resultMap;
}

interface ClientSignPortalProps {
  proposalId: string;
  onBackToApp?: () => void;
}

export default function ClientSignPortal({ proposalId, onBackToApp }: ClientSignPortalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [client, setClient] = useState<ClientLead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foundProvider, setFoundProvider] = useState<'firestore' | 'supabase' | null>(null);

  // Signature States
  const [signerName, setSignerName] = useState<string>('');
  const [signerTitle, setSignerTitle] = useState<string>('Homeowner');
  const [signMethod, setSignMethod] = useState<'draw' | 'type'>('draw');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSignedSuccess, setIsSignedSuccess] = useState<boolean>(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);

  // Canvas Drawing Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHasContent, setCanvasHasContent] = useState<boolean>(false);

  useEffect(() => {
    async function loadPortalData() {
      setLoading(true);
      setError(null);
      try {
        let proj = await fetchSingleProjectFromFirestore(proposalId);
        let provider: 'firestore' | 'supabase' = 'firestore';

        if (!proj) {
          proj = await fetchSingleProjectFromSupabase(proposalId);
          if (proj) {
            provider = 'supabase';
          }
        }

        if (!proj) {
          setError('Proposal not found. Please double check the link or contact your contractor.');
          setLoading(false);
          return;
        }
        const nowIso = new Date().toISOString();
        const newViewCount = (proj.viewCount || 0) + 1;
        const updatedProj = {
          ...proj,
          viewCount: newViewCount,
          lastViewedAt: nowIso,
        };

        setProject(updatedProj);
        setFoundProvider(provider);

        // Async register initial view event in database
        if (provider === 'firestore') {
          saveProjectToFirestore('public_portal', updatedProj).catch(() => {});
        } else {
          saveProjectToSupabase('public_portal', updatedProj).catch(() => {});
        }
        
        if (proj.clientId) {
          let cli = null;
          if (provider === 'firestore') {
            cli = await fetchSingleClientFromFirestore(proj.clientId);
          } else {
            cli = await fetchSingleClientFromSupabase(proj.clientId);
          }
          if (cli) {
            setClient(cli);
            setSignerName(cli.name);
          }
        }
        
        if (proj.status === 'Approved' || proj.clientSigned) {
          setIsSignedSuccess(true);
          if (proj.signerName) setSignerName(proj.signerName);
          if (proj.signerTitle) setSignerTitle(proj.signerTitle);
        }
      } catch (err: any) {
        console.error('Portal load error:', err);
        setError('Failed to retrieve proposal parameters. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    loadPortalData();
  }, [proposalId]);

  // Track active reading & review duration on the proposal page
  useEffect(() => {
    if (!project?.id) return;
    let accumulatedSec = 0;

    const interval = setInterval(() => {
      if (!document.hidden) {
        accumulatedSec += 5;
        setProject(prev => {
          if (!prev) return prev;
          const currentDur = prev.totalViewDurationSec || 0;
          const newDur = currentDur + 5;
          const updated = { ...prev, totalViewDurationSec: newDur };

          // Persist view time to cloud DB every 15 seconds
          if (accumulatedSec % 15 === 0) {
            if (foundProvider === 'firestore') {
              saveProjectToFirestore('public_portal', updated).catch(() => {});
            } else {
              saveProjectToSupabase('public_portal', updated).catch(() => {});
            }
          }
          return updated;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [project?.id, foundProvider]);

  // Adjust canvas size when signature modal is opened
  useEffect(() => {
    if (isSignModalOpen && signMethod === 'draw' && canvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 450;
        canvas.height = 140;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSignModalOpen, signMethod]);

  const downloadReceiptPDF = (inst: any) => {
    if (!project) return;
    try {
      const activeInstallments = project.installments || [];
      const { blobUrl } = generateReceiptPDF({
        project,
        client: client || { name: project.clientName, email: project.clientEmail, phone: project.clientPhone, address: project.address } as any,
        installment: inst,
        allInstallments: activeInstallments,
      });

      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Receipt_${project.id || 'N/A'}_${inst.id}.pdf`;
        link.click();
      } else {
        alert('Could not generate receipt PDF.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate receipt PDF.');
    }
  };

  const downloadFullInvoicePDF = () => {
    if (!project) return;
    try {
      const total = project.summary?.totalPrice || 0;
      const subtotal = total / 1.13;
      const roomBreakdownMap = computeDetailedRoomBreakdownMap(project.rooms || [], subtotal, project.summary?.hourlyLaborRate);
      const roomCosts: Record<string, number> = {};
      Object.keys(roomBreakdownMap).forEach(id => {
        roomCosts[id] = roomBreakdownMap[id].totalCost;
      });

      const deposit = total * 0.30;
      const balance = total - deposit;

      const activeInstallments = project.installments || [
        {
          id: 'inst-1',
          name: 'Upfront Deposit (30%)',
          percentage: 30,
          amount: Math.round(total * 0.30),
          status: 'Requested' as const,
          requestedAt: new Date().toLocaleDateString(),
        },
        {
          id: 'inst-2',
          name: 'Final Balance (70%)',
          percentage: 70,
          amount: total - Math.round(total * 0.30),
          status: 'Draft' as const,
        }
      ];

      const { blobUrl } = generateProposalPDF({
        project,
        client: client || {
          id: project.clientId,
          name: project.signerName || signerName || project.clientName || 'Client',
          email: project.clientEmail || client?.email || '',
          phone: project.clientPhone || client?.phone || '',
          address: project.address || client?.address || '',
          status: 'Active',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        rooms: project.rooms || [],
        liveSummary: {
          subtotal,
          hst: total - subtotal,
          total,
          deposit,
          balance,
          roomCosts,
        },
        inclusions: project.inclusions || '',
        exclusions: project.exclusions || '',
        specialConditions: project.specialConditions || '',
        signerName: project.signerName || signerName || '',
        signerTitle: project.signerTitle || signerTitle || 'Homeowner',
        signedDate: project.signedDate || new Date().toLocaleDateString(),
        clientSigned: project.clientSigned || isSignedSuccess,
        clientAddress: project.address || client?.address || '',
        clientPhone: project.clientPhone || client?.phone || '',
        clientEmail: project.clientEmail || client?.email || '',
        projectDate: project.createdAt ? project.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        proposalNo: project.id,
        generalNotes: project.generalNotes || '',
        termsAndConditions: project.termsAndConditions || '',
        signatureDataUrl: project.signatureDataUrl || undefined,
        installments: activeInstallments,
      });

      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Signed_Proposal_${project.id || 'N/A'}.pdf`;
        link.click();
      } else {
        alert('Could not generate proposal PDF.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate proposal PDF.');
    }
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a'; // slate-900 for high-contrast signing
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setCanvasHasContent(true);
    
    if (e.cancelable) e.preventDefault();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCanvasHasContent(false);
  };

  // Submit Signature
  const handleSubmitSignature = async () => {
    if (!project || !foundProvider) return;
    if (!signerName.trim()) {
      alert('Please enter your full name as the legal signer.');
      return;
    }

    setIsSubmitting(true);
    try {
      let sigBase64 = undefined;
      
      if (signMethod === 'draw' && canvasRef.current && canvasHasContent) {
        sigBase64 = canvasRef.current.toDataURL('image/png');
      }

      // 1. Auto-launch Stripe invoice for 30% upfront deposit
      let stripeInvoiceId = undefined;
      let stripeInvoiceUrl = undefined;
      const total = project.summary.totalPrice || 0;
      const firstAmount = Math.round(total * 0.30);
      const secondAmount = total - firstAmount;

      try {
        const stripeRes = await fetch('/api/stripe/send-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientEmail: client?.email || 'daniel@capstonepainting.ca',
            clientName: client?.name || signerName.trim(),
            amount: firstAmount,
            proposalNo: project.id,
            description: `PaintNav Upfront Deposit (30%) for Estimate #${project.id} - Proposal Signed & Approved`
          }),
        });
        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          stripeInvoiceId = stripeData.invoiceId;
          stripeInvoiceUrl = stripeData.invoiceUrl;
        }
      } catch (stripeErr) {
        console.error("Failed to dispatch Stripe invoice:", stripeErr);
      }

      const defaultInstallments = [
        {
          id: 'inst-1',
          name: 'Upfront Deposit (30%)',
          percentage: 30,
          amount: firstAmount,
          status: 'Requested' as const,
          requestedAt: new Date().toLocaleDateString(),
          stripeInvoiceId,
          stripeInvoiceUrl,
        },
        {
          id: 'inst-2',
          name: 'Final Balance (70%)',
          percentage: 70,
          amount: secondAmount,
          status: 'Draft' as const,
        }
      ];

      // 2. Save signature and installments structure to database
      if (foundProvider === 'firestore') {
        await updateProjectSignatureInFirestore(
          project.id,
          signerName.trim(),
          signerTitle.trim(),
          'Approved',
          sigBase64,
          defaultInstallments
        );
      } else {
        await updateProjectSignatureInSupabase(
          project.id,
          signerName.trim(),
          signerTitle.trim(),
          'Approved',
          sigBase64,
          defaultInstallments
        );
      }

      // Update local state
      const updatedProject = {
        ...project,
        clientSigned: true,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim(),
        signedDate: new Date().toISOString(),
        signatureDataUrl: sigBase64,
        status: 'Approved' as const,
        installments: defaultInstallments
      };
      setProject(updatedProject);

      // 3. Generate PDF and dispatch notification email
      try {
        const roomCosts: Record<string, number> = {};
        if (project.rooms && project.rooms.length > 0) {
          const count = project.rooms.length;
          const share = (project.summary.totalPrice || 0) / count;
          project.rooms.forEach((room) => {
            roomCosts[room.id] = Math.round(share);
          });
        }

        const deposit = firstAmount;
        const balance = secondAmount;

        const { base64: proposalPdfBase64 } = generateProposalPDF({
          project: updatedProject,
          client: client || {
            id: project.clientId,
            name: signerName.trim(),
            email: client?.email || 'daniel@capstonepainting.ca',
            phone: client?.phone || '',
            address: client?.address || '',
            status: 'Active',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          rooms: project.rooms || [],
          liveSummary: {
            subtotal: total / 1.13,
            hst: total - (total / 1.13),
            total,
            deposit,
            balance,
            roomCosts,
          },
          inclusions: project.inclusions || '',
          exclusions: project.exclusions || '',
          specialConditions: project.specialConditions || '',
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          signedDate: new Date().toLocaleDateString(),
          clientSigned: true,
          clientAddress: client?.address || '',
          clientPhone: client?.phone || '',
          clientEmail: client?.email || 'daniel@capstonepainting.ca',
          projectDate: project.createdAt ? project.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          proposalNo: project.id,
          generalNotes: project.generalNotes || '',
          termsAndConditions: project.termsAndConditions || '',
          signatureDataUrl: sigBase64,
        });

        if (project.contractorAccessToken) {
          const emailSubject = `Signed Proposal: ${project.title} (Proposal #${project.id})`;
          const emailBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
              <h2 style="color: #16a34a; margin-top: 0; font-weight: bold; font-size: 20px;">Proposal Signed & Approved!</h2>
              <p style="font-size: 14px; color: #374151;">Hi there,</p>
              <p style="font-size: 14px; color: #374151;">The estimate/proposal <strong>"${project.title}"</strong> (Proposal #${project.id}) has been signed and approved by <strong>${signerName.trim()}</strong> (${signerTitle.trim()}) on ${new Date().toLocaleDateString()}.</p>
              
              <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e4e4e7;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #1f2937; font-size: 14px;">Summary of Payment Terms:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
                  <li style="margin-bottom: 6px;"><strong>30% Upfront Deposit:</strong> <span style="color: #d97706; font-weight: bold;">$${deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> (Due Now)</li>
                  <li style="margin-bottom: 6px;"><strong>70% Upon Completion:</strong> <span>$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                  <li><strong>Total Proposal Value:</strong> <span style="font-weight: bold; color: #111827;">$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                </ul>
              </div>

              <p style="font-size: 14px; color: #374151;">The fully signed PDF version is attached to this email for your records.</p>
              <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px;">This is an automated message sent via PaintNav.</p>
            </div>
          `;

          await sendProposalEmail({
            accessToken: project.contractorAccessToken,
            to: client?.email || 'daniel@capstonepainting.ca',
            bcc: 'daniel@capstonepainting.ca',
            subject: emailSubject,
            body: emailBody,
            pdfBase64: proposalPdfBase64,
            pdfFilename: `Signed_Proposal_${project.id}.pdf`
          });
        }
      } catch (err) {
        console.error("Failed to generate PDF or send email:", err);
      }

      setIsSignModalOpen(false);
      setIsSignedSuccess(true);
    } catch (err: any) {
      console.error('Signature submit error:', err);
      alert('Failed to save signature. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientPayInstallmentDemo = async (instId: string) => {
    if (!project || !foundProvider) return;
    try {
      const activeInstallments = project.installments || [
        {
          id: 'inst-1',
          name: 'Upfront Deposit (30%)',
          percentage: 30,
          amount: Math.round((project.summary.totalPrice || 0) * 0.30),
          status: 'Requested' as const,
          requestedAt: new Date().toLocaleDateString(),
        },
        {
          id: 'inst-2',
          name: 'Final Balance (70%)',
          percentage: 70,
          amount: (project.summary.totalPrice || 0) - Math.round((project.summary.totalPrice || 0) * 0.30),
          status: 'Draft' as const,
        }
      ];

      const nextInstallments = activeInstallments.map(item => {
        if (item.id === instId) {
          return {
            ...item,
            status: 'Paid' as const,
            paidAt: new Date().toLocaleDateString()
          };
        }
        return item;
      });

      if (foundProvider === 'firestore') {
        await updateProjectSignatureInFirestore(
          project.id,
          project.signerName || signerName,
          project.signerTitle || signerTitle,
          'Approved',
          project.signatureDataUrl,
          nextInstallments
        );
      } else {
        await updateProjectSignatureInSupabase(
          project.id,
          project.signerName || signerName,
          project.signerTitle || signerTitle,
          'Approved',
          project.signatureDataUrl,
          nextInstallments
        );
      }

      setProject({
        ...project,
        installments: nextInstallments
      });

      alert('Simulated Payment Successful! Receipt status updated.');
    } catch (err) {
      console.error(err);
      alert('Failed to process payment.');
    }
  };

  // Compute estimate totals
  const getTotals = () => {
    if (!project) return { subtotal: 0, hst: 0, total: 0, deposit: 0, balance: 0, roomBreakdownMap: {}, optionalTotal: 0 };
    const total = project.summary.totalPrice || 0;
    const subtotal = total / 1.13;
    const hst = total - subtotal;
    const deposit = total * 0.30;
    const balance = total - deposit;

    const roomBreakdownMap = computeDetailedRoomBreakdownMap(project.rooms || [], subtotal, project.summary?.hourlyLaborRate);
    const optionalTotal = Object.values(roomBreakdownMap)
      .filter(r => r.isOption)
      .reduce((sum, r) => sum + r.totalCost, 0);

    return { subtotal, hst, total, deposit, balance, roomBreakdownMap, optionalTotal };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4 font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 text-sm font-mono animate-pulse">Loading Proposal Document...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-400 font-display">Proposal Access Blocked</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">{error || 'This estimate record could not be fetched.'}</p>
        </div>
      </div>
    );
  }

  const { subtotal, hst, total, deposit, balance, roomBreakdownMap, optionalTotal } = getTotals();

  const standardRooms = (project.rooms || []).filter(r => !r.isOption);
  const optionRooms = (project.rooms || []).filter(r => r.isOption);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none antialiased pb-16">
      {/* 1. SECURE PORTAL HEADER */}
      <header className="bg-zinc-900/90 backdrop-blur-md border-b border-neutral-850 sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Paintbrush className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-display font-black tracking-wider text-white flex items-center gap-1.5 leading-none">
              PAINTNAV <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono uppercase tracking-widest">Client Portal</span>
            </h1>
            <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">Proposal Review & E-Sign Approval</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted
          </span>
          <button
            onClick={downloadFullInvoicePDF}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-[11px] font-mono rounded-lg transition border border-neutral-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD PDF</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN PROPOSAL DOCUMENT PREVIEW SHEET */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 my-6">
        <div className="bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200/80 text-left font-sans">
          
          {/* Document Header Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-4 border-blue-600">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
                  <Paintbrush className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black tracking-tight text-white leading-tight">PAINTNAV PAINTING SERVICES</h2>
                  <p className="text-xs text-blue-300 font-mono">Licensed & Insured Master Painters</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-3 max-w-md leading-relaxed">
                Professional interior & exterior coating solutions. Providing quality workmanship, clear timelines, and long-lasting results.
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 sm:border-l sm:border-slate-800 sm:pl-6">
              <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[11px] font-bold rounded-lg uppercase tracking-wider mb-1">
                Official Proposal / Estimate
              </span>
              <h3 className="text-2xl font-mono font-bold text-white">#{project.id}</h3>
              <p className="text-xs text-zinc-400 font-mono">Date: {new Date(project.createdAt).toLocaleDateString()}</p>
              {isSignedSuccess ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved & Executed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-bold font-mono">
                  <AlertCircle className="w-3.5 h-3.5" /> Pending Signature
                </span>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-10 md:p-12 space-y-8">
            
            {/* Client & Job Location Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 block">PREPARED FOR CLIENT:</span>
                <p className="text-slate-900 font-bold text-sm font-display">{client?.name || project.clientName || 'Valued Client'}</p>
                {client?.company && <p className="text-slate-600 font-medium">{client.company}</p>}
                <p className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {client?.address || project.address || 'Job Site Address'}</p>
                <p className="flex items-center gap-1.5 text-slate-600"><Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {client?.email || project.clientEmail}</p>
                {client?.phone && <p className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {client.phone}</p>}
              </div>

              <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-6">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 block">PROJECT TITLE & DESCRIPTION:</span>
                <p className="text-slate-900 font-bold text-sm font-display">{project.title}</p>
                <p className="text-slate-600 leading-relaxed text-xs">{project.description || 'Professional residential painting and surface refinishing.'}</p>
              </div>
            </div>

            {/* Work Scope / Rooms & Surface Specifications */}
            <div className="space-y-6">
              {/* Primary Scope Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800">
                    Primary Scope & Room Cost Breakdown ({standardRooms.length} Areas)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono font-semibold">Base Proposal Scope</span>
              </div>

              {/* Standard Rooms List Grouped by Surface Category */}
              <div className="space-y-6">
                {standardRooms.length > 0 ? (
                  [
                    { id: 'interior', title: 'Interior Scope of Work', bg: 'bg-indigo-50/80 border-indigo-200 text-indigo-950', bar: 'bg-indigo-600', badge: 'Interior' },
                    { id: 'exterior', title: 'Exterior Scope of Work', bg: 'bg-amber-50/80 border-amber-200 text-amber-950', bar: 'bg-amber-600', badge: 'Exterior' },
                    { id: 'deck', title: 'Deck & Staining Scope of Work', bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950', bar: 'bg-emerald-600', badge: 'Deck & Staining' },
                  ].map((cat) => {
                    const catRooms = standardRooms.filter(r => (r.category || 'interior') === cat.id);
                    if (catRooms.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-3">
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${cat.bg}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-4 rounded-full ${cat.bar}`} />
                            <h4 className="text-xs font-bold font-mono uppercase tracking-wider">{cat.title}</h4>
                          </div>
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-xs">
                            {catRooms.length} {catRooms.length === 1 ? 'Area' : 'Areas'}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {catRooms.map((room) => {
                            const roomDetail = roomBreakdownMap[room.id];
                            const roomPrice = roomDetail ? roomDetail.totalCost : 0;

                            return (
                              <div key={room.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                                {/* Room Header */}
                                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm font-display">{room.name}</span>
                                    {room.groupName && (
                                      <span className="text-[10px] bg-slate-800 text-blue-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                                        {room.groupName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-zinc-400 text-[11px] hidden sm:inline">
                                      {room.length}' × {room.width}' × {room.height}' ft
                                    </span>
                                    <div className="bg-blue-600 text-white font-mono font-bold px-3 py-1 rounded-lg text-xs shadow">
                                      ${roomPrice.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Room Breakdown Details */}
                                <div className="p-4 space-y-4 text-xs">
                                  {/* Surfaces & Coatings Breakdown Table */}
                                  {roomDetail && roomDetail.surfaceItems.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block">
                                        Surfaces & Coating Schedule Breakdown
                                      </span>
                                      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                                        {roomDetail.surfaceItems.map((s, idx) => (
                                          <div key={idx} className="p-2.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 font-medium text-slate-800">
                                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                              <span className="font-bold">{s.label}</span>
                                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-mono font-semibold">
                                                {s.coats} Coat(s)
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-mono">({s.qtyOrArea})</span>
                                            </div>

                                            {s.paint && (
                                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {s.paint.hex && (
                                                  <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: s.paint.hex }} />
                                                )}
                                                <span className="font-semibold text-slate-800">{s.paint.brand}</span>
                                                <span>— {s.paint.colorName}</span>
                                                <span className="text-slate-400 font-mono">({s.paint.finish})</span>
                                              </div>
                                            )}

                                            <div className="font-mono font-bold text-slate-900 ml-auto">
                                              ${s.cost.toLocaleString()}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Prep & Repair Tasks */}
                                  {roomDetail && roomDetail.taskItems.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block">
                                        Prep & Repair Tasks Included
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {roomDetail.taskItems.map((t, tIdx) => (
                                          <div key={tIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]">
                                            <span className="text-slate-700 flex items-center gap-1.5">
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                              <span>{t.text}</span>
                                            </span>
                                            <span className="font-mono font-bold text-slate-600">${t.cost}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Room Notes */}
                                  {room.notes && (
                                    <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2 rounded border border-amber-200/60">
                                      Note: {room.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs italic">
                    Standard full-service prep and painting scope included.
                  </div>
                )}
              </div>

              {/* Optional Upgrades & Add-on Scope Section */}
              {optionRooms.length > 0 && (
                <div className="space-y-4 pt-4 border-t-2 border-amber-200">
                  <div className="bg-amber-500/10 border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-400/30 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-amber-950 font-display flex items-center gap-1.5">
                            Optional Upgrades & Add-on Scope ({optionRooms.length} Options Available)
                          </h3>
                          <p className="text-[11px] text-amber-800">
                            The following optional areas are quoted separately as project add-ons. Review their individual costs below.
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300 shrink-0">
                        <span className="text-[10px] text-amber-800 font-mono uppercase tracking-wider block font-bold">Options Subtotal</span>
                        <span className="text-base font-bold font-mono text-amber-900">+${optionalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {optionRooms.map((room) => {
                        const roomDetail = roomBreakdownMap[room.id];
                        const roomPrice = roomDetail ? roomDetail.totalCost : 0;

                        return (
                          <div key={room.id} className="border-2 border-amber-300/90 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-amber-100 px-4 py-2.5 flex items-center justify-between border-b border-amber-200 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-950 text-sm font-display">{room.name}</span>
                                <span className="text-[10px] bg-amber-500 text-white font-mono font-bold px-2 py-0.5 rounded shadow-xs">
                                  OPTIONAL ADD-ON
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-amber-800 text-[11px] hidden sm:inline">
                                  {room.length}' × {room.width}' × {room.height}' ft
                                </span>
                                <div className="bg-amber-800 text-white font-mono font-bold px-3 py-1 rounded-lg text-xs shadow">
                                  Option Cost: ${roomPrice.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="p-4 space-y-3 text-xs">
                              {roomDetail && roomDetail.surfaceItems.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] uppercase font-bold text-amber-900 font-mono tracking-wider block">
                                    Optional Surfaces & Coating Specs
                                  </span>
                                  <div className="border border-amber-200 rounded-lg overflow-hidden divide-y divide-amber-100">
                                    {roomDetail.surfaceItems.map((s, idx) => (
                                      <div key={idx} className="p-2.5 bg-amber-50/50 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-slate-800">
                                          <span className="font-bold text-slate-900">{s.label}</span>
                                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-semibold border border-amber-200">
                                            {s.coats} Coat(s)
                                          </span>
                                          <span className="text-[10px] text-slate-500 font-mono">({s.qtyOrArea})</span>
                                        </div>
                                        <div className="font-mono font-bold text-amber-900 ml-auto">
                                          ${s.cost.toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {roomDetail && roomDetail.taskItems.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] uppercase font-bold text-amber-900 font-mono tracking-wider block">
                                    Optional Prep Tasks
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {roomDetail.taskItems.map((t, tIdx) => (
                                      <div key={tIdx} className="bg-amber-50/60 p-2 rounded-lg border border-amber-200 flex items-center justify-between text-[11px]">
                                        <span className="text-amber-950 flex items-center gap-1.5">
                                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span>{t.text}</span>
                                        </span>
                                        <span className="font-mono font-bold text-amber-800">${t.cost}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inclusions & Exclusions */}
            {(project.inclusions || project.exclusions) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.inclusions && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5 text-xs">
                    <h4 className="font-bold text-emerald-800 text-[11px] font-mono uppercase tracking-wider">✓ Included Prep & Work Scope</h4>
                    <p className="text-emerald-950 leading-relaxed whitespace-pre-line text-xs">{project.inclusions}</p>
                  </div>
                )}
                {project.exclusions && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1.5 text-xs">
                    <h4 className="font-bold text-rose-800 text-[11px] font-mono uppercase tracking-wider">✕ Excluded Items</h4>
                    <p className="text-rose-950 leading-relaxed whitespace-pre-line text-xs">{project.exclusions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Special Conditions & General Notes */}
            {(project.specialConditions || project.generalNotes) && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                {project.specialConditions && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-[11px] font-mono uppercase tracking-wider">Special Job Conditions</h4>
                    <p className="text-slate-700 leading-relaxed">{project.specialConditions}</p>
                  </div>
                )}
                {project.generalNotes && (
                  <div className="space-y-1 border-t border-slate-200 pt-2">
                    <h4 className="font-bold text-slate-800 text-[11px] font-mono uppercase tracking-wider">General Warranty & Notes</h4>
                    <p className="text-slate-700 leading-relaxed">{project.generalNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Investment Summary & Tax Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-slate-900 text-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                <span>Investment & Pricing Summary</span>
                <span>CAD / USD</span>
              </div>
              <div className="p-5 space-y-2 text-xs font-mono text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Subtotal (Materials & Labor):</span>
                  <span className="font-bold text-slate-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Sales Tax / HST (13%):</span>
                  <span className="font-bold text-slate-900">${hst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 border-b-2 border-slate-900 pb-2 pt-1 font-display">
                  <span>Grand Total Proposal Price:</span>
                  <span className="text-blue-700 font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <span className="text-[10px] text-amber-800 font-bold block uppercase font-mono">30% Upfront Deposit Required:</span>
                    <span className="text-base font-bold text-amber-900 font-mono">${deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg">
                    <span className="text-[10px] text-slate-600 font-bold block uppercase font-mono">70% Final Balance Upon Completion:</span>
                    <span className="text-base font-bold text-slate-900 font-mono">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Terms & Conditions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-slate-600 text-[11px] space-y-2">
              <h4 className="font-bold text-slate-800 uppercase font-mono tracking-wider text-xs">Terms & Conditions of Contract</h4>
              <p className="leading-relaxed whitespace-pre-line">{project.termsAndConditions || '1. A 30% deposit is required upon approval to secure scheduling. Balance is due immediately upon completion.\n2. Workmanship is backed by a 2-year warranty covering peeling and flaking.\n3. Digital signature constitutes a legally binding agreement.'}</p>
            </div>

            {/* BOTTOM SIGNATURE BLOCK / ACTION CALLOUT */}
            <div className="border-t-2 border-slate-200 pt-8 mt-8">
              {isSignedSuccess ? (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-lg shadow-emerald-500/5">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-emerald-900 font-display">Proposal Formally Signed & Approved</h3>
                    <p className="text-xs text-emerald-700">Digital authorization recorded and legally archived.</p>
                  </div>

                  <div className="max-w-md mx-auto bg-white border border-emerald-200 rounded-xl p-4 text-left font-mono text-xs text-slate-700 space-y-2">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Signer Name:</span>
                      <span className="font-bold text-slate-900">{project.signerName || signerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Relationship:</span>
                      <span className="text-slate-900">{project.signerTitle || signerTitle || 'Homeowner'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Date Executed:</span>
                      <span className="text-emerald-700 font-bold">{project.signedDate ? new Date(project.signedDate).toLocaleString() : new Date().toLocaleString()}</span>
                    </div>
                    {project.signatureDataUrl && (
                      <div className="pt-2 text-center">
                        <span className="text-[9px] text-slate-400 uppercase font-mono block mb-1">DIGITAL SIGNATURE STAMP:</span>
                        <img src={project.signatureDataUrl} alt="Signature" className="max-h-16 mx-auto border border-slate-200 rounded p-1 bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl border border-blue-600/40">
                  <div className="space-y-1.5 max-w-xl mx-auto">
                    <h3 className="text-xl font-display font-black text-white">Ready to Approve & Lock In Your Job?</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Review the complete proposal details above. Click below to open the secure e-signature window and accept the agreement.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsSignModalOpen(true)}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-sm rounded-xl cursor-pointer shadow-xl shadow-blue-600/30 transition transform hover:-translate-y-0.5 border border-blue-400 uppercase tracking-wider"
                  >
                    ✍️ Click to Sign & Approve Proposal
                  </button>
                  
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Encrypted with 256-Bit SSL • Enforceable Electronic Authorization
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 3. POST-SIGNING PAYMENT & RECEIPT DASHBOARD */}
        {isSignedSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-zinc-900 border border-neutral-800 p-6 rounded-2xl space-y-6 text-left"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Payment Schedule & Deposit Receipts</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage installment payments and review financial receipts for Proposal #{project.id}.
                </p>
              </div>
              <button
                onClick={downloadFullInvoicePDF}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono rounded-lg transition shadow-md shadow-blue-600/10 cursor-pointer border border-blue-500/30 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD FULL CONTRACT PDF</span>
              </button>
            </div>

            {(() => {
              const activeInstallments = project.installments || [
                {
                  id: 'inst-1',
                  name: 'Upfront Deposit (30%)',
                  percentage: 30,
                  amount: Math.round(total * 0.30),
                  status: 'Requested' as const,
                  requestedAt: new Date().toLocaleDateString(),
                },
                {
                  id: 'inst-2',
                  name: 'Final Balance (70%)',
                  percentage: 70,
                  amount: total - Math.round(total * 0.30),
                  status: 'Draft' as const,
                }
              ];

              const totalPaid = activeInstallments
                .filter(inst => inst.status === 'Paid')
                .reduce((sum, inst) => sum + inst.amount, 0);

              const remainingBalance = Math.max(0, total - totalPaid);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-zinc-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase block">Total Proposal</span>
                      <p className="text-lg font-black font-mono text-white">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-[10px] text-emerald-400 font-mono uppercase block">Total Paid</span>
                      <p className="text-lg font-black font-mono text-emerald-400">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-[10px] text-amber-400 font-mono uppercase block">Remaining Balance</span>
                      <p className="text-lg font-black font-mono text-amber-400">${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Installments Schedule:</span>
                    <div className="space-y-2">
                      {activeInstallments.map((inst) => (
                        <div key={inst.id} className="bg-zinc-950 p-4 rounded-xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="text-white font-bold">{inst.name}</p>
                            <p className="text-zinc-400 font-mono text-[11px]">${inst.amount.toLocaleString()} ({inst.percentage}%)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {inst.status === 'Paid' ? (
                              <>
                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg font-mono">
                                  ✓ Paid ({inst.paidAt})
                                </span>
                                <button
                                  onClick={() => downloadReceiptPDF(inst)}
                                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-semibold rounded-lg transition"
                                >
                                  Receipt PDF
                                </button>
                              </>
                            ) : inst.status === 'Requested' ? (
                              <div className="flex items-center gap-2">
                                {inst.stripeInvoiceUrl ? (
                                  <a
                                    href={inst.stripeInvoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold rounded-lg transition"
                                  >
                                    Pay with Stripe
                                  </a>
                                ) : (
                                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-lg font-mono">
                                    Requested
                                  </span>
                                )}
                                <button
                                  onClick={() => handleClientPayInstallmentDemo(inst.id)}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold rounded-lg transition font-mono"
                                >
                                  Demo Pay
                                </button>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded-lg font-mono">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </main>

      {/* 4. SIGNATURE POPUP MODAL */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-neutral-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative my-auto animate-in fade-in zoom-in-95 text-left">
            
            {/* Modal Close Button */}
            <button
              onClick={() => setIsSignModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-display font-black text-white flex items-center gap-2">
                ✍️ Sign & Approve Proposal
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Proposal #{project.id} — Total Investment: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                  Authorized Signer Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full bg-zinc-950 border border-neutral-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">
                  Relationship / Title
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="e.g. Homeowner, Spouse, Property Manager"
                  className="w-full bg-zinc-950 border border-neutral-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Signature Draw / Type Selector */}
            <div className="space-y-3">
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSignMethod('draw')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer flex items-center justify-center gap-1.5 transition ${signMethod === 'draw' ? 'bg-neutral-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSignMethod('type')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer flex items-center justify-center gap-1.5 transition ${signMethod === 'type' ? 'bg-neutral-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Type className="w-3.5 h-3.5" /> Type Script
                </button>
              </div>

              {signMethod === 'draw' ? (
                <div className="space-y-2">
                  <div className="bg-white rounded-xl border-2 border-neutral-700 overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full bg-white block cursor-crosshair touch-none"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute right-2.5 bottom-2.5 px-2 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-[10px] text-zinc-700 font-bold font-mono rounded cursor-pointer shadow-sm transition"
                    >
                      Clear Canvas
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0 text-blue-400" /> Sign with mouse cursor or finger inside canvas.
                  </span>
                </div>
              ) : (
                <div className="bg-zinc-950 p-4 rounded-xl border border-neutral-800 space-y-1 min-h-[120px] flex flex-col justify-center">
                  <span className="text-[9px] text-zinc-500 font-mono block">DIGITAL SCRIPT STAMP PREVIEW:</span>
                  <div className="font-mono text-blue-400 font-black italic text-2xl tracking-wider py-2 select-none border-b border-neutral-800 overflow-hidden truncate">
                    {signerName || 'Signature Script'}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-neutral-850 text-[10px] text-zinc-400 leading-relaxed">
              By clicking "Submit Signature & Accept Proposal", I agree that this electronic signature is legally binding and enforces the contract terms outlined in Proposal #{project.id}.
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-zinc-300 font-mono text-xs font-bold rounded-xl cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitSignature}
                disabled={isSubmitting || !signerName.trim() || (signMethod === 'draw' && !canvasHasContent)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-xl cursor-pointer transition shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Securing Signature...
                  </span>
                ) : (
                  '✍️ Submit Signature & Accept Proposal'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
