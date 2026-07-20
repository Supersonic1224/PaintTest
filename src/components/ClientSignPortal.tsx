import React, { useRef, useState, useEffect } from 'react';
import { ProjectDetails, ClientLead, RoomSpec } from '../types';
import { fetchSingleProjectFromFirestore, fetchSingleClientFromFirestore, updateProjectSignatureInFirestore } from '../firebaseService';
import { fetchSingleProjectFromSupabase, fetchSingleClientFromSupabase, updateProjectSignatureInSupabase } from '../supabaseService';
import { generateProposalPDF, generateReceiptPDF } from '../pdfGenerator';
import { sendProposalEmail } from '../gmailService';
import { 
  CheckCircle, 
  FileText, 
  PenTool, 
  Type, 
  Info, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone, 
  ChevronRight, 
  DollarSign, 
  UserCheck, 
  ShieldCheck,
  Paintbrush,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';

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
        setProject(proj);
        setFoundProvider(provider);
        
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

  // Adjust canvas size for high-DPI screens on mount
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 140; // Fixed visual height
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [loading, signMethod, isSignedSuccess]);

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
      const roomCosts: Record<string, number> = {};
      if (project.rooms && project.rooms.length > 0) {
        const count = project.rooms.length;
        const share = (project.summary?.totalPrice || 0) / count;
        project.rooms.forEach((room) => {
          roomCosts[room.id] = Math.round(share);
        });
      }

      const total = project.summary?.totalPrice || 0;
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
        link.download = `Progress_Invoice_${project.id || 'N/A'}.pdf`;
        link.click();
      } else {
        alert('Could not generate progress invoice PDF.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate progress invoice PDF.');
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
    
    // Prevent scrolling on mobile devices when signing
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

      // 1. Auto-launch Stripe invoice for 30% upfront deposit FIRST
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
            clientEmail: client?.email || 'aalnasih4846@gmail.com',
            clientName: client?.name || signerName.trim(),
            amount: firstAmount, // 30% upfront deposit
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

      // Create Paint Scout-style installment tracking structure!
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

      // Update local state so UI reacts instantly
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

      // 3. Generate the PDF of the signed proposal
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
            email: client?.email || 'aalnasih4846@gmail.com',
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
          clientEmail: client?.email || 'aalnasih4846@gmail.com',
          projectDate: project.createdAt ? project.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          proposalNo: project.id,
          generalNotes: project.generalNotes || '',
          termsAndConditions: project.termsAndConditions || '',
          signatureDataUrl: sigBase64,
        });

        // Trigger email dispatch if contractorAccessToken is present
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
            to: client?.email || 'aalnasih4846@gmail.com',
            bcc: 'aalnasih4846@gmail.com',
            subject: emailSubject,
            body: emailBody,
            pdfBase64: proposalPdfBase64,
            pdfFilename: `Signed_Proposal_${project.id}.pdf`
          });
        }
      } catch (err) {
        console.error("Failed to generate PDF or auto-send signed proposal email:", err);
      }

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

      // Update database
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

      alert('Simulated Stripe Payment Successful! Receipt has been updated.');
    } catch (err) {
      console.error(err);
      alert('Failed to process payment.');
    }
  };

  // Compute estimate totals
  const getTotals = () => {
    if (!project) return { subtotal: 0, hst: 0, total: 0, deposit: 0, balance: 0 };
    const subtotal = project.summary.totalPrice / 1.13; // Reconstruct subtotal
    const hst = project.summary.totalPrice - subtotal;
    const total = project.summary.totalPrice;
    const deposit = total * 0.30;
    const balance = total - deposit;
    return { subtotal, hst, total, deposit, balance };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4 font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 text-sm font-mono animate-pulse">Loading Secure PaintNav Proposal Portal...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 font-sans">
        <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-400 font-display">Portal Access Blocked</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">{error || 'This estimate record could not be fetched.'}</p>
          <div className="pt-2">
            {onBackToApp ? (
              <button 
                onClick={onBackToApp}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Go to PaintNav CRM
              </button>
            ) : (
              <p className="text-[11px] text-zinc-500">Please contact your professional contractor for assistance.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { subtotal, hst, total, deposit, balance } = getTotals();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none antialiased">
      {/* 1. SECURE PORTAL HEADER */}
      <header className="bg-zinc-900/80 backdrop-blur-md border-b border-neutral-850/60 sticky top-0 z-40 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Paintbrush className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-display font-black tracking-wider text-white flex items-center gap-1.5 leading-none">
              PAINTNAV <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono uppercase tracking-widest">E-Sign</span>
            </h1>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Secure Homeowner Approval Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Secured
          </span>
          {onBackToApp && (
            <button 
              onClick={onBackToApp}
              className="px-3.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-white font-bold text-xs rounded-lg cursor-pointer transition"
            >
              Exit Portal
            </button>
          )}
        </div>
      </header>

      {/* 2. SUCCESS OVERLAY STATE */}
      {isSignedSuccess ? (
        <div className="flex-grow max-w-5xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Contract Status & Success Meta */}
          <div className="md:col-span-5 space-y-6 bg-zinc-900 border border-neutral-850 p-6 rounded-2xl text-center md:text-left">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mx-auto md:mx-0"
            >
              <CheckCircle className="w-8 h-8 animate-pulse" />
            </motion.div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-display font-black tracking-tight text-white">Proposal Signed & Approved!</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Thank you! Your digital signature has been legally authorized and securely stored. A compiled PDF contract copy was dispatched to both parties.
              </p>
            </div>

            <div className="bg-zinc-950 border border-neutral-850 rounded-xl p-4 text-left space-y-2.5 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between border-b border-neutral-850/60 pb-2">
                <span className="text-zinc-500">Proposal ID:</span>
                <span className="text-white font-bold">#{project.id}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-850/60 pb-2">
                <span className="text-zinc-500">Legal Signer:</span>
                <span className="text-white font-bold">{project.signerName || signerName}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-850/60 pb-2">
                <span className="text-zinc-500">Relation:</span>
                <span className="text-white">{project.signerTitle || signerTitle || 'Homeowner'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Timestamp:</span>
                <span className="text-emerald-400 font-bold">{project.signedDate ? new Date(project.signedDate).toLocaleString() : new Date().toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 text-zinc-500 text-[10px] leading-relaxed">
              You can bookmark this page to view real-time payment updates or pay outstanding balances.
            </div>
          </div>

          {/* Right: Paint Scout-Style Installment & Receipt Dashboard */}
          <div className="md:col-span-7 bg-zinc-900 border border-neutral-850 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-850/60 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Invoice Receipt & Payment Schedule</h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Manage installment payments and review financial receipts below.
                </p>
              </div>
              <button
                onClick={downloadFullInvoicePDF}
                className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] font-mono rounded-lg transition shadow-md shadow-blue-600/10 cursor-pointer border border-blue-500/30 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD INVOICE</span>
              </button>
            </div>

            {/* Financial Health Summary */}
            {(() => {
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

              const totalPaid = activeInstallments
                .filter(inst => inst.status === 'Paid')
                .reduce((sum, inst) => sum + inst.amount, 0);

              const totalRequested = activeInstallments
                .filter(inst => inst.status === 'Requested')
                .reduce((sum, inst) => sum + inst.amount, 0);

              const grandTotal = project.summary.totalPrice || 0;
              const remainingBalance = Math.max(0, grandTotal - totalPaid);

              return (
                <>
                  {/* Bento Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-950 border border-neutral-850/60 p-3.5 rounded-xl">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Total Estimate</span>
                      <span className="text-sm font-bold text-zinc-200 font-mono block mt-1">
                        ${grandTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-zinc-950 border border-neutral-850/60 p-3.5 rounded-xl">
                      <span className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-wider font-mono">Paid to Date</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono block mt-1">
                        ${totalPaid.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-zinc-950 border border-neutral-850/60 p-3.5 rounded-xl">
                      <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider font-mono">Remaining</span>
                      <span className="text-sm font-bold text-amber-400 font-mono block mt-1">
                        ${remainingBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Progress Paid: {grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0}%</span>
                      <span>{totalPaid === grandTotal ? 'Paid in Full' : `${grandTotal > 0 ? Math.round((remainingBalance / grandTotal) * 100) : 0}% Outstanding`}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-neutral-850/40 flex">
                      <div 
                        style={{ width: `${grandTotal > 0 ? (totalPaid / grandTotal) * 100 : 0}%` }} 
                        className="h-full bg-emerald-500 transition-all duration-500"
                      />
                      <div 
                        style={{ width: `${grandTotal > 0 ? (totalRequested / grandTotal) * 100 : 0}%` }} 
                        className="h-full bg-amber-500 transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Installments Table */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Installment Breakdown</span>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {activeInstallments.map((inst, index) => {
                        const isDraft = inst.status === 'Draft';
                        const isRequested = inst.status === 'Requested';
                        const isPaid = inst.status === 'Paid';

                        return (
                          <div 
                            key={inst.id || index} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition ${
                              isPaid 
                                ? 'bg-emerald-950/10 border-emerald-500/20' 
                                : isRequested 
                                  ? 'bg-amber-950/10 border-amber-500/30' 
                                  : 'bg-zinc-950/40 border-neutral-850'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{inst.name}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">({inst.percentage}%)</span>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {isPaid 
                                  ? `Receipt: Paid on ${inst.paidAt || 'N/A'}` 
                                  : isRequested 
                                    ? `Invoice requested on ${inst.requestedAt || 'N/A'}` 
                                    : 'Upcoming installment (unbilled)'
                                }
                              </p>
                            </div>

                            <div className="flex items-center gap-3 mt-3 sm:mt-0 shrink-0">
                              <span className="text-xs font-bold text-zinc-200 font-mono">${inst.amount.toLocaleString()}</span>
                              
                              {isPaid ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
                                    Paid
                                  </span>
                                  <button
                                    onClick={() => downloadReceiptPDF(inst)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                    title="Download receipt PDF"
                                  >
                                    <Download className="w-3 h-3" />
                                    Receipt
                                  </button>
                                </div>
                              ) : isRequested ? (
                                <div className="flex items-center gap-1.5">
                                  {inst.stripeInvoiceUrl ? (
                                    <a
                                      href={inst.stripeInvoiceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-[10px] font-black rounded-lg transition"
                                    >
                                      Pay with Stripe
                                    </a>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded">
                                      Requested
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleClientPayInstallmentDemo(inst.id)}
                                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-semibold rounded-lg transition"
                                    title="Demo payment emulation"
                                  >
                                    Demo Pay
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded font-mono">
                                  Draft
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        /* 3. ACTIVE REVIEW AND SIGNING LAYOUT */
        <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CONTRACT VIEW BOARD (COL-7) */}
          <section className="lg:col-span-7 bg-zinc-900 border border-neutral-850/60 rounded-2xl overflow-hidden shadow-xl">
            {/* Lead Meta Banner */}
            <div className="bg-gradient-to-r from-neutral-900 to-zinc-900 px-6 py-5 border-b border-neutral-850/60">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-mono text-[10px] font-bold">
                  Estimate Reference #{project.id}
                </span>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> Est: {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
              <h2 className="text-lg font-display font-black text-white truncate">{project.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">{project.description}</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-800">
                <p className="text-[10px] text-zinc-500">
                  Review contract details. You can also export/print a draft copy.
                </p>
                <button
                  onClick={downloadFullInvoicePDF}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] font-mono rounded-lg transition border border-neutral-750 cursor-pointer shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>DOWNLOAD PROPOSAL</span>
                </button>
              </div>
            </div>

            {/* Client Info Grid */}
            {client && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 py-4 bg-zinc-900/40 border-b border-neutral-850/60 text-xs text-zinc-400">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Service Recipient</span>
                  <div className="space-y-1">
                    <p className="text-white font-bold font-mono text-sm">{client.name}</p>
                    {client.company && <p className="text-zinc-300 font-semibold">{client.company}</p>}
                    <p className="flex items-center gap-1.5 text-zinc-400"><MapPin className="w-3.5 h-3.5 shrink-0" /> {client.address}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Contact Coordinates</span>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {client.email}</p>
                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {client.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Body Details */}
            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar text-xs">
              
              {/* Itemized Paint Scope */}
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-black flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" /> Professional Coating Scope
                </h3>
                
                <div className="space-y-3">
                  {project.rooms && project.rooms.length > 0 ? (
                    project.rooms.map((room) => (
                      <div key={room.id} className="bg-zinc-950 rounded-xl border border-neutral-850 p-4 space-y-2">
                        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                          <span className="font-bold text-white text-xs">{room.name} {room.isOption && <span className="text-[10px] text-amber-400 ml-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Option Item</span>}</span>
                          <span className="font-mono text-zinc-500 text-[10px]">L: {room.length}' × W: {room.width}' × H: {room.height}'</span>
                        </div>
                        {room.paints && room.paints.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                            {room.paints.map((paint, index) => (
                              <div key={index} className="bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-850/40 space-y-1">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">{paint.surface || 'Surface Coating'}</span>
                                <p className="text-white font-bold">{paint.brand} - {paint.colorName}</p>
                                <div className="flex items-center gap-2 text-[10px]">
                                  {paint.hex && <div className="w-3 h-3 rounded-full border border-neutral-700 shrink-0" style={{ backgroundColor: paint.hex }} />}
                                  <span>{paint.finish} Finish • {paint.coats} Coats</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-zinc-600 text-[11px] italic">No surface paint formulas configured.</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 bg-zinc-950 rounded-xl border border-neutral-850 text-zinc-500 italic">
                      No distinct room coatings configured.
                    </div>
                  )}
                </div>
              </div>

              {/* Inclusions, Exclusions & Special Terms */}
              {(project.inclusions || project.exclusions || project.specialConditions) && (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {project.inclusions && (
                    <div className="bg-emerald-950/10 border border-emerald-900/20 p-4 rounded-xl space-y-1">
                      <h4 className="font-bold text-emerald-400 text-[10px] uppercase tracking-wider font-mono">Inclusions / In-Scope prep</h4>
                      <p className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-line">{project.inclusions}</p>
                    </div>
                  )}
                  {project.exclusions && (
                    <div className="bg-red-950/10 border border-red-900/20 p-4 rounded-xl space-y-1">
                      <h4 className="font-bold text-red-400 text-[10px] uppercase tracking-wider font-mono">Exclusions / Out-of-Scope</h4>
                      <p className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-line">{project.exclusions}</p>
                    </div>
                  )}
                  {project.specialConditions && (
                    <div className="bg-zinc-950 border border-neutral-850 p-4 rounded-xl space-y-1">
                      <h4 className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider font-mono">Special Weather/Site Conditions</h4>
                      <p className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-line">{project.specialConditions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Legal Terms & Conditions */}
              <div className="bg-zinc-950 border border-neutral-850 p-4 rounded-xl space-y-1.5 text-zinc-500 text-[10px]">
                <h4 className="font-bold text-zinc-400 uppercase tracking-wider font-mono">Contract Terms & Conditions</h4>
                <p className="leading-relaxed">
                  1. Payments are due within 7 days of invoice submission unless stipulated otherwise. A 30% deposit is required before scheduling mobilization.
                  <br />
                  2. All materials specified will be applied according to professional standard practices. Contractor represents full liability coverage and painter certifications.
                  <br />
                  3. By adding your digital electronic signature, both parties agree to execute this agreement digitally, representing fully enforceable parameters.
                </p>
              </div>

            </div>

            {/* Pricing Total Summary Board */}
            <div className="bg-neutral-900 px-6 py-4 border-t border-neutral-850/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Contract Total</span>
                <p className="text-lg font-black text-white font-mono flex items-center leading-none">
                  <DollarSign className="w-4 h-4 text-zinc-400 -mr-0.5" />{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">HST tax (13%)</span>
                <p className="text-zinc-300 font-bold font-mono">${hst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">30% Deposit Due</span>
                <p className="text-amber-400 font-black font-mono">${deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Final Balance</span>
                <p className="text-zinc-400 font-semibold font-mono">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </section>

          {/* RIGHT: SIGNATURE AND ACTION CAPTURE CARD (COL-5) */}
          <section className="lg:col-span-5 bg-zinc-900 border border-neutral-850/60 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="space-y-1.5">
              <h3 className="font-display font-black text-base text-white flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-blue-500" /> Digital Authorization Lock
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Provide your legal electronic signature details below. This will validate and lock the contract directly into the company database system.
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Authorized Signer Full Name</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-zinc-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Relationship / Title</label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="e.g. Homeowner, Spouse, Property Manager"
                  className="w-full bg-zinc-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Signature Area Tabs */}
            <div className="space-y-3.5">
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-neutral-850/60">
                <button
                  onClick={() => setSignMethod('draw')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer flex items-center justify-center gap-1.5 transition ${signMethod === 'draw' ? 'bg-neutral-900 text-white shadow-md border border-neutral-800' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Draw Signature
                </button>
                <button
                  onClick={() => setSignMethod('type')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer flex items-center justify-center gap-1.5 transition ${signMethod === 'type' ? 'bg-neutral-900 text-white shadow-md border border-neutral-800' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Type className="w-3.5 h-3.5" /> Type Script
                </button>
              </div>

              {signMethod === 'draw' ? (
                <div className="space-y-2">
                  <div className="bg-white rounded-xl border-2 border-neutral-800 overflow-hidden relative">
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
                      onClick={clearCanvas}
                      className="absolute right-3 bottom-3 px-2 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-[10px] text-zinc-700 font-bold font-mono rounded cursor-pointer shadow-sm transition"
                    >
                      Clear Canvas
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" /> Use your mouse or finger to sign inside the canvas area.
                  </span>
                </div>
              ) : (
                <div className="bg-zinc-950 p-4 rounded-xl border border-neutral-850 space-y-1.5 min-h-[140px] flex flex-col justify-center">
                  <span className="text-[9px] text-zinc-600 font-mono block">LIVE DIGITAL SCRIPT PREVIEW:</span>
                  <div className="font-mono text-zinc-300 font-black italic text-2xl tracking-wider py-2 select-none border-b border-neutral-900 overflow-hidden truncate">
                    {signerName || 'Signature Script'}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    System will automatically transform your typed name into an official digital signature authorization stamp.
                  </span>
                </div>
              )}
            </div>

            {/* Legal Acknowledgment */}
            <div className="bg-zinc-950/40 p-4 rounded-xl border border-neutral-850 text-[10px] text-zinc-500 leading-relaxed space-y-1">
              <span className="font-bold text-zinc-400 font-mono uppercase block tracking-wider">Uniform Electronic Transactions</span>
              <p>
                By clicking "Sign & Approve Proposal", I acknowledge that this electronic signature represents a legally binding execution of this painting services contract, equivalent to an ink-on-paper signature.
              </p>
            </div>

            {/* Submit Actions */}
            <button
              onClick={handleSubmitSignature}
              disabled={isSubmitting || !signerName.trim() || (signMethod === 'draw' && !canvasHasContent)}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-lg shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Securing Contract...
                </span>
              ) : '✍️ Sign & Approve Proposal'}
            </button>
          </section>

        </main>
      )}

      {/* FOOTER */}
      <footer className="bg-zinc-900/40 border-t border-neutral-850/40 py-4 px-6 text-center text-[10px] text-zinc-600 font-mono mt-auto">
        PaintNav CRM Secure Client Portal • Authorized Service Agreement Execution Suite • UTC 2026
      </footer>
    </div>
  );
}
