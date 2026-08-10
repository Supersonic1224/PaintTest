import React, { useState, useEffect, useMemo } from 'react';
import { ClientLead, ProjectDetails as ProjectType, RoomSpec, ProjectTask, SurfaceTask, PaintColor, ProposalSettings, DEFAULT_PROPOSAL_SETTINGS, Installment } from '../types';
import { googleSignIn, setAccessToken } from '../firebase';
import { sendProposalEmail } from '../gmailService';
import { generateProposalPDF, generateReceiptPDF } from '../pdfGenerator';
import { uploadProjectPhotoToSupabaseBucket } from '../supabaseService';
import { getUniqueRoomName } from '../utils/roomUtils';
import { calculateRoomPricing, getAreaCoatMultiplier, getItemCoatHours, getProductForSurface, DEFAULT_REAL_PRODUCTS } from '../utils/pricing';
import { APIProvider } from '@vis.gl/react-google-maps';
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Save, 
  CheckSquare, 
  Paintbrush, 
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Hash,
  DollarSign,
  ChevronRight,
  ChevronDown,
  Copy,
  X,
  Send,
  Share2,
  Eye,
  Download,
  RefreshCw,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Camera,
  Upload,
  FileText,
  CreditCard,
  Menu,
  ShieldAlert,
  Globe,
  ExternalLink,
  Diamond,
  FolderPlus,
  Folder,
  FolderOpen,
  Target,
  ListTodo,
  Edit3,
  Layers,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectDetailsProps {
  key?: string;
  project: ProjectType;
  client: ClientLead;
  driveToken: string | null;
  dbProvider?: 'firestore' | 'supabase';
  onBack: () => void;
  onSaveProject: (updated: ProjectType) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onSaveClient?: (updatedClient: ClientLead) => Promise<void>;
  onOpenMenu?: () => void;
}

// Define interface for custom area preset
interface AreaPreset {
  label: string;
  calcType: 'wall' | 'ceiling' | 'perimeter' | 'item';
  defaultQty: number | 'auto';
  defaultCoats: number;
}

const PRESET_AREAS: Record<'interior' | 'exterior' | 'deck', AreaPreset[]> = {
  interior: [
    { label: 'Accent Wall', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Crown Moulding', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Chair Rail', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Wainscoting', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Baseboard Accent', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Accent Ceiling', calcType: 'ceiling', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Cabinets (Qty)', calcType: 'item', defaultQty: 10, defaultCoats: 2 },
    { label: 'Closet Shelving', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Door Trim (Qty)', calcType: 'item', defaultQty: 2, defaultCoats: 2 },
    { label: 'Fireplace Mantel', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { label: 'Stairs/Spindles', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { label: 'Radiators (Qty)', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
  ],
  exterior: [
    { label: 'Whole House', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Front side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Right side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Left side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Back side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'doors', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { label: 'Windows', calcType: 'item', defaultQty: 2, defaultCoats: 2 },
    { label: 'Fence', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Shed', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { label: 'Porch', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Garage Doors', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { label: 'Deck Horizontal Surface', calcType: 'ceiling', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Deck', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
  ],
  deck: [
    { label: 'Deck Horizontal Surface', calcType: 'ceiling', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Fence', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Spindles and Railings', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { label: 'Stairs', calcType: 'item', defaultQty: 5, defaultCoats: 2 },
    { label: 'Deck', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
  ],
};

// Define interface for Room config options
interface AreaConfig {
  checked: boolean;
  qty: number | 'auto';
  coats: number;
}

export default function ProjectDetails({
  project,
  client,
  driveToken,
  dbProvider,
  onBack,
  onSaveProject,
  onDeleteProject,
  onSaveClient,
  onOpenMenu,
}: ProjectDetailsProps) {

  // Localized form states
  const [proposalNo, setProposalNo] = useState(project.id);
  const [clientName, setClientName] = useState(client.name);
  const [clientAddress, setClientAddress] = useState(client.address || '');
  const [clientPhone, setClientPhone] = useState(client.phone || '');
  const [clientEmail, setClientEmail] = useState(client.email || '');
  const [projectDate, setProjectDate] = useState(() => {
    try {
      return project.createdAt ? project.createdAt.slice(0, 10) : '2026-06-10';
    } catch {
      return '2026-06-10';
    }
  });

  // Interactive Client Signature & Acceptance state variables
  const [clientSigned, setClientSigned] = useState<boolean>(() => {
    if (project.clientSigned !== undefined) return project.clientSigned;
    return localStorage.getItem(`proposal-signed-${project.id}`) === 'true';
  });
  const [signerName, setSignerName] = useState<string>(() => {
    if (project.signerName) return project.signerName;
    return localStorage.getItem(`signer-name-${project.id}`) || client.name || '';
  });
  const [signerTitle, setSignerTitle] = useState<string>(() => {
    if (project.signerTitle) return project.signerTitle;
    return localStorage.getItem(`signer-title-${project.id}`) || 'Homeowner';
  });
  const [signedDate, setSignedDate] = useState<string>(() => {
    if (project.signedDate) return project.signedDate;
    return localStorage.getItem(`signer-date-${project.id}`) || '';
  });

  // Gmail Sender integration state variables
  const [localToken, setLocalToken] = useState<string | null>(driveToken);
  const [gmailRecipient, setGmailRecipient] = useState<string>(client.email || '');
  const [gmailSubject, setGmailSubject] = useState<string>(`Proposal - Painting Estimate for ${client.name} (#${project.id})`);
  const [gmailMessage, setGmailMessage] = useState<string>(
    `Hi ${client.name},\n\nPlease find attached the painting proposal for your project (#${project.id}).\n\nYou can review, approve, and sign this proposal instantly online by clicking the "Review & Sign Proposal Online" button below, or view the attached official PDF document.\n\nThank you,\nPaintNav Estimating Team`
  );
  const [isSendingGmail, setIsSendingGmail] = useState<boolean>(false);
  const [gmailSuccess, setGmailSuccess] = useState<boolean>(false);
  const [gmailError, setGmailError] = useState<string>('');
  const [gmailAuthError, setGmailAuthError] = useState<'popup-blocked' | 'unauthorized-domain' | 'generic' | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const renderErrorWithLinks = (errorText: string) => {
    if (!errorText) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = errorText.split(urlRegex);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-bold break-all inline"
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </span>
    );
  };

  // Sync localToken with driveToken when it changes
  useEffect(() => {
    if (driveToken) {
      setLocalToken(driveToken);
    }
  }, [driveToken]);

  // Google Maps Platform Integration States
  const [isVerifyingAddress, setIsVerifyingAddress] = useState<boolean>(false);
  const [addressVerified, setAddressVerified] = useState<boolean>(false);
  const [showMapsConfigModal, setShowMapsConfigModal] = useState<boolean>(false);
  const [mapsErrorType, setMapsErrorType] = useState<'NONE' | 'BILLING' | 'DENIED'>('NONE');
  const [showOfflineFallbackModal, setShowOfflineFallbackModal] = useState<boolean>(false);
  const [showSendProposalEmailModal, setShowSendProposalEmailModal] = useState<boolean>(false);
  const [presetTab, setPresetTab] = useState<'interior' | 'exterior' | 'deck'>('interior');

  // Stripe Integration States
  const [isSendingStripe, setIsSendingStripe] = useState<boolean>(false);
  const [stripeInvoiceUrl, setStripeInvoiceUrl] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [showStripeConfigModal, setShowStripeConfigModal] = useState<boolean>(false);

  const GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const hasMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

  const formatAddressLocally = (addr: string): string => {
    if (!addr) return '';
    let clean = addr.replace(/\s+/g, ' ').trim();
    const segments = clean.split(',').map(seg => {
      let s = seg.trim();
      let words = s.split(' ').map(word => {
        if (!word) return '';
        const lowerWord = word.toLowerCase();
        
        // State/province codes (2-letter abbreviations)
        if (lowerWord.length === 2 && /^(on|qc|ns|nb|mb|bc|pe|sk|ab|nl|yt|nt|nu|ny|ca|tx|fl|il|pa|oh|ga|nc|mi|nj|va|wa|az|ma|co|md|tn|wi|mn|co|hi|or|ok|ar|la|ms|al|sc|ky|wv|in|ia|mo|ne|ks|sd|nd|wy|mt|id|nv|ut|nm|wy)$/i.test(lowerWord)) {
          return lowerWord.toUpperCase();
        }
        
        // Common street suffixes
        if (/^(st|ave|rd|blvd|dr|ln|pkwy|ct|crt|pl|sq|ter|way|hwy|cl|cres)$/i.test(lowerWord)) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }

        // Postal Codes or Zip Codes
        if (/^[a-z]\d[a-z]$/i.test(lowerWord) || /^\d[a-z]\d$/i.test(lowerWord) || /^\d{5}(-\d{4})?$/.test(lowerWord)) {
          return lowerWord.toUpperCase();
        }
        
        // Default: Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
      return words.join(' ');
    });
    
    return segments.join(', ');
  };

  const handleApplyOfflineFallback = () => {
    const formatted = formatAddressLocally(clientAddress);
    if (formatted) {
      setClientAddress(formatted);
      setAddressVerified(true);
      triggerNotification('Address auto-corrected locally (Smart Fallback Mode)!', 'success');
    }
    setShowOfflineFallbackModal(false);
  };

  const handleVerifyAddress = () => {
    if (!hasMapsKey) {
      setMapsErrorType('NONE');
      setShowMapsConfigModal(true);
      return;
    }

    if (!clientAddress.trim()) {
      triggerNotification('Please enter an address to verify.', 'error');
      return;
    }

    setIsVerifyingAddress(true);
    setMapsErrorType('NONE');
    
    const processGeocodeResult = (results: any, status: any) => {
      setIsVerifyingAddress(false);
      if (status === 'OK' && results && results[0]) {
        const formatted = results[0].formatted_address;
        setClientAddress(formatted);
        setAddressVerified(true);
        triggerNotification('Address auto-corrected and verified successfully via Google Maps!', 'success');
      } else {
        console.error('Geocoding status:', status);
        
        // Auto-apply local formatting fallback immediately so user has a working polished address
        const formatted = formatAddressLocally(clientAddress);
        if (formatted) {
          setClientAddress(formatted);
          setAddressVerified(true);
        }

        // Check for billing or denial issues
        if (status === 'REQUEST_DENIED' || (status && status.toString().includes('billing'))) {
          setMapsErrorType('BILLING');
          setShowMapsConfigModal(true);
          triggerNotification('Billing or API Key restriction detected. Auto-corrected via local fallback!', 'success');
        } else {
          triggerNotification(`Maps API returned: ${status}. Auto-corrected via local fallback!`, 'success');
        }
      }
    };

    const win = window as any;
    if (typeof window !== 'undefined' && win.google && win.google.maps) {
      try {
        const geocoder = new win.google.maps.Geocoder();
        geocoder.geocode({ address: clientAddress }, (results: any, status: any) => {
          processGeocodeResult(results, status);
        });
      } catch (err) {
        setIsVerifyingAddress(false);
        console.error('Geocoding error:', err);
        setShowOfflineFallbackModal(true);
        triggerNotification('Address verification encountered an issue. Showing offline fallback.', 'error');
      }
    } else {
      // Lazy load retry
      setTimeout(() => {
        if (typeof window !== 'undefined' && win.google && win.google.maps) {
          try {
            const geocoder = new win.google.maps.Geocoder();
            geocoder.geocode({ address: clientAddress }, (results: any, status: any) => {
              processGeocodeResult(results, status);
            });
          } catch (e) {
            setIsVerifyingAddress(false);
            setShowOfflineFallbackModal(true);
            triggerNotification('Address verification engine is initializing. Showing offline fallback.', 'success');
          }
        } else {
          setIsVerifyingAddress(false);
          setShowOfflineFallbackModal(true);
          triggerNotification('Google Maps script is loading. Showing offline fallback.', 'success');
        }
      }, 1200);
    }
  };

  // State parameter for Labor hourly rate - precisely customized to the reference
  const [hourlyLaborRate, setHourlyLaborRate] = useState<number>(() => {
    if (project.id === '26061001') return 101.13;
    const saved = localStorage.getItem('proposal_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.rates?.hourlyLaborRate) {
          return parsed.rates.hourlyLaborRate;
        }
      } catch (e) {}
    }
    return 85.00;
  });

  const [taxRate, setTaxRate] = useState<number>(() => {
    return project.summary.taxRate ?? 0.13;
  });

  const [discount, setDiscount] = useState<number>(() => {
    return project.summary.discount ?? 0;
  });

  const [status, setStatus] = useState<ProjectType['status']>(project.status);
  const [installments, setInstallments] = useState<Installment[]>(() => {
    return project.installments || [];
  });
  const [showCustomInvoiceModal, setShowCustomInvoiceModal] = useState<boolean>(false);
  const [customInvoicePercent, setCustomInvoicePercent] = useState<number>(30);
  const [customInvoiceAmount, setCustomInvoiceAmount] = useState<number>(0);
  const [customInvoiceName, setCustomInvoiceName] = useState<string>("Upfront Deposit (30%)");

  // Payment Received & Send Receipt Modals
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptInstallments, setReceiptInstallments] = useState<Installment[]>([]);
  const [activeReceiptInstallmentId, setActiveReceiptInstallmentId] = useState<string | null>(null);
  const [receiptSubject, setReceiptSubject] = useState<string>('');
  const [receiptMessage, setReceiptMessage] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<string>('Stripe');
  const [isSendingReceipt, setIsSendingReceipt] = useState<boolean>(false);

  // Send Payment Request Modal
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestInstallmentId, setRequestInstallmentId] = useState<string>('');
  const [requestSubject, setRequestSubject] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);
  const [inclusions, setInclusions] = useState(project.inclusions || '');
  const [exclusions, setExclusions] = useState(project.exclusions || '');
  const [specialConditions, setSpecialConditions] = useState(project.specialConditions || '');
  const [teamNotes, setTeamNotes] = useState(project.teamNotes || '');
  const [selectedRoomIds, setSelectedRoomIds] = useState<Record<string, boolean>>({});
  const [selectedAreas, setSelectedAreas] = useState<Record<string, boolean>>({});
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [addingAreaRoomId, setAddingAreaRoomId] = useState<string | null>(null);

  const [generalNotes, setGeneralNotes] = useState(() => {
    if (project.generalNotes !== undefined) return project.generalNotes;
    const saved = localStorage.getItem('proposal_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.interiorGeneralNotes || parsed.generalNotes || '';
      } catch (e) {}
    }
    return '';
  });

  const [termsAndConditions, setTermsAndConditions] = useState(() => {
    if (project.termsAndConditions !== undefined) return project.termsAndConditions;
    const saved = localStorage.getItem('proposal_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.termsAndConditions || '';
      } catch (e) {}
    }
    return '';
  });

  const [proposalSettings, setProposalSettings] = useState<ProposalSettings>(() => {
    const saved = localStorage.getItem('proposal_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_PROPOSAL_SETTINGS;
  });

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('proposal_settings');
      if (saved) {
        try {
          setProposalSettings(JSON.parse(saved));
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener('proposal_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('proposal_settings_updated', handleUpdate);
    };
  }, []);

  const [rooms, setRooms] = useState<RoomSpec[]>(() => {
    // If the project is the mockup baseline (ID 26061001) and has no rooms, seed with Entrance.
    // Otherwise, start cleanly with no configured room specs if the user has none.
    if (project.rooms.length === 0) {
      if (project.id === '26061001') {
        const defaultEntrance: RoomSpec = {
          id: 'room-entrance',
          name: 'Entrance',
          length: 15,
          width: 12,
          height: 9,
          wallsArea: 486,
          ceilingArea: 180,
          paints: [],
          walls: { checked: true, qty: 'auto', coats: 2 },
          ceilings: { checked: true, qty: 'auto', coats: 2 },
          baseboards: { checked: true, qty: 'auto', coats: 2 },
          windows: { checked: true, qty: 2, coats: 2 },
          doors: { checked: true, qty: 2, coats: 2 },
          doorFrames: { checked: true, qty: 2, coats: 2 },
          wallPaintType: 'Standard'
        } as any;
        return [defaultEntrance];
      }
      return [];
    }
    
    // Ensure existing rooms have default area config so the system never crashes
    return project.rooms.map(r => ({
      ...r,
      walls: r.walls || { checked: true, qty: 'auto', coats: 2 },
      ceilings: r.ceilings || { checked: true, qty: 'auto', coats: 2 },
      baseboards: r.baseboards || { checked: true, qty: 'auto', coats: 2 },
      windows: r.windows || { checked: true, qty: 2, coats: 2 },
      doors: r.doors || { checked: true, qty: 2, coats: 2 },
      doorFrames: r.doorFrames || { checked: true, qty: 2, coats: 2 },
      wallPaintType: (r as any).wallPaintType || 'Standard'
    }));
  });

  // Active configurations in "NEW ROOM CONFIG" sidecard
  const [cfgCategory, setCfgCategory] = useState<'interior' | 'exterior' | 'deck'>('interior');
  const [cfgLength, setCfgLength] = useState<number>(12);
  const [cfgWidth, setCfgWidth] = useState<number>(12);
  const [cfgCeilingHeight, setCfgCeilingHeight] = useState<number>(9);
  const [cfgWallPaint, setCfgWallPaint] = useState<string>('Standard');
  const [configChecked, setConfigChecked] = useState({
    walls: true,
    ceilings: true,
    baseboards: true,
    windows: true,
    doors: true,
    doorFrames: true,
  });
  const [configQty, setConfigQty] = useState({
    windows: 2,
    doors: 2,
    doorFrames: 2,
  });
  const [configCoats, setConfigCoats] = useState({
    walls: 2,
    ceilings: 2,
    baseboards: 2,
    windows: 2,
    doors: 2,
    doorFrames: 2,
  });

  // Surface Category Tasks State
  const [categoryTasks, setCategoryTasks] = useState<Record<'interior' | 'exterior' | 'deck', SurfaceTask[]>>({
    interior: [],
    exterior: [],
    deck: [
      { id: 'dt-1', text: 'Washing', completed: true, surfaceCategory: 'Deck Prep' },
      { id: 'dt-2', text: 'Striping', completed: true, surfaceCategory: 'Deck Prep' },
      { id: 'dt-3', text: 'Reviving', completed: true, surfaceCategory: 'Deck Prep' },
      { id: 'dt-4', text: 'Sanding', completed: true, surfaceCategory: 'Deck Prep' },
      { id: 'dt-5', text: 'Staining', completed: true, surfaceCategory: 'Deck Finishing' },
    ],
  });
  const [newTaskInput, setNewTaskInput] = useState<string>('');
  const [newTaskSurfaceCategory, setNewTaskSurfaceCategory] = useState<string>('Walls');
  const [newTaskIsOption, setNewTaskIsOption] = useState<boolean>(false);
  const [roomTaskIsOption, setRoomTaskIsOption] = useState<Record<string, boolean>>({});

  // Modals / Alerts feedback statuses
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [alertText, setAlertText] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Expanded room accordion indices track
  const [expandedRoomIds, setExpandedRoomIds] = useState<Record<string, boolean>>({
    'room-entrance': false
  });

  const toggleRoomExpand = (roomId: string) => {
    setExpandedRoomIds(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  // Expandable Table Row keys track (for detailed math cost breakdown per surface/task)
  const [expandedRowKeys, setExpandedRowKeys] = useState<Record<string, boolean>>({});

  const toggleRowExpand = (rowKey: string) => {
    setExpandedRowKeys(prev => ({
      ...prev,
      [rowKey]: !prev[rowKey]
    }));
  };

  // Group Batch Editing modal state
  const [editingGroupModalName, setEditingGroupModalName] = useState<string | null>(null);
  const [groupBatchTaskInput, setGroupBatchTaskInput] = useState<string>('');

  const handleGroupBatchSetCoats = (groupName: string, coats: number) => {
    setRooms(prev => prev.map(r => {
      if (r.groupName !== groupName) return r;
      const category = r.category || 'interior';
      let keysToUpdate: string[] = [];
      if (category === 'exterior') {
        keysToUpdate = ['ext-siding', 'ext-brick-stain', 'ext-porch-floor', 'ext-soffits', 'ext-gutters', 'ext-fascia', 'ext-trims', 'ext-garage-door', 'ext-doors', 'ext-windows-fixed', 'ext-railings', 'ext-shutters'];
      } else if (category === 'deck') {
        keysToUpdate = ['washing', 'stripping', 'reviving', 'sanding', 'staining'];
      } else {
        keysToUpdate = ['walls', 'ceilings', 'baseboards', 'windows', 'doors', 'doorFrames'];
      }

      const updatedObj: any = { ...r };
      keysToUpdate.forEach(k => {
        const cur = updatedObj[k] || { checked: true, qty: 'auto', coats: 2 };
        updatedObj[k] = { ...cur, coats };
      });

      if (updatedObj.customAreas) {
        updatedObj.customAreas = updatedObj.customAreas.map((c: any) => ({ ...c, coats }));
      }

      return updatedObj;
    }));
    triggerNotification(`Updated all surfaces in group "${groupName}" to ${coats} coat(s)!`, 'success');
  };

  const handleGroupBatchAddTask = (groupName: string, taskText: string) => {
    if (!taskText.trim()) return;
    setRooms(prev => prev.map(r => {
      if (r.groupName !== groupName) return r;
      const curTasks = r.surfaceTasks || [];
      const newTask: SurfaceTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: taskText.trim(),
        surfaceCategory: 'Group Task',
        completed: false,
        isOption: false,
      };
      return {
        ...r,
        surfaceTasks: [...curTasks, newTask]
      };
    }));

    setGroupBatchTaskInput('');
    triggerNotification(`Added task "${taskText.trim()}" to all rooms in group "${groupName}"!`, 'success');
  };

  const handleGroupBatchSetOption = (groupName: string, isOption: boolean) => {
    setRooms(prev => prev.map(r => {
      if (r.groupName !== groupName) return r;
      return { ...r, isOption };
    }));
    triggerNotification(`Set all rooms in group "${groupName}" to ${isOption ? 'Optional' : 'Standard Scope'}!`, 'success');
  };

  const handleGroupBatchSetCategory = (groupName: string, category: 'interior' | 'exterior' | 'deck') => {
    setRooms(prev => prev.map(r => {
      if (r.groupName !== groupName) return r;
      return { ...r, category };
    }));
    triggerNotification(`Updated category of group "${groupName}" to ${category}!`, 'success');
  };

  const handleGroupBatchDelete = (groupName: string) => {
    if (window.confirm(`Are you sure you want to delete group "${groupName}" and ALL its rooms?`)) {
      setRooms(prev => prev.filter(r => r.groupName !== groupName));
      setEditingGroupModalName(null);
      triggerNotification(`Deleted group "${groupName}"!`, 'success');
    }
  };

  // Selection feature & Room grouping state
  const [groupInputName, setGroupInputName] = useState<string>('');

  const handleToggleRoomSelection = (roomId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRoomIds(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  const handleToggleAreaSelection = (roomId: string, areaKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = `${roomId}::${areaKey}`;
    setSelectedAreas(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAllRooms = () => {
    const allIds = rooms.map(r => r.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedRoomIds[id]);
    if (allSelected) {
      setSelectedRoomIds({});
    } else {
      const next: Record<string, boolean> = {};
      allIds.forEach(id => { next[id] = true; });
      setSelectedRoomIds(next);
    }
  };

  const handleSelectAllRoomsInCategory = (categoryId: string, roomsList: RoomSpec[]) => {
    const catRoomIds = roomsList.filter(r => (r.category || 'interior') === categoryId).map(r => r.id);
    const allCatSelected = catRoomIds.length > 0 && catRoomIds.every(id => selectedRoomIds[id]);
    setSelectedRoomIds(prev => {
      const next = { ...prev };
      catRoomIds.forEach(id => {
        next[id] = !allCatSelected;
      });
      return next;
    });
  };

  // Group collapsing tracker
  const [collapsedGroupNames, setCollapsedGroupNames] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroupNames(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleGroupSelectedRooms = (headingName: string) => {
    const selectedIds = Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]);
    if (selectedIds.length === 0) {
      triggerNotification('Please select at least 1 room to group', 'error');
      return;
    }
    if (!headingName.trim()) {
      triggerNotification('Please enter a group heading name', 'error');
      return;
    }
    const cleanHeading = headingName.trim();
    setRooms(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, groupName: cleanHeading } : r));
    triggerNotification(`Grouped ${selectedIds.length} room${selectedIds.length > 1 ? 's' : ''} under "${cleanHeading}"`);
    setGroupInputName('');
    setSelectedRoomIds({});
  };

  const handleUngroupRooms = (headingName: string) => {
    setRooms(prev => prev.map(r => r.groupName === headingName ? { ...r, groupName: undefined } : r));
    triggerNotification(`Ungrouped rooms from "${headingName}"`);
  };

  const handleRenameGroup = (oldHeading: string) => {
    const newHeading = window.prompt(`Rename group "${oldHeading}" to:`, oldHeading);
    if (newHeading && newHeading.trim() && newHeading.trim() !== oldHeading) {
      setRooms(prev => prev.map(r => r.groupName === oldHeading ? { ...r, groupName: newHeading.trim() } : r));
      triggerNotification(`Renamed group to "${newHeading.trim()}"`);
    }
  };

  // Surface category tasks helpers
  const DEFAULT_DECK_TASKS = [
    { id: 'dt-1', text: 'Washing', completed: false, surfaceCategory: 'Deck Prep' },
    { id: 'dt-2', text: 'Stripping', completed: false, surfaceCategory: 'Deck Prep' },
    { id: 'dt-3', text: 'Reviving', completed: false, surfaceCategory: 'Deck Prep' },
    { id: 'dt-4', text: 'Sanding', completed: false, surfaceCategory: 'Deck Prep' },
    { id: 'dt-5', text: 'Staining', completed: false, surfaceCategory: 'Deck Finishing' },
  ];

  const getRoomTasks = (room: RoomSpec) => {
    if (room.surfaceTasks && room.surfaceTasks.length > 0) {
      return room.surfaceTasks;
    }
    if (room.category === 'deck') {
      return DEFAULT_DECK_TASKS;
    }
    return [];
  };

  const handleToggleRoomTask = (roomId: string, taskId: string) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const currentTasks = getRoomTasks(r);
      const updated = currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
      return { ...r, surfaceTasks: updated };
    }));
  };

  const handleToggleRoomTaskOption = (roomId: string, taskId: string) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const currentTasks = getRoomTasks(r);
      const updated = currentTasks.map(t => t.id === taskId ? { ...t, isOption: !t.isOption } : t);
      return { ...r, surfaceTasks: updated };
    }));
  };

  const handleAddRoomTask = (roomId: string, text: string, category: string = 'General', isOption: boolean = false) => {
    if (!text.trim()) return;
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const currentTasks = getRoomTasks(r);
      const newTask = {
        id: 'st-' + Math.random().toString(36).substring(2, 9),
        text: text.trim(),
        completed: false,
        surfaceCategory: category,
        isOption
      };
      return { ...r, surfaceTasks: [...currentTasks, newTask] };
    }));
  };

  const handleDeleteRoomTask = (roomId: string, taskId: string) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const currentTasks = getRoomTasks(r);
      return { ...r, surfaceTasks: currentTasks.filter(t => t.id !== taskId) };
    }));
  };

  // Helper trigger alerts
  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setAlertText({ message, type });
    setTimeout(() => setAlertText(null), 3000);
  };

  // Photos tracker: State with automated persistence
  const [photos, setPhotos] = useState<{ id: string; url: string; caption: string; createdAt: string }[]>(() => {
    // 1. First priority: Check if the project object itself contains photos (loaded from Supabase / Firestore)
    if (project.photos && project.photos.length > 0) {
      return project.photos;
    }

    // 2. Second priority: Fall back to localStorage if available
    try {
      const saved = localStorage.getItem(`proposal-photos-${project.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    // 3. Third priority: Pre-populate with high fidelity presets ONLY if this is the default mockup proposal (ID: 26061001)
    if (project.id === '26061001') {
      return [
        {
          id: 'photo-1',
          url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80',
          caption: 'Foyer plaster repairs and tape preparation',
          createdAt: new Date().toISOString()
        },
        {
          id: 'photo-2',
          url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
          caption: 'Premium primer baseboards coating application',
          createdAt: new Date().toISOString()
        }
      ];
    }

    // Otherwise, return a clean empty list for new proposals
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`proposal-photos-${project.id}`, JSON.stringify(photos));
    } catch (e) {
      console.error(e);
    }
  }, [photos, project.id]);

  // Handle local image uploads via client-side base64 FileReader with optional Supabase bucket upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(async (fileObj) => {
      const file = fileObj as File;

      // If active provider is Supabase, attempt bucket upload first!
      if (dbProvider === 'supabase') {
        try {
          triggerNotification(`Uploading "${file.name}" to Supabase storage...`, 'success');
          const publicUrl = await uploadProjectPhotoToSupabaseBucket(project.id, file);
          const newPhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: publicUrl,
            caption: file.name.split('.')[0] || 'Uncaptioned site photo',
            createdAt: new Date().toISOString()
          };
          setPhotos(prev => [...prev, newPhoto]);
          triggerNotification(`Photo "${file.name}" saved to Supabase successfully.`);
          return; // Skip base64 fallback since storage upload succeeded
        } catch (err: any) {
          console.warn('Supabase storage upload failed, falling back to local Base64 storage:', err);
          triggerNotification('Storage upload failed, saving locally in project database...', 'error');
        }
      }

      // Fallback: Read as base64 FileReader (compatible with Firestore or empty storage buckets)
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newPhoto = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: event.target.result as string,
            caption: file.name.split('.')[0] || 'Uncaptioned site photo',
            createdAt: new Date().toISOString()
          };
          setPhotos(prev => [...prev, newPhoto]);
          triggerNotification(`Photo "${file.name}" uploaded successfully.`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Track if changes have been made to rooms config vs the original rooms list
  const isDirty = useMemo(() => {
    if (project.rooms.length !== rooms.length) return true;
    if (project.id !== '26061001' && hourlyLaborRate !== 85.00) return true;
    for (let i = 0; i < rooms.length; i++) {
      const orig = project.rooms[i];
      if (!orig) return true;
      if (rooms[i].length !== orig.length) return true;
      if (rooms[i].width !== orig.width) return true;
      if (rooms[i].height !== orig.height) return true;
    }
    return false;
  }, [rooms, hourlyLaborRate, project.rooms]);

  const getRoomsBreakdownText = () => {
    return rooms.map(room => {
      const specParts = [];
      if (room.walls?.checked) specParts.push(`Walls (${room.walls.coats} coats)`);
      if (room.ceilings?.checked) specParts.push(`Ceilings (${room.ceilings.coats} coats)`);
      if (room.baseboards?.checked) specParts.push(`Baseboards (${room.baseboards.coats} coats)`);
      if (room.windows?.checked) specParts.push(`Windows (${room.windows.coats} coats)`);
      if (room.doors?.checked) specParts.push(`Doors (${room.doors.coats} coats)`);
      if (room.doorFrames?.checked) specParts.push(`Door Frames (${room.doorFrames.coats} coats)`);
      
      const price = liveSummary.roomCosts[room.id] || 0;
      return `- ${room.name} (${room.length}'x${room.width}'x${room.height}'): ${specParts.join(', ') || 'No surfaces spec'} [Est: $${price.toLocaleString()}]`;
    }).join('\n');
  };

  const downloadProposalPDF = () => {
    try {
      const { blobUrl } = generateProposalPDF({
        project,
        client,
        rooms,
        liveSummary,
        inclusions,
        exclusions,
        specialConditions,
        signerName,
        signerTitle,
        signedDate,
        clientSigned,
        clientAddress,
        clientPhone,
        clientEmail,
        projectDate,
        proposalNo,
        generalNotes,
        termsAndConditions,
        signatureDataUrl: project.signatureDataUrl,
        installments: project.installments || installments,
      });
      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = clientSigned ? `Signed_Proposal_${proposalNo}.pdf` : `Draft_Proposal_${proposalNo}.pdf`;
        link.click();
        triggerNotification('PDF generated and downloaded successfully!', 'success');
      } else {
        triggerNotification('Could not generate PDF download.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('PDF generation failed.', 'error');
    }
  };

  const downloadReceiptPDF = (inst: Installment) => {
    try {
      const activeInstallments = installments || [];
      const { blobUrl } = generateReceiptPDF({
        project,
        client: {
          ...client,
          name: clientName,
          address: clientAddress,
          phone: clientPhone,
          email: clientEmail,
        },
        installment: inst,
        allInstallments: activeInstallments,
      });

      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Receipt_${proposalNo}_${inst.id}.pdf`;
        link.click();
        triggerNotification('Receipt PDF downloaded successfully!', 'success');
      } else {
        triggerNotification('Could not generate receipt PDF.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Receipt PDF generation failed.', 'error');
    }
  };

  const getPhotoEmailAttachments = async () => {
    const imageAttachments: Array<{ filename: string; base64: string; contentType: string }> = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        if (photo.url.startsWith('data:')) {
          const matches = photo.url.match(/^data:([^;]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const contentType = matches[1];
            const base64 = matches[2];
            imageAttachments.push({
              filename: `${photo.caption || `photo_${i + 1}`}.${contentType.split('/')[1] || 'png'}`,
              base64,
              contentType,
            });
          }
        } else if (photo.url.startsWith('http')) {
          const res = await fetch(photo.url);
          const blob = await res.blob();
          
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const base64data = reader.result as string;
              const b64 = base64data.split(',')[1];
              resolve(b64);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const base64 = await base64Promise;
          
          imageAttachments.push({
            filename: `${photo.caption || `photo_${i + 1}`}.${blob.type.split('/')[1] || 'png'}`,
            base64,
            contentType: blob.type || 'image/png',
          });
        }
      } catch (err) {
        console.error("Failed to attach photo:", photo.caption, err);
      }
    }
    return imageAttachments;
  };

  const handleOpenInvoiceModalWithPreset = (percent: number, defaultName: string) => {
    setCustomInvoicePercent(percent);
    const amount = Math.round(liveSummary.total * (percent / 100));
    setCustomInvoiceAmount(amount);
    setCustomInvoiceName(defaultName);
    setShowCustomInvoiceModal(true);
  };

  const handleCustomInvoicePercentChange = (pct: number) => {
    setCustomInvoicePercent(pct);
    setCustomInvoiceAmount(Math.round(liveSummary.total * (pct / 100)));
  };

  const handleCustomInvoiceAmountChange = (amt: number) => {
    setCustomInvoiceAmount(amt);
    if (liveSummary.total > 0) {
      setCustomInvoicePercent(Math.round((amt / liveSummary.total) * 100));
    }
  };

  const generateReceiptEmailTemplate = (insts: Installment[]) => {
    const paidItems = insts.filter(i => i.status === 'Paid');
    const detailsText = paidItems.map(i => `- ${i.name}: $${i.amount.toLocaleString()} (Paid on ${i.paidAt || new Date().toLocaleDateString()})`).join('\n');
    
    const outstandingItems = insts.filter(i => i.status !== 'Paid');
    const outstandingText = outstandingItems.map(i => `- ${i.name}: $${i.amount.toLocaleString()} (Pending)`).join('\n');
    
    const totalPaid = paidItems.reduce((sum, i) => sum + i.amount, 0);
    const totalRemaining = outstandingItems.reduce((sum, i) => sum + i.amount, 0);

    return `Hi ${clientName},\n\nThank you for your payment! We have received and recorded your payment.\n\n` +
      `**Payment Received details:**\n${detailsText || 'No payments recorded.'}\n\n` +
      `**Total Paid on Receipt:** $${totalPaid.toLocaleString()}\n\n` +
      (outstandingText ? `**Remaining Payment Schedule:**\n${outstandingText}\n**Total Remaining Balance:** $${totalRemaining.toLocaleString()}\n\n` : '') +
      `Please let us know if you have any questions.\n\nThank you,\nPaintNav Estimating Team`;
  };

  const generateRequestEmailTemplate = (inst: Installment) => {
    return `Hi ${clientName},\n\nThis is a request for payment regarding the installment: **${inst.name}** for your painting project #${proposalNo}.\n\n` +
      `**Installment Request Details:**\n` +
      `- Installment: ${inst.name}\n` +
      `- Percentage: ${inst.percentage}%\n` +
      `- Amount Due: $${inst.amount.toLocaleString()}\n` +
      (inst.stripeInvoiceUrl ? `- Secure Payment Link: ${inst.stripeInvoiceUrl}\n` : '') +
      `\nPlease review and make payment at your earliest convenience.\n\nThank you,\nPaintNav Estimating Team`;
  };

  const handleOpenReceiptModal = (preselectInstallmentId?: string) => {
    let currentInsts = (installments || []).map(inst => ({ ...inst }));
    
    if (currentInsts.length === 0) {
      currentInsts = [
        {
          id: 'inst-deposit',
          name: 'Upfront Deposit (30%)',
          percentage: 30,
          amount: Math.round(liveSummary.total * 0.3),
          status: 'Paid',
          paidAt: new Date().toLocaleDateString()
        },
        {
          id: 'inst-balance',
          name: 'Remaining Balance (70%)',
          percentage: 70,
          amount: Math.round(liveSummary.total * 0.7),
          status: 'Paid',
          paidAt: new Date().toLocaleDateString()
        }
      ];
    } else if (preselectInstallmentId) {
      currentInsts.forEach(inst => {
        if (inst.id === preselectInstallmentId) {
          inst.status = 'Paid';
          if (!inst.paidAt) {
            inst.paidAt = new Date().toLocaleDateString();
          }
        }
      });
    }

    if (preselectInstallmentId) {
      setActiveReceiptInstallmentId(preselectInstallmentId);
    } else {
      const firstPaid = currentInsts.find(i => i.status === 'Paid');
      setActiveReceiptInstallmentId(firstPaid ? firstPaid.id : null);
    }

    setReceiptInstallments(currentInsts);
    setReceiptSubject(`Payment Receipt: PaintNav Estimate #${proposalNo}`);
    setReceiptNotes('');
    setReceiptPaymentMethod('Stripe');
    
    const initialBody = generateReceiptEmailTemplate(currentInsts);
    setReceiptMessage(initialBody);
    
    setShowReceiptModal(true);
  };

  const updateReceiptBodyWithInstallments = (updatedInsts: Installment[]) => {
    const newBody = generateReceiptEmailTemplate(updatedInsts);
    setReceiptMessage(newBody);
  };

  const handleOpenRequestModal = (instId: string) => {
    const inst = (installments || []).find(i => i.id === instId);
    if (!inst) return;

    setRequestInstallmentId(instId);
    setRequestSubject(`Payment Request: ${inst.name} (Estimate #${proposalNo})`);
    
    const initialBody = generateRequestEmailTemplate(inst);
    setRequestMessage(initialBody);
    
    setShowRequestModal(true);
  };

  const handleDispatchPaymentRequest = async () => {
    setIsSendingRequest(true);
    try {
      if (!localToken) {
        triggerNotification('Gmail is not authorized. Please authorize Gmail first.', 'error');
        return;
      }

      await sendProposalEmail({
        accessToken: localToken,
        to: clientEmail,
        subject: requestSubject,
        body: requestMessage.replace(/\n/g, '<br>'),
      });

      const updated = (installments || []).map(item => {
        if (item.id === requestInstallmentId) {
          return { 
            ...item, 
            status: 'Requested' as const, 
            requestedAt: new Date().toLocaleDateString() 
          };
        }
        return item;
      });

      setInstallments(updated);
      const updatedProj = { ...project, id: proposalNo, installments: updated };
      await handleSaveBoth(updatedProj);

      setShowRequestModal(false);
      triggerNotification(`Payment request email dispatched to ${clientEmail} successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      triggerNotification(err?.message || 'Failed to dispatch payment request.', 'error');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleDispatchReceiptAndRecordPayment = async () => {
    setIsSendingReceipt(true);
    try {
      setInstallments(receiptInstallments);
      const updatedProj = { 
        ...project, 
        id: proposalNo, 
        installments: receiptInstallments 
      };

      const isAllPaid = receiptInstallments.length > 0 && receiptInstallments.every(i => i.status === 'Paid');
      const nextStatus = isAllPaid ? 'Completed' : status;

      await handleSaveBoth(updatedProj, nextStatus as any);

      if (localToken) {
        // Generate the receipt PDF to attach
        const activeId = activeReceiptInstallmentId || (receiptInstallments.find(i => i.status === 'Paid')?.id) || '';
        const activeInst = receiptInstallments.find(i => i.id === activeId) || receiptInstallments[0];

        let pdfAttachment: any = null;
        if (activeInst) {
          try {
            const { base64: receiptPdfBase64 } = generateReceiptPDF({
              project: updatedProj,
              client: {
                ...client,
                name: clientName,
                address: clientAddress,
                phone: clientPhone,
                email: clientEmail,
              } as any,
              installment: activeInst,
              allInstallments: receiptInstallments,
            });
            pdfAttachment = {
              filename: `Receipt_${proposalNo}_${activeInst.id}.pdf`,
              base64: receiptPdfBase64,
              contentType: 'application/pdf',
            };
          } catch (pdfErr) {
            console.error('Failed to generate PDF for attachment:', pdfErr);
          }
        }

        await sendProposalEmail({
          accessToken: localToken,
          to: clientEmail,
          subject: receiptSubject,
          body: receiptMessage.replace(/\n/g, '<br>'),
          attachments: pdfAttachment ? [pdfAttachment] : []
        });
        triggerNotification(`Payment recorded and receipt with PDF sent successfully!`, 'success');
      } else {
        triggerNotification(`Payment recorded successfully! (Gmail not connected for receipt)`, 'success');
      }

      setShowReceiptModal(false);
    } catch (err: any) {
      console.error(err);
      triggerNotification(err?.message || 'Failed to record payment or send receipt.', 'error');
    } finally {
      setIsSendingReceipt(false);
    }
  };

  const handleDispatchCustomInvoice = async () => {
    if (customInvoiceAmount <= 0) {
      triggerNotification("Invoice amount must be greater than 0.", "error");
      return;
    }

    setIsSendingStripe(true);
    setStripeError(null);
    setStripeInvoiceUrl(null);

    try {
      const specsText = getRoomsBreakdownText();
      const descriptionText = `${customInvoiceName}\n\nConfigured Room Specifications:\n${specsText}`;

      const response = await fetch('/api/stripe/send-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail,
          clientName,
          amount: customInvoiceAmount,
          proposalNo,
          description: descriptionText
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConfig) {
          setShowStripeConfigModal(true);
          setStripeError(data.error);
          triggerNotification('Stripe API Key required.', 'error');
        } else {
          setStripeError(data.error || 'Failed to dispatch Stripe invoice.');
          triggerNotification(data.error || 'Stripe billing failed.', 'error');
        }
        return;
      }

      const newInst = {
        id: `inst-${Date.now()}`,
        name: customInvoiceName,
        percentage: customInvoicePercent,
        amount: customInvoiceAmount,
        status: 'Requested' as const,
        requestedAt: new Date().toLocaleDateString(),
        stripeInvoiceId: data.invoiceId,
        stripeInvoiceUrl: data.invoiceUrl,
      };

      const updatedInstallments = [...(installments || []), newInst];
      setInstallments(updatedInstallments);

      const nextStatus = status === 'Approved' ? 'Invoiced' : status;

      const updatedProj = {
        ...project,
        id: proposalNo,
        installments: updatedInstallments,
        status: nextStatus as any
      };
      
      await handleSaveBoth(updatedProj, nextStatus as any);
      setShowCustomInvoiceModal(false);
      triggerNotification(`Stripe invoice for $${customInvoiceAmount} sent successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      triggerNotification('Stripe invoice failed.', 'error');
    } finally {
      setIsSendingStripe(false);
    }
  };

  // Adaptive send button progression config
  const getProgressSendButtonConfig = () => {
    switch (status) {
      case 'Draft':
        return {
          label: 'Send Proposal',
          onClick: () => {
            setShowSendProposalEmailModal(true);
          },
          className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
        };
      case 'Sent':
        if (isDirty) {
          return {
            label: 'Send Change Order',
            onClick: async () => {
              const updated = getLatestProjectPayload('Sent');
              await handleSaveBoth(updated);
              triggerNotification('Change Order CO-1 submitted successfully!');
            },
            className: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/10'
          };
        }
        return {
          label: 'Mark Approved',
          onClick: async () => {
            setStatus('Approved');
            const updated = getLatestProjectPayload('Approved');
            await handleSaveBoth(updated, 'Approved');
            triggerNotification('Proposal accepted! Launching Stripe auto-billing for 30% upfront deposit...', 'success');
            await sendStripeBill(liveSummary.deposit, false);
          },
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
        };
      case 'Approved':
        return {
          label: 'Send Invoice',
          onClick: async () => {
            setStatus('Invoiced');
            const updated = getLatestProjectPayload('Invoiced');
            await handleSaveBoth(updated, 'Invoiced');
            triggerNotification('Launching Stripe final billing for 70% balance...', 'success');
            await sendStripeBill(liveSummary.balance, false);
          },
          className: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10'
        };
      case 'Invoiced':
        return {
          label: 'Send Receipt',
          onClick: async () => {
            handleOpenReceiptModal();
          },
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
        };
      default:
        return {
          label: 'Sync Progress',
          onClick: async () => {
            await handleSave();
          },
          className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
        };
    }
  };

  const btnConfig = getProgressSendButtonConfig();
  const showChangeOrderBanner = (project.status === 'Sent' || project.status === 'Approved') && isDirty;

  // -------------------------------------------------------------
  // DYNAMIC ESTIMATOR CALCULATION ENGINE
  // -------------------------------------------------------------
  const liveSummary = useMemo(() => {
    let totalHours = 0;
    let totalMaterials = 0;
    const roomCosts: Record<string, number> = {};
    const roomHours: Record<string, number> = {};
    const roomMaterials: Record<string, number> = {};

    const rates = proposalSettings?.rates;
    const realProducts = proposalSettings?.realProducts || DEFAULT_REAL_PRODUCTS;

    rooms.forEach(room => {
      const breakdown = calculateRoomPricing(room, rates, realProducts);
      roomCosts[room.id] = breakdown.totalCost;
      roomHours[room.id] = breakdown.hours;
      roomMaterials[room.id] = breakdown.materialCost;

      if (!room.isOption) {
        totalHours += breakdown.hours;
        totalMaterials += breakdown.materialCost;
      }
    });

    // Add baseline site setup & prep work base if project has items
    if (totalHours > 0) {
      const setupH = rates?.setupHours ?? 5.0;
      const setupM = rates?.setupMaterials ?? 50.0;
      totalHours += setupH;
      totalMaterials += setupM;
    }

    const laborCost = Math.round(totalHours * hourlyLaborRate);
    const subtotal = laborCost + Math.round(totalMaterials);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const hst = discountedSubtotal * taxRate;
    const total = discountedSubtotal + hst;
    const deposit = total * 0.30;
    const balance = total * 0.70;

    return {
      hours: parseFloat(totalHours.toFixed(1)),
      laborCost,
      materialCost: Math.round(totalMaterials),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount,
      discountedSubtotal: parseFloat(discountedSubtotal.toFixed(2)),
      hst: parseFloat(hst.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      deposit: parseFloat(deposit.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      roomCosts,
      roomHours,
      roomMaterials
    };

  }, [rooms, hourlyLaborRate, taxRate, discount, proposalSettings]);

  const totalPaid = useMemo(() => {
    return (installments || [])
      .filter(inst => inst.status === 'Paid')
      .reduce((sum, inst) => sum + inst.amount, 0);
  }, [installments]);

  const remainingCost = useMemo(() => {
    return Math.max(0, liveSummary.total - totalPaid);
  }, [liveSummary.total, totalPaid]);

  // Helper to calculate cost details for individual sub-selection items inside a room
  const calculateSubItem = (room: RoomSpec, subKey: string, coats: number, qty: any) => {
    const r = proposalSettings?.rates;
    const realProducts = proposalSettings?.realProducts || DEFAULT_REAL_PRODUCTS;

    const rL = Number(room.length) || 12;
    const rW = Number(room.width) || 12;
    const rH = Number(room.height) || 9;

    const wArea = 2 * rH * (rL + rW);
    const cArea = rL * rW;
    const perimeter = 2 * (rL + rW);

    let hours = 0;
    let materials = 0;

    const coatMult = getAreaCoatMultiplier(coats);
    const assignedProd = getProductForSurface(subKey, room, realProducts);

    switch (subKey) {
      // Interior
      case 'walls': {
        const speed = r?.wallsSpeed ?? 175;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.wallsCoverage ?? 350;
        const matCost = assignedProd?.pricePerGal ?? r?.wallsMaterialCost ?? 78;
        hours = (wArea / speed) * coatMult;
        materials = (wArea / coverage) * coatMult * matCost;
        break;
      }
      case 'ceilings': {
        const speed = r?.ceilingsSpeed ?? 100;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.ceilingsCoverage ?? 350;
        const matCost = assignedProd?.pricePerGal ?? r?.ceilingsMaterialCost ?? 78;
        hours = (cArea / speed) * coatMult;
        materials = (cArea / coverage) * coatMult * matCost;
        break;
      }
      case 'baseboards': {
        const speed = r?.baseboardsSpeed ?? 65;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.baseboardsCoverage ?? 200;
        const matCost = assignedProd?.pricePerGal ?? r?.baseboardsMaterialCost ?? 85;
        hours = (perimeter / speed) * coatMult;
        materials = (perimeter / coverage) * coatMult * matCost;
        break;
      }
      case 'windows': {
        const q = Number(qty) || 0;
        const hPerCoat = getItemCoatHours('windows', coats);
        const matCostPerCoat = r?.windowsMaterialCostPerCoat ?? 7.00;
        hours = q * hPerCoat * coats;
        materials = q * matCostPerCoat * coats;
        break;
      }
      case 'doors': {
        const q = Number(qty) || 0;
        const hPerCoat = getItemCoatHours('doors', coats);
        const matCostPerCoat = r?.doorsMaterialCostPerCoat ?? 9.00;
        hours = q * hPerCoat * coats;
        materials = q * matCostPerCoat * coats;
        break;
      }
      case 'doorFrames': {
        const q = Number(qty) || 0;
        const hPerCoat = getItemCoatHours('doorFrames', coats);
        const matCostPerCoat = r?.doorFramesMaterialCostPerCoat ?? 5.00;
        hours = q * hPerCoat * coats;
        materials = q * matCostPerCoat * coats;
        break;
      }

      // Exterior
      case 'ext-siding': {
        const speed = r?.sidingSpeed ?? 180;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.sidingCoverage ?? 350;
        const matCost = assignedProd?.pricePerGal ?? r?.sidingMaterialCost ?? 78;
        hours = (wArea / speed) * coatMult;
        materials = (wArea / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-brick-stain': {
        const speed = r?.brickSpeed ?? 120;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.brickCoverage ?? 250;
        const matCost = assignedProd?.pricePerGal ?? r?.brickMaterialCost ?? 85;
        hours = (wArea / speed) * coatMult;
        materials = (wArea / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-porch-floor': {
        const speed = r?.porchFloorSpeed ?? 150;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.porchFloorCoverage ?? 350;
        const matCost = assignedProd?.pricePerGal ?? r?.porchFloorMaterialCost ?? 78;
        hours = (cArea / speed) * coatMult;
        materials = (cArea / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-soffits': {
        const speed = r?.soffitsSpeed ?? 50;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.soffitsCoverage ?? 200;
        const matCost = assignedProd?.pricePerGal ?? r?.soffitsMaterialCost ?? 78;
        hours = (perimeter / speed) * coatMult;
        materials = (perimeter / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-gutters': {
        const speed = r?.guttersSpeed ?? 60;
        const coverage = r?.guttersCoverage ?? 250;
        const matCost = r?.guttersMaterialCost ?? 40;
        hours = (perimeter / speed) * coatMult;
        materials = (perimeter / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-fascia': {
        const speed = r?.fasciaSpeed ?? 60;
        const coverage = r?.fasciaCoverage ?? 250;
        const matCost = r?.fasciaMaterialCost ?? 40;
        hours = (perimeter / speed) * coatMult;
        materials = (perimeter / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-trims': {
        const speed = r?.trimsSpeed ?? 60;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.trimsCoverage ?? 250;
        const matCost = assignedProd?.pricePerGal ?? r?.trimsMaterialCost ?? 85;
        hours = (perimeter / speed) * coatMult;
        materials = (perimeter / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-garage-door': {
        const q = Number(qty) || 1;
        const hPerCoat = r?.garageHoursPerCoat ?? 0.75;
        const mPerCoat = r?.garageMaterialCostPerCoat ?? 7.50;
        hours = q * hPerCoat * coats;
        materials = q * mPerCoat * coats;
        break;
      }
      case 'ext-doors': {
        const q = Number(qty) || 1;
        const hPerCoat = r?.extDoorsHoursPerCoat ?? 0.75;
        const mPerCoat = r?.extDoorsMaterialCostPerCoat ?? 7.50;
        hours = q * hPerCoat * coats;
        materials = q * mPerCoat * coats;
        break;
      }
      case 'ext-windows-fixed': {
        const q = Number(qty) || 2;
        const hPerCoat = r?.windowsFixedHoursPerCoat ?? 0.50;
        const mPerCoat = r?.windowsFixedMaterialCostPerCoat ?? 6.00;
        hours = q * hPerCoat * coats;
        materials = q * mPerCoat * coats;
        break;
      }
      case 'ext-railings': {
        const speed = r?.railingsSpeed ?? 40;
        const coverage = r?.railingsCoverage ?? 200;
        const matCost = r?.railingsMaterialCost ?? 35;
        hours = (perimeter / speed) * coatMult;
        materials = (perimeter / coverage) * coatMult * matCost;
        break;
      }
      case 'ext-shutters': {
        const q = Number(qty) || 2;
        const hPerCoat = r?.shuttersHoursPerCoat ?? 0.50;
        const mPerCoat = r?.shuttersMaterialCostPerCoat ?? 5.00;
        hours = q * hPerCoat * coats;
        materials = q * mPerCoat * coats;
        break;
      }

      // Deck
      case 'washing': {
        const speed = r?.washingSpeed ?? 200;
        const matCostSqft = r?.washingMaterialCostPerSqft ?? 0.08;
        hours = cArea / speed;
        materials = cArea * matCostSqft;
        break;
      }
      case 'stripping': {
        const speed = r?.strippingSpeed ?? 100;
        const matCostSqft = r?.strippingMaterialCostPerSqft ?? 0.175;
        hours = cArea / speed;
        materials = cArea * matCostSqft;
        break;
      }
      case 'reviving': {
        const speed = r?.revivingSpeed ?? 150;
        const matCostSqft = r?.revivingMaterialCostPerSqft ?? 0.10;
        hours = cArea / speed;
        materials = cArea * matCostSqft;
        break;
      }
      case 'sanding': {
        const speed = r?.sandingSpeed ?? 80;
        const flatMat = r?.sandingMaterialCostFlat ?? 30;
        hours = cArea / speed;
        materials = flatMat;
        break;
      }
      case 'staining': {
        const speed = r?.stainingSpeed ?? 80;
        const coverage = assignedProd?.coverageSqFtPerGal ?? r?.stainingCoverage ?? 250;
        const matCost = assignedProd?.pricePerGal ?? r?.stainingMaterialCost ?? 60;
        hours = (cArea / speed) * coatMult;
        materials = (cArea / coverage) * coatMult * matCost;
        break;
      }
      default:
        if (subKey.startsWith('custom-')) {
          const customItem = ((room as any).customAreas || []).find((c: any) => c.key === subKey);
          if (customItem) {
            const speed = customItem.speed || 150;
            const coverage = customItem.coverage || 350;
            const matCost = customItem.materialCost || 25;
            const qtyVal = qty === 'auto' ? 1 : (Number(qty) || 1);

            if (customItem.calcType === 'wall') {
              hours = (wArea / speed) * coatMult;
              materials = (wArea / coverage) * coatMult * matCost;
            } else if (customItem.calcType === 'ceiling') {
              hours = (cArea / speed) * coatMult;
              materials = (cArea / coverage) * coatMult * matCost;
            } else if (customItem.calcType === 'perimeter') {
              hours = (perimeter / speed) * coatMult;
              materials = (perimeter / coverage) * coatMult * matCost;
            } else {
              hours = qtyVal * 0.75 * coats;
              materials = qtyVal * 7.00 * coats;
            }
          }
        }
        break;
    }

    const labor = hours * hourlyLaborRate;
    const total = labor + materials;

    return {
      hours: parseFloat(hours.toFixed(1)),
      laborCost: Math.round(labor),
      materialCost: Math.round(materials),
      total: Math.round(total)
    };
  };

  // Helper to generate the complete project details payload with all current state variables
  const getLatestProjectPayload = (targetStatus?: ProjectType['status']): ProjectType => {
    return {
      ...project,
      id: proposalNo,
      status: targetStatus || (status as any),
      rooms,
      inclusions,
      exclusions,
      specialConditions,
      teamNotes,
      generalNotes,
      termsAndConditions,
      photos,
      clientSigned,
      signerName,
      signerTitle,
      signedDate,
      installments,
      summary: {
        totalHours: liveSummary.hours,
        hourlyLaborRate: hourlyLaborRate,
        laborCost: liveSummary.laborCost,
        materialCost: liveSummary.materialCost,
        taxRate,
        discount,
        totalPrice: liveSummary.total,
      },
      updatedAt: new Date().toISOString(),
    };
  };

  // Helper to save both client and project details in unison
  const handleSaveBoth = async (updatedProject: ProjectType, targetStatus?: ProjectType['status']) => {
    // 1. Build and push updated client CRM record
    const updatedClient: ClientLead = {
      ...client,
      name: clientName,
      address: clientAddress,
      phone: clientPhone,
      email: clientEmail,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveClient) {
      await onSaveClient(updatedClient);
    }

    // 2. Push updated estimate project
    const payloadProject: ProjectType = {
      ...updatedProject,
      status: targetStatus || updatedProject.status,
      rooms,
      inclusions,
      exclusions,
      specialConditions,
      teamNotes,
      photos,
      clientSigned,
      signerName,
      signerTitle,
      signedDate,
      installments: updatedProject.installments || installments,
      contractorAccessToken: driveToken || updatedProject.contractorAccessToken,
      summary: {
        totalHours: liveSummary.hours,
        hourlyLaborRate: hourlyLaborRate,
        laborCost: liveSummary.laborCost,
        materialCost: liveSummary.materialCost,
        taxRate,
        discount,
        totalPrice: liveSummary.total,
      },
      updatedAt: new Date().toISOString(),
    };
    await onSaveProject(payloadProject);
  };

  // Handle saving project back to system database
  const handleSave = async () => {
    const updated = getLatestProjectPayload();
    await handleSaveBoth(updated);
    triggerNotification('Proposal and CRM details saved successfully!');
  };

  const handleSendProposalAndEmail = async (sendWithGmail: boolean) => {
    setIsSendingGmail(true);
    setGmailSuccess(false);
    setGmailError('');
    
    try {
      const updated = getLatestProjectPayload('Sent');

      if (sendWithGmail) {
        if (!clientEmail) {
          triggerNotification('Please provide a client email address.', 'error');
          setIsSendingGmail(false);
          return;
        }

        // Fetch project photos as base64 email attachments
        const imageAttachments = await getPhotoEmailAttachments();

        const roomsList = rooms.filter(r => !r.isOption).map(room => {
          const price = liveSummary.roomCosts[room.id] || 0;
          return `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${room.name}</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${getRoomHighlightsText(room)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${price.toLocaleString()}</td>
            </tr>
          `;
        }).join('');

        const optionsList = rooms.filter(r => r.isOption).map(room => {
          const price = liveSummary.roomCosts[room.id] || 0;
          return `
            <tr style="background-color: #fefbeb;">
              <td style="padding: 10px; border-bottom: 1px solid #fde047;"><strong>${room.name} (Option)</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #fde047; color: #666;">${getRoomHighlightsText(room)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #fde047; text-align: right; font-weight: bold; color: #b45309;">$${price.toLocaleString()}</td>
            </tr>
          `;
        }).join('');

        const inclusionsHTML = inclusions ? `<div style="margin-bottom: 12px;"><strong>Inclusions:</strong><br/>${inclusions.replace(/\n/g, '<br/>')}</div>` : '';
        const exclusionsHTML = exclusions ? `<div style="margin-bottom: 12px;"><strong>Exclusions:</strong><br/>${exclusions.replace(/\n/g, '<br/>')}</div>` : '';
        const specialHTML = specialConditions ? `<div style="margin-bottom: 12px;"><strong>Special Conditions:</strong><br/>${specialConditions.replace(/\n/g, '<br/>')}</div>` : '';

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">PaintNav Proposal & Estimate</h2>
            <p>Dear ${clientName},</p>
            <p>${gmailMessage.replace(/\n/g, '<br/>')}</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}/?proposalId=${project.id}&action=sign" 
                 style="background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);"
                 target="_blank">
                ✍️ Review & Sign Proposal Online
              </a>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #0f172a;">Summary of Estimate #${proposalNo}</h3>
              <p><strong>Date:</strong> ${projectDate}</p>
              <p><strong>Client:</strong> ${clientName}</p>
              <p><strong>Address:</strong> ${clientAddress}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Room / Option</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Details</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${roomsList || '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">No standard scope items</td></tr>'}
                ${optionsList}
              </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 25px; padding-top: 10px; border-top: 2px solid #e2e8f0;">
              <p style="margin: 4px 0;"><strong>Subtotal:</strong> $${liveSummary.subtotal.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>HST (13%):</strong> $${liveSummary.hst.toLocaleString()}</p>
              <h3 style="margin: 8px 0; color: #166534;">Grand Total: $${liveSummary.total.toLocaleString()}</h3>
              <p style="font-size: 11px; color: #666; margin: 4px 0;">30% Deposit Due: $${liveSummary.deposit.toLocaleString()}</p>
            </div>

            ${inclusionsHTML || exclusionsHTML || specialHTML ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; margin-bottom: 10px; color: #0f172a;">Scope Comments</h4>
                ${inclusionsHTML}
                ${exclusionsHTML}
                ${specialHTML}
              </div>
            ` : ''}

            <div style="text-align: center; margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p style="font-size: 13px; font-weight: bold; color: #1e3a8a;">This proposal is ready for your signature online.</p>
              <p style="font-size: 11px; color: #999; margin-top: 15px;">Powered securely by PaintNav Painting Estimator.</p>
            </div>
          </div>
        `;

        const { base64: proposalPdfBase64 } = generateProposalPDF({
          project,
          client,
          rooms,
          liveSummary,
          inclusions,
          exclusions,
          specialConditions,
          signerName,
          signerTitle,
          signedDate,
          clientSigned,
          clientAddress,
          clientPhone,
          clientEmail,
          projectDate,
          proposalNo,
          generalNotes,
          termsAndConditions,
          signatureDataUrl: project.signatureDataUrl,
          installments: project.installments || installments,
        });

        await sendProposalEmail({
          accessToken: localToken!,
          to: clientEmail,
          subject: gmailSubject,
          body: htmlBody,
          pdfBase64: proposalPdfBase64,
          pdfFilename: `Proposal_${proposalNo}.pdf`,
          attachments: imageAttachments,
        });

        triggerNotification('Proposal dispatched to client successfully via Gmail!', 'success');
      } else {
        triggerNotification('Proposal status transitioned to Sent successfully!', 'success');
      }

      setStatus('Sent');
      await handleSaveBoth(updated, 'Sent');
      setShowSendProposalEmailModal(false);
    } catch (err: any) {
      console.error('Failed to send proposal:', err);
      const isAuthError = String(err?.message || '').toLowerCase().includes('expired') ||
                          String(err?.message || '').toLowerCase().includes('credentials') ||
                          String(err?.message || '').toLowerCase().includes('unauthenticated') ||
                          String(err?.message || '').toLowerCase().includes('401');
      if (isAuthError) {
        setLocalToken(null);
        setAccessToken(null);
        setGmailError('Google session expired or missing permissions. Please click "Connect Gmail Service" to re-authorize.');
        triggerNotification('Gmail auth expired. Please re-connect Gmail.', 'error');
      } else {
        setGmailError(err.message || 'An unexpected error occurred during email dispatch.');
        triggerNotification('Email dispatch failed.', 'error');
      }
    } finally {
      setIsSendingGmail(false);
    }
  };

  const sendStripeBill = async (amount: number, isTest = false) => {
    setIsSendingStripe(true);
    setStripeError(null);
    setStripeInvoiceUrl(null);

    try {
      const response = await fetch('/api/stripe/send-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail,
          clientName,
          amount,
          proposalNo,
          description: isTest 
            ? `PaintNav Test Invoice #${proposalNo} - Direct Send`
            : `PaintNav Estimate #${proposalNo} - Proposal Accepted (Auto-Bill)`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConfig) {
          setShowStripeConfigModal(true);
          setStripeError(data.error);
          triggerNotification('Stripe API Key required.', 'error');
        } else {
          setStripeError(data.error || 'Failed to dispatch Stripe invoice.');
          triggerNotification(data.error || 'Stripe billing failed.', 'error');
        }
        return false;
      }

      setStripeInvoiceUrl(data.invoiceUrl);
      triggerNotification(
        isTest
          ? 'Test Stripe Invoice dispatched successfully via email!'
          : 'Official Stripe Invoice dispatched automatically via email!',
        'success'
      );
      return true;
    } catch (err: any) {
      console.error('Stripe billing error:', err);
      setStripeError(err.message || 'Network error while reaching Stripe server.');
      triggerNotification('Stripe integration unreachable.', 'error');
      return false;
    } finally {
      setIsSendingStripe(false);
    }
  };

  // Add room preset to project spec
  const handleAddRoomPreset = (presetName: string, length = cfgLength, width = cfgWidth, category: 'interior' | 'exterior' | 'deck' = 'interior') => {
    const newId = 'room-' + Math.random().toString(36).substring(2, 9);
    const uniqueName = getUniqueRoomName(rooms, presetName);
    
    // Copy configurations completely from sidesheet controls
    const newRoom: RoomSpec = {
      id: newId,
      name: uniqueName,
      length,
      width,
      height: cfgCeilingHeight,
      wallsArea: 2 * cfgCeilingHeight * (length + width),
      ceilingArea: length * width,
      paints: [],
      category,
      // Map configurations from sidesheet
      walls: { checked: category === 'interior' ? configChecked.walls : false, qty: 'auto', coats: configCoats.walls },
      ceilings: { checked: category === 'interior' ? configChecked.ceilings : false, qty: 'auto', coats: configCoats.ceilings },
      baseboards: { checked: category === 'interior' ? configChecked.baseboards : false, qty: 'auto', coats: configCoats.baseboards },
      windows: { checked: category === 'interior' ? configChecked.windows : false, qty: configQty.windows, coats: configCoats.windows },
      doors: { checked: category === 'interior' ? configChecked.doors : false, qty: configQty.doors, coats: configCoats.doors },
      doorFrames: { checked: category === 'interior' ? configChecked.doorFrames : false, qty: configQty.doorFrames, coats: configCoats.doorFrames },
      wallPaintType: cfgWallPaint,

      // Default exterior keys
      'ext-siding': { checked: category === 'exterior', coats: 2, qty: 'auto' },
      'ext-brick-stain': { checked: false, coats: 2, qty: 'auto' },
      'ext-porch-floor': { checked: false, coats: 2, qty: 'auto' },
      'ext-soffits': { checked: category === 'exterior', coats: 2, qty: 'auto' },
      'ext-gutters': { checked: category === 'exterior', coats: 2, qty: 'auto' },
      'ext-fascia': { checked: category === 'exterior', coats: 2, qty: 'auto' },
      'ext-trims': { checked: category === 'exterior', coats: 2, qty: 'auto' },
      'ext-garage-door': { checked: false, coats: 2, qty: 1 },
      'ext-doors': { checked: false, coats: 2, qty: 1 },
      'ext-windows-fixed': { checked: false, coats: 2, qty: 2 },
      'ext-railings': { checked: false, coats: 2, qty: 'auto' },
      'ext-shutters': { checked: false, coats: 2, qty: 2 },

      // Default deck keys
      'washing': { checked: category === 'deck', coats: 1, qty: 'auto' },
      'stripping': { checked: false, coats: 1, qty: 'auto' },
      'reviving': { checked: false, coats: 1, qty: 'auto' },
      'sanding': { checked: category === 'deck', coats: 1, qty: 'auto' },
      'staining': { checked: category === 'deck', coats: 2, qty: 'auto' },

      // Pre-populate surface tasks from active category tasks
      surfaceTasks: (categoryTasks[category] || []).map(t => ({
        ...t,
        id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        completed: t.completed !== false
      }))
    } as any;

    setRooms(prev => [...prev, newRoom]);
    setExpandedRoomIds(prev => ({
      ...prev,
      [newId]: true // Open accordion automatically
    }));
    triggerNotification(`Added ${uniqueName} spec to worksheet list!`);
  };

  // Add custom or preset area to a specific room
  const handleAddArea = (roomToUpdate: RoomSpec, label: string, calcType: 'wall' | 'ceiling' | 'perimeter' | 'item', defaultQty: number | 'auto' = 'auto', defaultCoats: number = 2) => {
    const key = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setRooms(prev => prev.map(r => {
      if (r.id === roomToUpdate.id) {
        const customAreas = (r as any).customAreas || [];
        // Prevent duplicates
        if (customAreas.some((c: any) => c.label.toLowerCase() === label.toLowerCase())) {
          return r;
        }
        return {
          ...r,
          customAreas: [
            ...customAreas,
            {
              key,
              label,
              checked: true,
              qty: defaultQty,
              coats: defaultCoats,
              hasQty: calcType === 'item',
              calcType,
              defaultQty,
              defaultCoats,
              isOption: false
            }
          ]
        };
      }
      return r;
    }));
    triggerNotification(`Added custom layer "${label}" to ${roomToUpdate.name}!`, 'success');
  };

  // Clone an existing room
  const handleCopyRoom = (room: RoomSpec, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = 'room-' + Math.random().toString(36).substring(2, 9);
    const uniqueName = getUniqueRoomName(rooms, room.name);
    const cloned: RoomSpec = {
      ...room,
      id: newId,
      name: uniqueName
    };
    setRooms(prev => [...prev, cloned]);
    triggerNotification(`Cloned room ${room.name} as ${uniqueName}!`);
  };

  // Delete a room (allows deleting down to empty for draft estimates)
  const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRooms(prev => prev.filter(r => r.id !== roomId));
    triggerNotification('Removed room spec.');
  };

  const getSelectedRoomIdsUnified = () => {
    const ids = new Set<string>();
    Object.keys(selectedRoomIds).forEach(id => {
      if (selectedRoomIds[id]) ids.add(id);
    });
    Object.keys(selectedAreas).forEach(key => {
      if (selectedAreas[key]) {
        const [roomId] = key.split('::');
        ids.add(roomId);
      }
    });
    return Array.from(ids);
  };

  const handleBulkDuplicate = () => {
    const roomIdsToDuplicate = getSelectedRoomIdsUnified();
    if (roomIdsToDuplicate.length === 0) {
      triggerNotification('No rooms or area layers selected.', 'error');
      return;
    }
    
    setRooms(prev => {
      const duplicated: typeof rooms = [];
      prev.forEach(room => {
        duplicated.push(room);
        if (roomIdsToDuplicate.includes(room.id)) {
          const isEntireRoomSelected = !!selectedRoomIds[room.id];
          const roomSpecificSelectedAreas = Object.keys(selectedAreas).filter(
            key => key.startsWith(`${room.id}::`) && selectedAreas[key]
          );

          let newRoom = {
            ...room,
            id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: `${room.name} (Copy)`
          };

          if (!isEntireRoomSelected && roomSpecificSelectedAreas.length > 0) {
            // Only keep selected area layers active, set others to checked: false
            const keys = ['walls', 'ceilings', 'baseboards', 'windows', 'doors', 'doorFrames', 'ext-siding', 'ext-brick-stain', 'ext-porch-floor', 'ext-soffits', 'ext-gutters', 'ext-fascia', 'ext-trims', 'ext-garage-door', 'ext-doors', 'ext-windows-fixed', 'ext-railings', 'ext-shutters', 'washing', 'stripping', 'reviving', 'sanding', 'staining'];
            keys.forEach(k => {
              const areaKey = `${room.id}::${k}`;
              const isAreaSelected = !!selectedAreas[areaKey];
              const subObj = (newRoom as any)[k];
              if (subObj) {
                (newRoom as any)[k] = {
                  ...subObj,
                  checked: isAreaSelected
                };
              }
            });
          }

          duplicated.push(newRoom);
        }
      });
      return duplicated;
    });
    
    // clear selection
    setSelectedRoomIds({});
    setSelectedAreas({});
    triggerNotification(`Duplicated selected item(s) successfully!`, 'success');
  };

  const handleBulkToggleOption = () => {
    const hasSelectedRooms = Object.values(selectedRoomIds).some(Boolean);
    const hasSelectedAreas = Object.values(selectedAreas).some(Boolean);
    
    if (!hasSelectedRooms && !hasSelectedAreas) {
      triggerNotification('No rooms or area layers selected.', 'error');
      return;
    }

    setRooms(prev => prev.map(room => {
      let updatedRoom = { ...room };
      
      // 1. If the room itself is selected, toggle its option state
      if (selectedRoomIds[room.id]) {
        updatedRoom.isOption = !updatedRoom.isOption;
      }
      
      // 2. If any areas in this room are selected, toggle their option state
      const areaKeys = ['walls', 'ceilings', 'baseboards', 'windows', 'doors', 'doorFrames', 'ext-siding', 'ext-brick-stain', 'ext-porch-floor', 'ext-soffits', 'ext-gutters', 'ext-fascia', 'ext-trims', 'ext-garage-door', 'ext-doors', 'ext-windows-fixed', 'ext-railings', 'ext-shutters', 'washing', 'stripping', 'reviving', 'sanding', 'staining'];
      areaKeys.forEach(k => {
        const key = `${room.id}::${k}`;
        if (selectedAreas[key]) {
          const subObj = (updatedRoom as any)[k] || { checked: true, qty: 'auto', coats: 2, isOption: false };
          (updatedRoom as any)[k] = {
            ...subObj,
            isOption: !subObj.isOption
          };
        }
      });
      
      return updatedRoom;
    }));

    triggerNotification('Toggled option status for selection.', 'success');
  };

  const handleBulkDelete = () => {
    const hasSelectedRooms = Object.values(selectedRoomIds).some(Boolean);
    const hasSelectedAreas = Object.values(selectedAreas).some(Boolean);

    if (!hasSelectedRooms && !hasSelectedAreas) {
      triggerNotification('No rooms or area layers selected.', 'error');
      return;
    }

    const confirmMsg = hasSelectedRooms 
      ? `Are you sure you want to delete the selected rooms?`
      : `Are you sure you want to remove the selected area layers from these rooms?`;

    if (confirm(confirmMsg)) {
      if (hasSelectedRooms) {
        // Delete selected rooms completely
        setRooms(prev => prev.filter(room => !selectedRoomIds[room.id]));
        setSelectedRoomIds({});
      }
      
      if (hasSelectedAreas) {
        // Uncheck selected area layers
        setRooms(prev => prev.map(room => {
          let updatedRoom = { ...room };
          const keys = ['walls', 'ceilings', 'baseboards', 'windows', 'doors', 'doorFrames', 'ext-siding', 'ext-brick-stain', 'ext-porch-floor', 'ext-soffits', 'ext-gutters', 'ext-fascia', 'ext-trims', 'ext-garage-door', 'ext-doors', 'ext-windows-fixed', 'ext-railings', 'ext-shutters', 'washing', 'stripping', 'reviving', 'sanding', 'staining'];
          
          keys.forEach(k => {
            const areaKey = `${room.id}::${k}`;
            if (selectedAreas[areaKey]) {
              const subObj = (updatedRoom as any)[k];
              if (subObj) {
                (updatedRoom as any)[k] = {
                  ...subObj,
                  checked: false
                };
              }
            }
          });
          return updatedRoom;
        }));
        setSelectedAreas({});
      }
      
      triggerNotification('Deleted selected items successfully.', 'success');
    }
  };

  const handleBulkSetCeilingHeight = (height: number) => {
    const roomIds = getSelectedRoomIdsUnified();
    if (roomIds.length === 0) {
      triggerNotification('No rooms or area layers selected.', 'error');
      return;
    }

    setRooms(prev => prev.map(room => {
      if (roomIds.includes(room.id)) {
        return {
          ...room,
          height
        };
      }
      return room;
    }));

    triggerNotification(`Set ceiling height to ${height} ft for ${roomIds.length} room(s).`, 'success');
  };

  const handleBulkSetCoats = (coats: number) => {
    const hasSelectedRooms = Object.values(selectedRoomIds).some(Boolean);
    const hasSelectedAreas = Object.values(selectedAreas).some(Boolean);

    if (!hasSelectedRooms && !hasSelectedAreas) {
      triggerNotification('No rooms or area layers selected.', 'error');
      return;
    }

    setRooms(prev => prev.map(room => {
      let updatedRoom = { ...room };
      const keys = ['walls', 'ceilings', 'baseboards', 'windows', 'doors', 'doorFrames', 'ext-siding', 'ext-brick-stain', 'ext-porch-floor', 'ext-soffits', 'ext-gutters', 'ext-fascia', 'ext-trims', 'ext-garage-door', 'ext-doors', 'ext-windows-fixed', 'ext-railings', 'ext-shutters', 'washing', 'stripping', 'reviving', 'sanding', 'staining'];
      
      const updatedLayers: any = {};
      keys.forEach(k => {
        const areaKey = `${room.id}::${k}`;
        const subObj = (updatedRoom as any)[k];
        
        if (subObj) {
          // If specific area is selected, set its coats
          if (selectedAreas[areaKey]) {
            updatedLayers[k] = {
              ...subObj,
              coats
            };
          } 
          // If room itself is selected and no specific areas are selected, update all checked areas
          else if (selectedRoomIds[room.id] && !hasSelectedAreas && subObj.checked) {
            updatedLayers[k] = {
              ...subObj,
              coats
            };
          }
        }
      });
      
      return {
        ...updatedRoom,
        ...updatedLayers
      };
    }));

    triggerNotification(`Set coats to ${coats} for selected items.`, 'success');
  };

  // Helper formatting lists of selected areas inside the accordion
  const getRoomHighlightsText = (room: any) => {
    const list: string[] = [];
    if (room.walls?.checked !== false) {
      const coats = room.walls?.coats !== undefined ? room.walls.coats : 2;
      list.push(`Walls (${coats}c)`);
    }
    if (room.ceilings?.checked !== false) {
      const coats = room.ceilings?.coats !== undefined ? room.ceilings.coats : 2;
      list.push(`Ceilings (${coats}c)`);
    }
    if (room.baseboards?.checked !== false) {
      const coats = room.baseboards?.coats !== undefined ? room.baseboards.coats : 2;
      list.push(`Base (${coats}c)`);
    }
    if (room.windows?.checked === true) {
      const qty = room.windows?.qty !== undefined ? room.windows.qty : 2;
      const coats = room.windows?.coats !== undefined ? room.windows.coats : 2;
      list.push(`Windows (${qty} @ ${coats}c)`);
    }
    if (room.doors?.checked === true) {
      const qty = room.doors?.qty !== undefined ? room.doors.qty : 2;
      const coats = room.doors?.coats !== undefined ? room.doors.coats : 2;
      list.push(`Doors (${qty} @ ${coats}c)`);
    }
    if (room.doorFrames?.checked === true) {
      const qty = room.doorFrames?.qty !== undefined ? room.doorFrames.qty : 2;
      const coats = room.doorFrames?.coats !== undefined ? room.doorFrames.coats : 2;
      list.push(`Frames (${qty} @ ${coats}c)`);
    }
    
    if (room.customAreas) {
      room.customAreas.forEach((c: any) => {
        if (c.checked !== false) {
          const coats = c.coats || 2;
          const qtyText = c.qty && c.qty !== 'auto' ? ` (${c.qty} @ ${coats}c)` : ` (${coats}c)`;
          list.push(`${c.label}${qtyText}`);
        }
      });
    }

    if (room.surfaceTasks) {
      const activeTasks = room.surfaceTasks.filter((t: any) => !t.completed);
      if (activeTasks.length > 0) {
        list.push(`${activeTasks.length} task${activeTasks.length > 1 ? 's' : ''}`);
      }
    }

    return list.join(' · ') || 'No surfaces spec';
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      <div className="min-h-screen bg-[#0e0e0e] text-zinc-100 flex flex-col font-sans relative selection:bg-blue-600/30 selection:text-white">
      
      {/* 1. TOP DENSE NAVIGATION BAR MATCHING MOCKUP */}
      <header className="bg-[#161616] border-b border-[#222222] h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
        <div className="flex items-center gap-2 md:gap-4 w-full">
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="p-2 -ml-1 text-zinc-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-blue-500" />
              <span className="text-zinc-500 font-normal hidden sm:inline">Menu</span>
            </button>
          )}

          {onOpenMenu && <span className="text-zinc-700 font-light select-none hidden sm:inline">|</span>}

          {/* Back Icon navigation link */}
          <button 
            onClick={onBack}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-zinc-500 font-normal">Proposals</span>
          </button>
          
          <span className="text-zinc-600 font-light select-none">/</span>

          {/* Proposal Code reference */}
          <h2 className="font-semibold text-white text-sm tracking-wide font-mono">
            {proposalNo}
          </h2>

          {/* Connected Status Dropdown Pill badge */}
          <div className="relative group">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={`text-[11px] font-bold uppercase py-1 pl-2.5 pr-7 rounded-full cursor-pointer focus:outline-none appearance-none border transition tracking-wider ${
                status === 'Approved'
                  ? 'bg-emerald-900/10 border-emerald-550/40 text-emerald-400'
                  : status === 'Draft'
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-blue-900/10 border-blue-500/30 text-blue-400'
              }`}
            >
              <option value="Draft" className="bg-neutral-900 text-white">Drafting</option>
              <option value="Sent" className="bg-neutral-900 text-white">Sent Out</option>
              <option value="Approved" className="bg-neutral-900 text-white">ACCEPTED</option>
              <option value="In Progress" className="bg-neutral-900 text-white">In Progress</option>
              <option value="Completed" className="bg-neutral-900 text-white">Completed</option>
              <option value="Invoiced" className="bg-neutral-900 text-white">Invoiced</option>
            </select>
            <ChevronDown className="w-3 h-3 text-current absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </header>

      {/* 2. ACTIONS SUB-BAR (UNDER THE HEADER, COMPACT, AND HORIZONTALLY SCROLLABLE) */}
      <div className="bg-[#111111] border-b border-[#222222] py-2 px-4 md:px-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 z-10 select-none">
        <button
          onClick={onBack}
          className="px-2.5 py-1 bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 hover:text-red-400 text-zinc-400 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shrink-0"
        >
          <X className="w-3 h-3 text-red-500" /> Discard
        </button>

        <button
          onClick={handleSave}
          className="px-2.5 py-1 bg-neutral-900 border border-neutral-850 hover:border-neutral-750 text-zinc-300 hover:text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-md transition cursor-pointer shrink-0"
        >
          <Save className="w-3 h-3 text-emerald-400 animate-pulse" /> Save Work
        </button>

        <button
          onClick={btnConfig.onClick}
          className={`${btnConfig.className} px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-md transition cursor-pointer shrink-0`}
        >
          <Send className="w-3 h-3" /> {btnConfig.label}
        </button>

        <button
          onClick={() => sendStripeBill(100.00, true)}
          disabled={isSendingStripe}
          className="px-2.5 py-1 bg-neutral-900 border border-neutral-850 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
          title="Send a temporary test $100 Stripe bill to the client's email address"
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
          <span>{isSendingStripe ? 'Sending test...' : 'Test Stripe Bill ($100)'}</span>
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="px-2.5 py-1 bg-neutral-900 border border-neutral-850 hover:border-neutral-750 text-zinc-300 hover:text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
          title="Share Proposal"
        >
          <Share2 className="w-3 h-3 text-blue-400" />
          <span>Share</span>
        </button>

        <button
          onClick={() => setShowPreviewModal(true)}
          className="px-2.5 py-1 bg-neutral-900 border border-neutral-850 hover:border-neutral-750 text-zinc-300 hover:text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
          title="Preview Printable Invoice"
        >
          <Eye className="w-3 h-3 text-zinc-400" />
          <span>Preview</span>
        </button>
      </div>

      {/* 2. DYNAMICAL NOTIFICATION BLOCK */}
      <AnimatePresence>
        {alertText && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-2 border bg-neutral-900 text-xs text-white"
            style={{ borderColor: alertText.type === 'error' ? '#f87171' : '#10b981' }}
          >
            <span className={alertText.type === 'error' ? 'text-red-400' : 'text-emerald-400'}>●</span>
            {alertText.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SCROLLABLE CORE WORKSPACE FRAME */}
      <div className="flex-grow p-6 space-y-6 overflow-y-auto max-w-full pb-32 md:pb-32">

        {/* PROPOSAL VIEW ENGAGEMENT METRICS BANNER */}
        {(project.lastViewedAt || (project.totalViewDurationSec && project.totalViewDurationSec > 0) || project.viewCount) && (
          <div className="bg-blue-950/40 border border-blue-900/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-bold text-blue-200">Client Proposal Engagement:</span>
              <span className="text-zinc-300">
                Viewed {project.viewCount || 1} {project.viewCount === 1 ? 'time' : 'times'}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300">
                Total Review Duration: <strong className="text-white font-mono">{
                  (project.totalViewDurationSec && project.totalViewDurationSec > 0)
                    ? (project.totalViewDurationSec < 60 ? `${project.totalViewDurationSec}s` : `${Math.floor(project.totalViewDurationSec / 60)}m ${project.totalViewDurationSec % 60}s`)
                    : (project.lastViewedAt || project.viewCount ? '< 15s' : '0s')
                }</strong>
              </span>
            </div>
            {project.lastViewedAt && (
              <span className="text-[11px] text-blue-300/80 font-mono">
                Last Viewed: {new Date(project.lastViewedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* METADATA QUICK ACTIONS ROW */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Import lead label Badge */}
            <button 
              onClick={() => triggerNotification('Account already verified.')}
              className="px-3.5 py-1.5 bg-neutral-900 border border-[#262626] hover:border-[#383838] hover:bg-neutral-850 rounded-xl text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Import from Lead</span>
            </button>

            {/* Client Badge (now editable) */}
            <div className="relative flex items-center shrink-0">
              <span className="absolute left-3 flex items-center pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Customer Name"
                className="bg-neutral-900 border border-[#262626] rounded-xl pl-6 pr-3.5 py-1.5 text-xs text-zinc-200 font-bold placeholder-zinc-655 focus:outline-none focus:border-[#444] w-48 font-sans"
              />
            </div>
          </div>

          {/* Full-width interactive address spec */}
          <div className="flex-grow relative flex items-center">
            <div className="absolute left-3.5 text-zinc-500 z-10">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <input
              type="text"
              value={clientAddress}
              onChange={(e) => {
                setClientAddress(e.target.value);
                setAddressVerified(false);
              }}
              placeholder="Client Address"
              className="w-full bg-neutral-950 border border-[#222222] focus:border-[#444] rounded-xl pl-10 pr-28 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-0 font-medium"
            />
            <div className="absolute right-2 flex items-center gap-1.5 z-10">
              {addressVerified && (
                <span className="text-emerald-500 text-[10px] font-mono font-bold flex items-center gap-0.5" title="Verified by Google Maps">
                  ✓ Verified
                </span>
              )}
              <button
                onClick={handleVerifyAddress}
                disabled={isVerifyingAddress}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer font-sans shrink-0"
              >
                {isVerifyingAddress ? 'Verifying...' : '✨ Auto-Correct'}
              </button>
            </div>
          </div>

        </div>

        {/* DETAILS INPUT ROW GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Phone */}
          <div className="relative flex items-center">
            <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5" />
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Phone Number"
              className="w-full bg-neutral-950 border border-[#222222] rounded-xl pl-10 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#444] font-mono"
            />
          </div>

          {/* Email */}
          <div className="relative flex items-center">
            <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5" />
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Client Email"
              className="w-full bg-neutral-950 border border-[#222222] rounded-xl pl-10 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#444] font-medium"
            />
          </div>

          {/* Date */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5" />
            <input
              type="date"
              value={projectDate}
              onChange={(e) => setProjectDate(e.target.value)}
              className="w-full bg-neutral-950 border border-[#222222] rounded-xl pl-10 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#444] font-medium font-mono"
            />
          </div>

          {/* Labor hourly price rate */}
          <div className="relative flex items-center">
            <DollarSign className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5" />
            <div className="flex items-center w-full bg-neutral-950 border border-[#222222] rounded-xl pl-8 pr-1.5 py-0.5">
              <input
                type="number"
                step="0.01"
                value={hourlyLaborRate}
                onChange={(e) => setHourlyLaborRate(Number(e.target.value) || 0)}
                className="w-full bg-transparent border-0 text-xs text-zinc-200 focus:outline-none font-bold font-mono py-1 pr-1"
              />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider select-none shrink-0 border-l border-neutral-800 pl-2">/hr</span>
            </div>
          </div>

          {/* Proposal No */}
          <div className="relative flex items-center col-span-2 md:col-span-1">
            <Hash className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5" />
            <input
              type="text"
              value={proposalNo}
              onChange={(e) => setProposalNo(e.target.value)}
              placeholder="Proposal #"
              className="w-full bg-neutral-950 border border-[#222222] rounded-xl pl-10 pr-3 py-1.5 text-xs text-zinc-350 focus:outline-none focus:border-[#444] font-bold font-mono"
            />
          </div>

        </div>

        {/* CHANGE ORDER ALERT STRIP BANNER */}
        {showChangeOrderBanner && (
          <div className="flex items-center gap-3 bg-[#fdf2e9] border border-[#fbd38d]/25 text-[#c05621] px-4 py-2.5 rounded-xl text-xs font-semibold select-none leading-relaxed animate-fade-in text-left">
            <div className="bg-[#dd6b20]/10 p-1.5 rounded-lg text-[#dd6b20] shrink-0">
              <RefreshCw className="w-4 h-4 text-[#bf5a15]" />
            </div>
            <div>
              <span className="font-bold text-[#9c4210]">Editing Change Order CO-1</span>
              <span className="text-[#bf5a15] font-medium"> — make your changes then send for approval</span>
            </div>
          </div>
        )}

        {/* STICKY ANCHOR NAVIGATION BAR */}
        <div className="sticky top-[52px] z-30 bg-[#0c0c0c]/90 backdrop-blur-md border-y border-neutral-850 px-4 py-2.5 flex items-center justify-between overflow-x-auto scrollbar-none mb-6">
          <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto scrollbar-none">
            {[
              { label: 'Surface Category', icon: Paintbrush, id: 'section-rooms' },
              { label: 'Scope & Terms', icon: FileText, id: 'section-scope' },
              { label: 'Pricing Widget', icon: DollarSign, id: 'section-pricing' },
              { label: 'Proposal Preview', icon: Eye, id: 'section-preview' },
              { label: 'Site Photos', icon: Camera, id: 'section-photos' },
              { label: 'Acceptance', icon: CheckCircle2, id: 'section-acceptance' },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  const el = document.getElementById(sec.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:bg-neutral-800 text-zinc-300 hover:text-white font-mono text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <sec.icon className="w-3.5 h-3.5 text-blue-400" />
                {sec.label}
              </button>
            ))}
          </div>
          <span className="hidden md:inline text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold">
            Project Navigation
          </span>
        </div>

        {/* WORKSPACE MIDDLE GRIDS - 2 COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CHANNELS COLUMN: Configurations + Presets */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SURFACE CATEGORY WORK CARD */}
            <div id="section-rooms" className="scroll-mt-24 bg-[#161616] border border-[#222222] rounded-2xl overflow-hidden text-left shadow-lg">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#222222] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-xs text-white tracking-widest font-mono uppercase">
                    Surface Category
                  </h3>
                  {/* Category switcher */}
                  <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 gap-0.5">
                    {(['interior', 'exterior', 'deck'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCfgCategory(cat);
                          setPresetTab(cat);
                        }}
                        className={`px-2.5 py-0.5 text-[9px] uppercase font-mono rounded font-bold transition cursor-pointer ${
                          cfgCategory === cat 
                            ? (cat === 'interior' ? 'bg-blue-600 text-white' : cat === 'exterior' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white')
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {cat === 'deck' ? 'Decks' : cat}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium font-mono uppercase tracking-wider">
                  Applied to new {cfgCategory} entries
                </span>
              </div>

              {/* Dimension Settings controls row */}
              <div className="p-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-[#222222] bg-[#121212]/30 text-xs">
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  {/* Length ft */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-medium font-mono">Length</span>
                    <div className="flex items-center bg-neutral-950 border border-[#222222] rounded-xl overflow-hidden px-1 py-0.5">
                      <button 
                        type="button"
                        onClick={() => setCfgLength(prev => Math.max(1, prev - 1))}
                        className="p-1 px-2 text-zinc-400 hover:text-white hover:bg-neutral-900 border-r border-[#222222] cursor-pointer"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        min="1"
                        max="300"
                        value={cfgLength}
                        onChange={(e) => setCfgLength(Math.max(1, Number(e.target.value) || 0))}
                        className="w-14 bg-transparent text-center font-bold text-white font-mono focus:outline-none py-0.5"
                      />
                      <span className="text-[10px] text-zinc-500 pr-1 font-mono">ft</span>
                      <button 
                        type="button"
                        onClick={() => setCfgLength(prev => Math.min(300, prev + 1))}
                        className="p-1 px-2 text-zinc-400 hover:text-white hover:bg-neutral-900 border-l border-[#222222] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Width ft */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-medium font-mono">Width</span>
                    <div className="flex items-center bg-neutral-950 border border-[#222222] rounded-xl overflow-hidden px-1 py-0.5">
                      <button 
                        type="button"
                        onClick={() => setCfgWidth(prev => Math.max(1, prev - 1))}
                        className="p-1 px-2 text-zinc-400 hover:text-white hover:bg-neutral-900 border-r border-[#222222] cursor-pointer"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        min="1"
                        max="300"
                        value={cfgWidth}
                        onChange={(e) => setCfgWidth(Math.max(1, Number(e.target.value) || 0))}
                        className="w-14 bg-transparent text-center font-bold text-white font-mono focus:outline-none py-0.5"
                      />
                      <span className="text-[10px] text-zinc-500 pr-1 font-mono">ft</span>
                      <button 
                        type="button"
                        onClick={() => setCfgWidth(prev => Math.min(300, prev + 1))}
                        className="p-1 px-2 text-zinc-400 hover:text-white hover:bg-neutral-900 border-l border-[#222222] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Height ft */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-medium font-mono">{cfgCategory === 'interior' ? 'Ceiling' : 'Height'}</span>
                    <div className="flex items-center bg-neutral-950 border border-[#222222] rounded-xl overflow-hidden px-1 py-0.5">
                      <button 
                        type="button"
                        onClick={() => setCfgCeilingHeight(prev => Math.max(6, prev - 1))}
                        className="p-1 px-2 text-zinc-400 hover:text-white hover:bg-neutral-900 border-r border-[#222222] cursor-pointer"
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={cfgCeilingHeight}
                        onChange={(e) => setCfgCeilingHeight(Math.max(1, Number(e.target.value) || 0))}
                        className="w-14 bg-transparent text-center font-bold text-white font-mono focus:outline-none py-0.5"
                      />
                      <span className="text-[10px] text-zinc-500 pr-1 font-mono">ft</span>
                      <button 
                        type="button"
                        onClick={() => setCfgCeilingHeight(prev => Math.min(100, prev + 1))}
                        className="p-1 px-2 text-zinc-400 hover:text-white hover:bg-neutral-900 border-l border-[#222222] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Surface Area Realtime Calculation Banner */}
                {(() => {
                  const wArea = Math.round(2 * cfgCeilingHeight * (cfgLength + cfgWidth));
                  const cArea = Math.round(cfgLength * cfgWidth);
                  const totalArea = wArea + cArea;
                  return (
                    <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-3 py-1.5 font-mono text-[11px]">
                      <span className="text-zinc-400">Surface Area:</span>
                      <span className="text-blue-400 font-bold">{totalArea.toLocaleString()} <span className="text-[9px] text-zinc-500 font-normal">sq ft</span></span>
                      <span className="text-zinc-600">|</span>
                      <span className="text-zinc-400 text-[10px]">Walls: {wArea} sqft • Ceiling: {cArea} sqft</span>
                    </div>
                  );
                })()}

                {/* Wall Paint / Coating */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium font-mono">Paint</span>
                  <div className="relative">
                    <select
                      value={cfgWallPaint}
                      onChange={(e) => setCfgWallPaint(e.target.value)}
                      className="bg-neutral-950 border border-[#222222] rounded-xl py-1.5 pl-3.5 pr-8 text-xs text-white font-bold font-mono focus:outline-none focus:border-[#444] appearance-none cursor-pointer"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Premium Sherwin">Premium Sherwin</option>
                      <option value="Ben Moore Aura">Ben Moore Aura</option>
                      <option value="Ultra Weather Shield">Weather Siding</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Surface Category Specifications Table List */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono border-b border-neutral-800 pb-2 mb-2">
                  <div className="col-span-6 text-left">Surface Category ({cfgCategory.toUpperCase()})</div>
                  <div className="col-span-3 text-center">Qty</div>
                  <div className="col-span-3 text-right">Coats</div>
                </div>

                {/* Checklist Areas loop based on category */}
                <div className="space-y-1.5">
                  {(cfgCategory === 'interior' ? [
                    { key: 'walls', label: 'Walls', isAuto: true },
                    { key: 'ceilings', label: 'Ceilings', isAuto: true },
                    { key: 'baseboards', label: 'Baseboards', isAuto: true },
                    { key: 'windows', label: 'Windows', isAuto: false },
                    { key: 'doors', label: 'Doors', isAuto: false },
                    { key: 'doorFrames', label: 'Door Frames', isAuto: false },
                  ] : cfgCategory === 'deck' ? [
                    { key: 'deck-horizontal', label: 'Deck Horizontal Surface', isAuto: true },
                    { key: 'deck-fence', label: 'Fence', isAuto: true },
                    { key: 'deck-spindles', label: 'Spindles and Railings', isAuto: true },
                    { key: 'deck-stairs', label: 'Stairs', isAuto: false },
                    { key: 'deck-body', label: 'Deck', isAuto: true },
                  ] : [
                    { key: 'ext-whole-house', label: 'Whole House', isAuto: true },
                    { key: 'ext-front-side', label: 'Front side', isAuto: true },
                    { key: 'ext-right-side', label: 'Right side', isAuto: true },
                    { key: 'ext-left-side', label: 'Left side', isAuto: true },
                    { key: 'ext-back-side', label: 'Back side', isAuto: true },
                    { key: 'ext-doors', label: 'doors', isAuto: false },
                    { key: 'ext-windows', label: 'Windows', isAuto: false },
                    { key: 'ext-fence', label: 'Fence', isAuto: true },
                    { key: 'ext-shed', label: 'Shed', isAuto: false },
                    { key: 'ext-porch', label: 'Porch', isAuto: true },
                    { key: 'ext-garage-doors', label: 'Garage Doors', isAuto: false },
                    { key: 'ext-deck-horizontal', label: 'Deck Horizontal Surface', isAuto: true },
                    { key: 'ext-deck', label: 'Deck', isAuto: true },
                  ]).map((item) => {
                    const isChecked = (configChecked as any)[item.key] ?? true;
                    const qtyVal = (configQty as any)[item.key] || 1;
                    const coatsVal = (configCoats as any)[item.key] || 2;

                    return (
                      <div 
                        key={item.key} 
                        className={`grid grid-cols-12 items-center py-2 px-3.5 rounded-xl border transition ${
                          isChecked 
                            ? 'bg-neutral-900/60 border-neutral-850/60 text-zinc-150' 
                            : 'bg-transparent border-transparent opacity-40 text-zinc-500'
                        }`}
                      >
                        {/* Area checkbox + Label */}
                        <div className="col-span-6 flex items-center gap-3 text-left">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setConfigChecked(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="w-4.5 h-4.5 rounded border-[#3a3a3a] bg-neutral-950 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs font-bold font-mono">{item.label}</span>
                        </div>

                        {/* Qty value adjust */}
                        <div className="col-span-3 flex justify-center text-center">
                          {item.isAuto ? (
                            <span className="text-[10px] text-zinc-500 bg-neutral-950 px-2 py-0.5 rounded font-mono uppercase select-none">auto</span>
                          ) : (
                            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden py-0.5 text-[11px] font-bold">
                              <button 
                                disabled={!isChecked}
                                onClick={() => setConfigQty(prev => ({ ...prev, [item.key]: Math.max(1, qtyVal - 1) }))}
                                className="px-2 text-zinc-500 hover:text-white select-none disabled:opacity-30 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-1.5 font-mono text-white">{qtyVal}</span>
                              <button 
                                disabled={!isChecked}
                                onClick={() => setConfigQty(prev => ({ ...prev, [item.key]: Math.min(20, qtyVal + 1) }))}
                                className="px-2 text-zinc-500 hover:text-white select-none disabled:opacity-30 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Coats value adjust */}
                        <div className="col-span-3 flex justify-end text-right">
                          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden py-0.5 text-[11px] font-bold">
                            <button 
                              disabled={!isChecked}
                              onClick={() => setConfigCoats(prev => ({ ...prev, [item.key]: Math.max(1, coatsVal - 1) }))}
                              className="px-2 text-zinc-500 hover:text-white select-none disabled:opacity-30 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono text-white">{coatsVal}</span>
                            <button 
                              disabled={!isChecked}
                              onClick={() => setConfigCoats(prev => ({ ...prev, [item.key]: Math.min(4, coatsVal + 1) }))}
                              className="px-2 text-zinc-500 hover:text-white select-none disabled:opacity-30 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Add Area dropdown select mimic using active category area presets */}
                <div className="mt-3.5 relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        triggerNotification(`Added ${e.target.value} layer to ${cfgCategory} configuration.`);
                        e.target.value = '';
                      }
                    }}
                    className="w-full bg-neutral-950 border border-dashed border-[#2d2d2d] hover:border-neutral-700 text-zinc-400 font-bold text-xs py-2 px-4 rounded-xl focus:outline-none focus:ring-0 appearance-none text-left cursor-pointer transition flex items-center justify-between"
                  >
                    <option value="">+ Add {cfgCategory} preset area...</option>
                    {(proposalSettings.areaPresets || DEFAULT_PROPOSAL_SETTINGS.areaPresets || PRESET_AREAS[cfgCategory])
                      .filter(ap => (ap as any).category ? (ap as any).category === cfgCategory : true)
                      .map((ap, idx) => (
                        <option key={(ap as any).id || `${ap.label}-${idx}`} value={ap.label}>
                          {ap.label}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* TASKS SECTION BELOW SURFACE CATEGORIES */}
                <div className="mt-6 pt-5 border-t border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-blue-400" />
                      <h4 className="font-mono font-bold text-xs text-white tracking-widest uppercase">
                        Tasks ({cfgCategory.toUpperCase()})
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {(categoryTasks[cfgCategory] || []).length} active
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono italic">
                      {cfgCategory === 'deck' ? 'Pre-populated for decks' : 'Starts empty for ' + cfgCategory}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {(categoryTasks[cfgCategory] || []).length === 0 ? (
                      <div className="p-4 bg-neutral-950/60 border border-dashed border-neutral-800 rounded-xl text-center">
                        <p className="text-xs text-zinc-500 font-mono">
                          No tasks added for {cfgCategory} yet. Add surface tasks below (e.g. prep walls, sand ceiling, prime baseboards).
                        </p>
                      </div>
                    ) : (
                      (categoryTasks[cfgCategory] || []).map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition font-mono text-xs ${
                            task.isOption
                              ? 'bg-amber-950/25 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                              : 'bg-neutral-900/80 border-neutral-800 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={task.completed !== false}
                              onChange={() => {
                                setCategoryTasks(prev => ({
                                  ...prev,
                                  [cfgCategory]: prev[cfgCategory].map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
                                }));
                              }}
                              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-blue-500 focus:ring-0 cursor-pointer"
                            />
                            <span className={`font-bold ${task.completed !== false ? '' : 'text-zinc-500 line-through'}`}>
                              {task.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {task.surfaceCategory && (
                              <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-md font-mono">
                                {task.surfaceCategory}
                              </span>
                            )}

                            {/* Option Toggle Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryTasks(prev => ({
                                  ...prev,
                                  [cfgCategory]: prev[cfgCategory].map(t => t.id === task.id ? { ...t, isOption: !t.isOption } : t)
                                }));
                              }}
                              className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                task.isOption
                                  ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                  : 'bg-neutral-950 border-neutral-800 text-zinc-400 hover:text-white hover:border-neutral-700'
                              }`}
                              title={task.isOption ? "Active Option. Click to make standard task." : "Mark task as Option"}
                            >
                              <Diamond className={`w-3 h-3 ${task.isOption ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                              <span>Option</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCategoryTasks(prev => ({
                                  ...prev,
                                  [cfgCategory]: prev[cfgCategory].filter(t => t.id !== task.id)
                                }));
                              }}
                              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-neutral-800 rounded transition cursor-pointer"
                              title="Remove task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Task Input Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTaskInput.trim()) {
                            const tText = newTaskInput.trim();
                            const newTaskObj: SurfaceTask = {
                              id: `task-${Date.now()}`,
                              text: tText,
                              completed: true,
                              surfaceCategory: newTaskSurfaceCategory,
                              isOption: newTaskIsOption,
                            };
                            setCategoryTasks(prev => ({
                              ...prev,
                              [cfgCategory]: [...(prev[cfgCategory] || []), newTaskObj]
                            }));
                            setNewTaskInput('');
                            triggerNotification(`Added task "${tText}" to ${cfgCategory}!`);
                          }
                        }
                      }}
                      placeholder="Add a new task (e.g. Washing, Sanding, Staining, Priming...)"
                      className="flex-1 min-w-[180px] bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono outline-none"
                    />

                    <select
                      value={newTaskSurfaceCategory}
                      onChange={(e) => setNewTaskSurfaceCategory(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-zinc-300 font-mono outline-none cursor-pointer"
                    >
                      <option value="Walls">Walls</option>
                      <option value="Ceiling">Ceiling</option>
                      <option value="Baseboards">Baseboards</option>
                      <option value="Trim / Doors">Trim / Doors</option>
                      <option value="Deck Prep">Deck Prep</option>
                      <option value="Deck Finish">Deck Finish</option>
                      <option value="Siding / Exterior">Siding / Exterior</option>
                      <option value="General">General</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setNewTaskIsOption(prev => !prev)}
                      className={`px-3 py-2 text-xs font-bold font-mono rounded-xl border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        newTaskIsOption
                          ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                          : 'bg-neutral-950 border-neutral-800 text-zinc-400 hover:text-white'
                      }`}
                      title={newTaskIsOption ? "New task will be added as an Option" : "Click to mark new task as Option"}
                    >
                      <Diamond className={`w-3.5 h-3.5 ${newTaskIsOption ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                      <span>Option</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newTaskInput.trim()) return;
                        const tText = newTaskInput.trim();
                        const newTaskObj: SurfaceTask = {
                          id: `task-${Date.now()}`,
                          text: tText,
                          completed: true,
                          surfaceCategory: newTaskSurfaceCategory,
                          isOption: newTaskIsOption,
                        };
                        setCategoryTasks(prev => ({
                          ...prev,
                          [cfgCategory]: [...(prev[cfgCategory] || []), newTaskObj]
                        }));
                        setNewTaskInput('');
                        triggerNotification(`Added task "${tText}" to ${cfgCategory}!`);
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* ADD ROOM PRESETS BLOCK */}
            <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 text-left shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-xs text-white tracking-widest font-mono uppercase">
                  Add Surface Category Preset
                </h3>
                {/* Internal sub-tabs for presets category */}
                <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-850 gap-0.5">
                  {(['interior', 'exterior', 'deck'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setPresetTab(t);
                        setCfgCategory(t);
                      }}
                      className={`px-2 py-0.5 text-[9px] uppercase font-mono rounded font-bold transition cursor-pointer ${
                        presetTab === t ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {t === 'deck' ? 'Decks' : t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {presetTab === 'interior' && [
                  { name: 'Entrance', l: 15, w: 12 },
                  { name: 'Living Room', l: 18, w: 14 },
                  { name: 'Dining Room', l: 14, w: 12 },
                  { name: 'Kitchen', l: 15, w: 12 },
                  { name: 'Master Bedroom', l: 18, w: 14 },
                  { name: 'Bedroom', l: 12, w: 12 },
                  { name: 'Hallway', l: 16, w: 6 },
                  { name: 'Stairwell', l: 10, w: 8 },
                  { name: 'Bathroom', l: 11, w: 8 },
                  { name: 'Basement', l: 26, w: 20 },
                  { name: 'Office', l: 12, w: 12 },
                ].map((preset, idx) => (
                  <button
                    key={`${preset.name}-${idx}`}
                    onClick={() => handleAddRoomPreset(preset.name, preset.l, preset.w, 'interior')}
                    className="bg-neutral-900 border border-[#222222] hover:border-indigo-500/30 hover:bg-neutral-850 px-3 py-1.5 text-[11px] font-bold font-mono rounded-lg transition text-zinc-300 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>+</span> {preset.name}
                  </button>
                ))}

                {presetTab === 'exterior' && [
                  { name: 'Whole House', l: 40, w: 30 },
                  { name: 'Front side', l: 40, w: 15 },
                  { name: 'Right side', l: 30, w: 15 },
                  { name: 'Left side', l: 30, w: 15 },
                  { name: 'Back side', l: 40, w: 15 },
                  { name: 'doors', l: 8, w: 4 },
                  { name: 'Windows', l: 10, w: 5 },
                  { name: 'Fence', l: 60, w: 6 },
                  { name: 'Shed', l: 12, w: 10 },
                  { name: 'Porch', l: 15, w: 10 },
                  { name: 'Garage Doors', l: 16, w: 8 },
                  { name: 'Deck Horizontal Surface', l: 20, w: 15 },
                  { name: 'Deck', l: 20, w: 15 },
                ].map((preset, idx) => (
                  <button
                    key={`${preset.name}-${idx}`}
                    onClick={() => handleAddRoomPreset(preset.name, preset.l, preset.w, 'exterior')}
                    className="bg-neutral-900 border border-[#222222] hover:border-amber-500/30 hover:bg-neutral-850 px-3 py-1.5 text-[11px] font-bold font-mono rounded-lg transition text-zinc-300 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>+</span> {preset.name}
                  </button>
                ))}

                {presetTab === 'deck' && [
                  { name: 'Deck Horizontal Surface', l: 20, w: 15 },
                  { name: 'Fence', l: 50, w: 6 },
                  { name: 'Spindles and Railings', l: 40, w: 3 },
                  { name: 'Stairs', l: 10, w: 6 },
                  { name: 'Deck', l: 20, w: 15 },
                ].map((preset, idx) => (
                  <button
                    key={`${preset.name}-${idx}`}
                    onClick={() => handleAddRoomPreset(preset.name, preset.l, preset.w, 'deck')}
                    className="bg-neutral-900 border border-[#222222] hover:border-emerald-500/30 hover:bg-neutral-850 px-3 py-1.5 text-[11px] font-bold font-mono rounded-lg transition text-zinc-300 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>+</span> {preset.name}
                  </button>
                ))}

                <button
                  onClick={() => {
                    const customName = window.prompt(`Enter custom ${presetTab} area name:`);
                    if (customName) handleAddRoomPreset(customName, cfgLength, cfgWidth, presetTab);
                  }}
                  className="bg-transparent border border-dashed border-[#2d2d2d] hover:border-neutral-600 px-3 py-1.5 text-[11px] font-medium font-mono rounded-lg transition text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center gap-1 shrink-0"
                >
                  + Custom
                </button>
              </div>

            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN: Live price estimation widget */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LIVE PRICE PANEL CARD */}
            <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 text-left shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest font-mono">
                  Live price
                </span>
                <Sparkles className="w-4.5 h-4.5 text-blue-500" />
              </div>

              {/* Main numerical showcase */}
              <div className="py-4 flex items-baseline">
                <span className="font-display font-black text-white text-5xl tracking-tight leading-none font-mono">
                  ${liveSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Bento-grid sub-sub boxes stats */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                
                {/* Hours */}
                <div className="bg-neutral-900/50 border border-neutral-850/60 p-3.5 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">Hours</span>
                  <span className="text-sm font-bold text-zinc-300 font-mono block mt-1">
                    {liveSummary.hours} hrs
                  </span>
                </div>

                {/* Labour */}
                <div className="bg-neutral-900/50 border border-neutral-850/60 p-3.5 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">Labour</span>
                  <span className="text-sm font-bold text-zinc-300 font-mono block mt-1">
                    ${liveSummary.laborCost.toLocaleString()}
                  </span>
                </div>

                {/* Materials */}
                <div className="bg-neutral-900/50 border border-neutral-850/60 p-3.5 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">Materials</span>
                  <span className="text-sm font-bold text-zinc-300 font-mono block mt-1">
                    ${liveSummary.materialCost.toLocaleString()}
                  </span>
                </div>

                {/* HST (13%) */}
                <div className="bg-neutral-900/50 border border-neutral-850/60 p-3.5 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                  <span className="text-sm font-bold text-zinc-300 font-mono block mt-1">
                    ${Math.round(liveSummary.hst).toLocaleString()}
                  </span>
                </div>

              </div>

              {/* 50% Direct Cost Benchmark Target Breakdown Card */}
              <div className="bg-neutral-900/60 border border-blue-900/40 p-3.5 rounded-xl mt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    50% Direct Cost Benchmark Target
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">35% Labor | 15% Material</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
                    <div className="text-[9px] text-zinc-500 uppercase font-bold">Target Labor (35%)</div>
                    <div className="text-zinc-200 font-bold mt-0.5 text-xs">
                      ${Math.round(liveSummary.subtotal * 0.35).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-zinc-400 mt-1">
                      Actual: <span className={liveSummary.laborCost <= liveSummary.subtotal * 0.35 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>${liveSummary.laborCost.toLocaleString()}</span> ({((liveSummary.laborCost / (liveSummary.subtotal || 1)) * 100).toFixed(1)}%)
                    </div>
                  </div>

                  <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
                    <div className="text-[9px] text-zinc-500 uppercase font-bold">Target Material (15%)</div>
                    <div className="text-zinc-200 font-bold mt-0.5 text-xs">
                      ${Math.round(liveSummary.subtotal * 0.15).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-zinc-400 mt-1">
                      Actual: <span className={liveSummary.materialCost <= liveSummary.subtotal * 0.15 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>${liveSummary.materialCost.toLocaleString()}</span> ({((liveSummary.materialCost / (liveSummary.subtotal || 1)) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] font-mono">
                  <span className="text-zinc-400">Total Direct Target (50%): <strong className="text-zinc-200">${Math.round(liveSummary.subtotal * 0.50).toLocaleString()}</strong></span>
                  <span className="text-zinc-400">Gross Margin Target: <strong className="text-emerald-400">50.0%</strong></span>
                </div>
              </div>

              {/* Dynamic Adjustments Panel */}
              <div className="bg-neutral-900/40 border border-neutral-850/60 p-3 rounded-xl mt-3 space-y-3">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">Dynamic Adjustments</span>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Preset Discount Selector */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono">Apply Discount Preset</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const presets = proposalSettings.discountPresets || DEFAULT_PROPOSAL_SETTINGS.discountPresets || [];
                        const preset = presets.find(p => p.id === val);
                        if (preset) {
                          if (preset.type === 'percentage') {
                            const subtotal = liveSummary.laborCost + liveSummary.materialCost;
                            const calculated = Math.round(subtotal * (preset.amount / 100));
                            setDiscount(calculated);
                          } else {
                            setDiscount(preset.amount);
                          }
                        }
                        // Reset selection after applying
                        e.target.value = '';
                      }}
                      className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-lg py-1.5 px-2 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Preset Discount --</option>
                      {(proposalSettings.discountPresets || DEFAULT_PROPOSAL_SETTINGS.discountPresets || []).map(preset => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} ({preset.type === 'percentage' ? `${preset.amount}%` : `$${preset.amount}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Discount input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono">Discount ($)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        value={discount || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setDiscount(val);
                        }}
                        placeholder="0"
                        className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-lg py-1.5 pl-6 pr-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Tax Rate selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono">Tax Rate</label>
                    <select
                      value={taxRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTaxRate(val);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-lg py-1.5 px-2 text-xs text-white outline-none font-mono cursor-pointer"
                    >
                      <option value="0">Exempt (0%)</option>
                      <option value="0.05">GST (5%)</option>
                      <option value="0.08">HST (8%)</option>
                      <option value="0.13">HST (13%)</option>
                      <option value="0.15">HST (15%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DETAILED COST SECTION LIST */}
              <div className="border-t border-neutral-800/60 mt-5 pt-4 space-y-2.5 text-xs">
                
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-mono">Subtotal</span>
                  <span className="font-bold text-zinc-300 font-mono">
                    ${liveSummary.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-500 font-medium">
                    <span className="font-mono">Discount</span>
                    <span className="font-mono font-bold">
                      -${liveSummary.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-mono">HST ({(taxRate * 100).toFixed(0)}%)</span>
                  <span className="font-bold text-zinc-300 font-mono">
                    ${liveSummary.hst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between font-bold border-t border-neutral-800/60 pt-3 text-sm">
                  <span className="text-white">Total</span>
                  <span className="text-white text-base font-black font-mono">
                    ${liveSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-500 pt-1.5">
                  <span className="font-mono">Deposit (30%)</span>
                  <span className="font-bold text-zinc-300 font-mono">
                    ${liveSummary.deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-mono">Balance (70%)</span>
                  <span className="font-bold text-zinc-300 font-mono">
                    ${liveSummary.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

              </div>

            </div>

            {/* PROPOSAL PHOTOS CARD */}
            <div id="section-photos" className="scroll-mt-24 bg-[#161616] border border-[#222222] rounded-2xl p-5 text-left shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                <span className="text-zinc-400 font-bold text-xs uppercase tracking-widest font-mono flex items-center gap-2">
                  <Camera className="w-4 h-4 text-zinc-500" /> Proposal Photos ({photos.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-medium font-mono uppercase">
                  Site Attachments
                </span>
              </div>

              {/* Photos display flex row/grid */}
              {photos.length === 0 ? (
                <div className="py-6 border border-dashed border-neutral-800 rounded-xl text-center text-zinc-500 text-xs italic">
                  No site photos attached yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {photos.map((item) => (
                    <div key={item.id} className="group relative bg-[#121212] border border-neutral-850 rounded-xl overflow-hidden shadow-sm flex flex-col">
                      {/* Image render */}
                      <div className="aspect-video w-full overflow-hidden bg-neutral-950 relative">
                        <img 
                          src={item.url} 
                          alt="site progress photo" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {/* Delete button option */}
                        <button
                          onClick={() => {
                            setPhotos(prev => prev.filter(p => p.id !== item.id));
                            triggerNotification('Photo attachment deleted.');
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-neutral-900 text-zinc-300 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Caption text edit inline */}
                      <div className="p-2 flex-grow">
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, caption: val } : p));
                          }}
                          className="w-full bg-transparent border-0 font-medium text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-0 p-0 truncate font-sans hover:text-white"
                          title="Click to edit caption"
                          placeholder="Edit caption..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload controls anchor panel */}
              <div className="relative border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 rounded-xl p-4 transition-all group flex flex-col items-center justify-center text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Upload className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 group-hover:scale-110 transition duration-300 mb-2" />
                <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-200">
                  Upload Site Photos
                </span>
                <span className="text-[10px] text-zinc-600 mt-1">
                  Drag & drop, base64 cached locally
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* 4. BOTTOM SECTOR: ACTIVE CONFIGURED ROOMS ACCORDION SHEET */}
        <div className="bg-[#161616] border border-[#222222] rounded-2xl overflow-hidden text-left shadow-lg">
          
          <div className="px-5 py-4 border-b border-[#222222] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-mono font-bold text-xs text-white tracking-widest uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Configured Room Specs</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Organize rooms, customize surface categories, add surface category tasks, or group rooms into collapsible headings.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Select Feature / Group Rooms Mode Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextMode = !selectMode;
                  setSelectMode(nextMode);
                  if (!nextMode) {
                    setSelectedRoomIds({});
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer shadow-md ${
                  selectMode 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 border border-blue-400' 
                    : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-zinc-200 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-blue-300" />
                <span>{selectMode ? 'Exit Selection Mode' : 'Select Feature / Group Rooms'}</span>
              </button>

              <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl">
                {rooms.length} Rooms active
              </span>
            </div>
          </div>

          {/* SELECTION FEATURE & GROUPING CONTROL BAR */}
          {(selectMode || Object.values(selectedRoomIds).some(Boolean)) && (
            <div className="m-5 p-4 bg-gradient-to-r from-blue-950/60 to-indigo-950/40 border-2 border-blue-500/70 rounded-2xl space-y-3 animate-fade-in shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-blue-900/80 border border-blue-700/80 rounded-xl text-blue-300 shadow">
                    <FolderPlus className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Group Selected Rooms & Heading Creator
                    </h4>
                    <p className="text-[10px] text-blue-200/80 font-mono">
                      {Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]).length} of {rooms.length} rooms currently selected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllRooms}
                    className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 border border-blue-700/80 text-blue-200 hover:text-white text-xs font-mono font-bold rounded-lg transition cursor-pointer"
                  >
                    {rooms.length > 0 && rooms.every(r => selectedRoomIds[r.id]) ? 'Deselect All Rooms' : 'Select All Rooms'}
                  </button>

                  {Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoomIds({})}
                      className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono rounded-lg transition cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Grouping Name Input & Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[260px] flex items-center gap-2">
                  <label className="text-xs font-bold text-blue-300 font-mono whitespace-nowrap shrink-0">
                    Group Heading:
                  </label>
                  <input
                    type="text"
                    value={groupInputName}
                    onChange={(e) => setGroupInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGroupSelectedRooms(groupInputName);
                      }
                    }}
                    placeholder="Enter heading name (e.g. Main Level, Master Suite, Deck Area...)"
                    className="flex-1 bg-neutral-950 border border-blue-600/60 focus:border-blue-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleGroupSelectedRooms(groupInputName)}
                  disabled={Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]).length === 0}
                  className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg ${
                    Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]).length > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 border border-blue-400'
                      : 'bg-neutral-900 text-zinc-600 border border-neutral-800 cursor-not-allowed'
                  }`}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Group Selected Rooms</span>
                </button>

                {Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedIds = Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]);
                      if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected room(s)?`)) {
                        setRooms(prev => prev.filter(r => !selectedIds.includes(r.id)));
                        setSelectedRoomIds({});
                        triggerNotification(`Deleted ${selectedIds.length} room(s)`);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white text-xs font-mono font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete ({Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]).length})</span>
                  </button>
                )}
              </div>
            </div>
          )}



          <div className="space-y-6 text-left p-5">
            {rooms.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs italic">
                No rooms added. Click a folder preset button above to add paint categories.
              </div>
            ) : (
              [
                { id: 'interior', title: 'Interior Scope', bgClass: 'bg-indigo-950/10 border border-indigo-950 shadow-[0_4px_20px_rgba(99,102,241,0.03)]', textClass: 'text-indigo-400', barClass: 'bg-indigo-500' },
                { id: 'exterior', title: 'Exterior Scope', bgClass: 'bg-amber-950/10 border border-amber-950 shadow-[0_4px_20px_rgba(245,158,11,0.03)]', textClass: 'text-amber-400', barClass: 'bg-amber-500' },
                { id: 'deck', title: 'Deck & Staining Scope', bgClass: 'bg-emerald-950/10 border border-emerald-950 shadow-[0_4px_20px_rgba(16,185,129,0.03)]', textClass: 'text-emerald-400', barClass: 'bg-emerald-500' }
              ].map(cat => {
                const catRooms = rooms.filter(r => (r.category || 'interior') === cat.id);
                if (catRooms.length === 0) return null;

                return (
                  <div key={cat.id} className={`p-4 rounded-2xl ${cat.bgClass} space-y-4`}>
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-3.5 rounded-full ${cat.barClass}`} />
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${cat.textClass}`}>{cat.title}</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">({catRooms.length})</span>
                      </div>
                      {selectMode && (
                        <button
                          type="button"
                          onClick={() => handleSelectAllRoomsInCategory(cat.id, rooms)}
                          className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[9px] text-zinc-400 hover:text-white font-mono transition cursor-pointer font-bold animate-fade-in"
                        >
                          {catRooms.every(r => selectedRoomIds[r.id]) ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        const groupNames = Array.from(new Set(catRooms.map(r => r.groupName).filter(Boolean))) as string[];
                        const ungroupedRooms = catRooms.filter(r => !r.groupName);

                        const renderRoomCardContent = (room: RoomSpec) => {
                          const isExpanded = !!expandedRoomIds[room.id];
                          const roomPrice = liveSummary.roomCosts[room.id] || 0;
                          const isRoomSelected = !!selectedRoomIds[room.id];

                          return (
                            <div 
                              key={room.id} 
                              className={`transition-all rounded-2xl overflow-hidden border ${
                                isRoomSelected && selectMode
                                  ? 'border-blue-500/80 bg-blue-950/15'
                                  : 'border-neutral-800/80 bg-neutral-900/60'
                              }`}
                            >
                            
                            {/* ACCORDION BAR TITLE HEADER */}
                            <div 
                              onClick={() => {
                                if (selectMode) {
                                  handleToggleRoomSelection(room.id);
                                } else {
                                  toggleRoomExpand(room.id);
                                }
                              }}
                              className="px-5 py-4 flex items-center justify-between hover:bg-neutral-850/40 cursor-pointer select-none transition-all group"
                            >
                              <div className="flex items-center gap-3 truncate">
                                <div className="flex items-center gap-2 shrink-0">
                                  {selectMode && (
                                    <input
                                      type="checkbox"
                                      checked={isRoomSelected}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={() => handleToggleRoomSelection(room.id)}
                                      className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-950 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer animate-fade-in"
                                    />
                                  )}
                                  <div 
                                    onClick={(e) => {
                                      if (selectMode) {
                                        e.stopPropagation();
                                        toggleRoomExpand(room.id);
                                      }
                                    }}
                                    className={`p-1 hover:bg-neutral-800 rounded transition ${isExpanded ? 'rotate-95 text-blue-400' : 'text-zinc-500'}`}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </div>
                                </div>
                                <div className="truncate">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">{room.name}</h4>
                                    {room.groupName && (
                                      <span className="text-[10px] bg-blue-950/90 text-blue-300 border border-blue-700/60 font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shadow-sm">
                                        <Folder className="w-3 h-3 text-blue-400" />
                                        <span>{room.groupName}</span>
                                      </span>
                                    )}
                                    {room.isOption && (
                                      <span className="text-[9px] bg-yellow-950/80 text-yellow-500 border border-yellow-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Option
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate font-medium">
                                    {getRoomHighlightsText(room)}
                                  </p>
                                </div>
                              </div>

                              {/* Right values pricing / copy trash panel */}
                              <div className="flex items-center gap-6 shrink-0">
                                <span className="font-mono text-zinc-200 font-bold text-sm">
                                  ${roomPrice.toLocaleString()}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isOption: !r.isOption } : r));
                                    }}
                                    className={`p-1 px-2.5 text-[10px] border rounded-lg transition flex items-center font-bold font-mono cursor-pointer ${
                                      room.isOption
                                        ? 'bg-yellow-950/80 border-yellow-500/50 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.25)]'
                                        : 'bg-neutral-900 border-neutral-800 text-zinc-400 hover:text-white hover:border-[#444]'
                                    }`}
                                    title={room.isOption ? "Active Option. Click to set as standard room." : "Set as Option"}
                                  >
                                    Option
                                  </button>

                                  <button
                                    onClick={(e) => handleCopyRoom(room, e)}
                                    className="p-1 px-2.5 text-[10px] bg-neutral-900 border border-neutral-800 text-zinc-400 hover:text-white hover:border-[#444] rounded-lg transition flex items-center gap-1.5 font-bold font-mono cursor-pointer"
                                    title="Clone specification layout"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Duplicate</span>
                                  </button>
                                  
                                  <button
                                    onClick={(e) => handleDeleteRoom(room.id, e)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition cursor-pointer"
                                    title="Remove specs"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* EXPANDABLE CORNER DIMENSIONS EDITOR SECTION */}
                            {isExpanded && (
                              <div className="p-5 bg-neutral-950/50 border-t border-neutral-850/60 text-xs text-[#a0a0a5] space-y-4 text-left animate-fade-in">
                                
                                {/* Numerical sizing dimensions inputs */}
                                <div className="grid grid-cols-3 gap-3">
                                  
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider">Length (ft)</label>
                                    <input
                                      type="number"
                                      value={room.length}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, length: val } : r));
                                      }}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider">Width (ft)</label>
                                    <input
                                      type="number"
                                      value={room.width}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, width: val } : r));
                                      }}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider">Ceiling Height (ft)</label>
                                    <input
                                      type="number"
                                      value={room.height}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, height: val } : r));
                                      }}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                                    />
                                  </div>

                                </div>

                                {/* Surface Area Breakdown Callout Banner */}
                                {(() => {
                                  const rL = room.length || 0;
                                  const rW = room.width || 0;
                                  const rH = room.height || 0;
                                  const wArea = Math.round(2 * rH * (rL + rW));
                                  const cArea = Math.round(rL * rW);
                                  const totalArea = wArea + cArea;
                                  const perimeter = Math.round(2 * (rL + rW));
                                  return (
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-zinc-400 font-bold">Calculated Surface Area:</span>
                                        <span className="text-blue-400 font-extrabold text-xs">{totalArea.toLocaleString()} sq ft</span>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-zinc-400">Walls: <strong className="text-zinc-200">{wArea} sqft</strong></span>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-zinc-400">Ceiling: <strong className="text-zinc-200">{cArea} sqft</strong></span>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-zinc-400">Perimeter: <strong className="text-zinc-200">{perimeter} linear ft</strong></span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Direct area checklist checkboxes inside expanded room replaced with expandable table */}
                                {(() => {
                                  const ratesObj = proposalSettings?.rates || {
                                    wallsSpeed: 150, wallsCoverage: 350, wallsMaterialCost: 45,
                                    ceilingsSpeed: 140, ceilingsCoverage: 350, ceilingsMaterialCost: 40,
                                    baseboardsSpeed: 40, baseboardsCoverage: 200, baseboardsMaterialCost: 25,
                                    windowsHoursPerCoat: 0.75, windowsMaterialCostPerCoat: 7.00,
                                    doorsHoursPerCoat: 0.8, doorsMaterialCostPerCoat: 9.00,
                                    doorFramesHoursPerCoat: 0.5, doorFramesMaterialCostPerCoat: 5.00,
                                    sidingSpeed: 180, sidingCoverage: 350, sidingMaterialCost: 55,
                                    brickSpeed: 120, brickCoverage: 250, brickMaterialCost: 65,
                                    porchFloorSpeed: 150, porchFloorCoverage: 350, porchFloorMaterialCost: 50,
                                    soffitsSpeed: 50, soffitsCoverage: 200, soffitsMaterialCost: 40,
                                    guttersSpeed: 60, guttersCoverage: 250, guttersMaterialCost: 40,
                                    fasciaSpeed: 60, fasciaCoverage: 250, fasciaMaterialCost: 40,
                                    trimsSpeed: 60, trimsCoverage: 250, trimsMaterialCost: 40,
                                    garageHoursPerCoat: 0.75, garageMaterialCostPerCoat: 7.50,
                                    extDoorsHoursPerCoat: 0.75, extDoorsMaterialCostPerCoat: 7.50,
                                    windowsFixedHoursPerCoat: 0.50, windowsFixedMaterialCostPerCoat: 6.00,
                                    railingsSpeed: 40, railingsCoverage: 200, railingsMaterialCost: 35,
                                    shuttersHoursPerCoat: 0.50, shuttersMaterialCostPerCoat: 5.00,
                                    washingSpeed: 200, washingMaterialCostPerSqft: 0.08,
                                    strippingSpeed: 100, strippingMaterialCostPerSqft: 0.175,
                                    revivingSpeed: 150, revivingMaterialCostPerSqft: 0.10,
                                    sandingSpeed: 80, sandingMaterialCostFlat: 30,
                                    stainingSpeed: 80, stainingCoverage: 250, stainingMaterialCost: 60,
                                  };

                                  const rL = Number(room.length) || 12;
                                  const rW = Number(room.width) || 12;
                                  const rH = Number(room.height) || 9;
                                  const wArea = 2 * rH * (rL + rW);
                                  const cArea = rL * rW;
                                  const perimeter = 2 * (rL + rW);
                                  const category = room.category || 'interior';

                                  interface ItemRow {
                                    key: string;
                                    label: string;
                                    isCustom: boolean;
                                    type: 'surface' | 'task';
                                    checked: boolean;
                                    isOption: boolean;
                                    coats: number;
                                    qty: number | 'auto';
                                    hasQty: boolean;
                                    hours: number;
                                    materialCost: number;
                                    laborCost: number;
                                    totalCost: number;
                                    formulaLabor: string;
                                    formulaMaterial: string;
                                    taskObj?: any;
                                  }

                                  const items: ItemRow[] = [];

                                  let baseList: Array<{ label: string; key: string; hasQty: boolean; defaultQty: any; defaultCoats: number }> = [];

                                  if (category === 'exterior') {
                                    baseList = [
                                      { label: 'Siding Slabs', key: 'ext-siding', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Brick Stain', key: 'ext-brick-stain', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Porch Floor', key: 'ext-porch-floor', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Soffits', key: 'ext-soffits', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Gutters', key: 'ext-gutters', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Fascia Boards', key: 'ext-fascia', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Trims', key: 'ext-trims', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Garage Doors', key: 'ext-garage-door', hasQty: true, defaultQty: 1, defaultCoats: 2 },
                                      { label: 'Entry Doors', key: 'ext-doors', hasQty: true, defaultQty: 1, defaultCoats: 2 },
                                      { label: 'Windows Fixed', key: 'ext-windows-fixed', hasQty: true, defaultQty: 2, defaultCoats: 2 },
                                      { label: 'Railings', key: 'ext-railings', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Shutters Set', key: 'ext-shutters', hasQty: true, defaultQty: 2, defaultCoats: 2 },
                                    ];
                                  } else if (category === 'deck') {
                                    baseList = [
                                      { label: 'Pressure Washing', key: 'washing', hasQty: false, defaultQty: 'auto', defaultCoats: 1 },
                                      { label: 'Chemical Stripping', key: 'stripping', hasQty: false, defaultQty: 'auto', defaultCoats: 1 },
                                      { label: 'Reviver Agent', key: 'reviving', hasQty: false, defaultQty: 'auto', defaultCoats: 1 },
                                      { label: 'Orbital Sanding', key: 'sanding', hasQty: false, defaultQty: 'auto', defaultCoats: 1 },
                                      { label: 'Premium Stain', key: 'staining', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                    ];
                                  } else {
                                    baseList = [
                                      { label: 'Walls Siding', key: 'walls', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Ceilings Flat', key: 'ceilings', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Baseboards Trim', key: 'baseboards', hasQty: false, defaultQty: 'auto', defaultCoats: 2 },
                                      { label: 'Windows', key: 'windows', hasQty: true, defaultQty: 2, defaultCoats: 2 },
                                      { label: 'Doors', key: 'doors', hasQty: true, defaultQty: 2, defaultCoats: 2 },
                                      { label: 'Frames', key: 'doorFrames', hasQty: true, defaultQty: 2, defaultCoats: 2 },
                                    ];
                                  }

                                  baseList.forEach((sub) => {
                                    const areaData = (room as any)[sub.key] || { checked: (category === 'interior' && ['walls','ceilings','baseboards'].includes(sub.key)), qty: sub.defaultQty, coats: sub.defaultCoats, isOption: false };
                                    const checked = areaData.checked !== false;
                                    const coats = typeof areaData.coats === 'number' ? areaData.coats : sub.defaultCoats;
                                    const qty = areaData.qty !== undefined ? areaData.qty : sub.defaultQty;
                                    const isOption = !!areaData.isOption;

                                    let h = 0;
                                    let m = 0;
                                    let fLabor = '';
                                    let fMat = '';

                                    if (sub.key === 'walls') {
                                      h = (wArea / ratesObj.wallsSpeed) * coats;
                                      m = (wArea / ratesObj.wallsCoverage) * coats * ratesObj.wallsMaterialCost;
                                      fLabor = `${wArea} sqft ÷ ${ratesObj.wallsSpeed} sqft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${wArea} sqft ÷ ${ratesObj.wallsCoverage} sqft/gal × ${coats} coat(s) × $${ratesObj.wallsMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ceilings') {
                                      h = (cArea / ratesObj.ceilingsSpeed) * coats;
                                      m = (cArea / ratesObj.ceilingsCoverage) * coats * ratesObj.ceilingsMaterialCost;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.ceilingsSpeed} sqft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${cArea} sqft ÷ ${ratesObj.ceilingsCoverage} sqft/gal × ${coats} coat(s) × $${ratesObj.ceilingsMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'baseboards') {
                                      h = (perimeter / ratesObj.baseboardsSpeed) * coats;
                                      m = (perimeter / ratesObj.baseboardsCoverage) * coats * ratesObj.baseboardsMaterialCost;
                                      fLabor = `${perimeter} lin ft ÷ ${ratesObj.baseboardsSpeed} ft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${perimeter} lin ft ÷ ${ratesObj.baseboardsCoverage} ft/gal × ${coats} coat(s) × $${ratesObj.baseboardsMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'windows') {
                                      const q = Number(qty) || 0;
                                      h = q * ratesObj.windowsHoursPerCoat * coats;
                                      m = q * ratesObj.windowsMaterialCostPerCoat * coats;
                                      fLabor = `${q} window(s) × ${ratesObj.windowsHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} window(s) × $${ratesObj.windowsMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'doors') {
                                      const q = Number(qty) || 0;
                                      h = q * ratesObj.doorsHoursPerCoat * coats;
                                      m = q * ratesObj.doorsMaterialCostPerCoat * coats;
                                      fLabor = `${q} door(s) × ${ratesObj.doorsHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} door(s) × $${ratesObj.doorsMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'doorFrames') {
                                      const q = Number(qty) || 0;
                                      h = q * ratesObj.doorFramesHoursPerCoat * coats;
                                      m = q * ratesObj.doorFramesMaterialCostPerCoat * coats;
                                      fLabor = `${q} frame(s) × ${ratesObj.doorFramesHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} frame(s) × $${ratesObj.doorFramesMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-siding') {
                                      h = (wArea / ratesObj.sidingSpeed) * coats;
                                      m = (wArea / ratesObj.sidingCoverage) * coats * ratesObj.sidingMaterialCost;
                                      fLabor = `${wArea} sqft ÷ ${ratesObj.sidingSpeed} sqft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${wArea} sqft ÷ ${ratesObj.sidingCoverage} sqft/gal × ${coats} coat(s) × $${ratesObj.sidingMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-brick-stain') {
                                      h = (wArea / ratesObj.brickSpeed) * coats;
                                      m = (wArea / ratesObj.brickCoverage) * coats * ratesObj.brickMaterialCost;
                                      fLabor = `${wArea} sqft ÷ ${ratesObj.brickSpeed} sqft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${wArea} sqft ÷ ${ratesObj.brickCoverage} sqft/gal × ${coats} coat(s) × $${ratesObj.brickMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-porch-floor') {
                                      h = (cArea / ratesObj.porchFloorSpeed) * coats;
                                      m = (cArea / ratesObj.porchFloorCoverage) * coats * ratesObj.porchFloorMaterialCost;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.porchFloorSpeed} sqft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${cArea} sqft ÷ ${ratesObj.porchFloorCoverage} sqft/gal × ${coats} coat(s) × $${ratesObj.porchFloorMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-soffits') {
                                      h = (perimeter / ratesObj.soffitsSpeed) * coats;
                                      m = (perimeter / ratesObj.soffitsCoverage) * coats * ratesObj.soffitsMaterialCost;
                                      fLabor = `${perimeter} lin ft ÷ ${ratesObj.soffitsSpeed} ft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${perimeter} lin ft ÷ ${ratesObj.soffitsCoverage} ft/gal × ${coats} coat(s) × $${ratesObj.soffitsMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-gutters') {
                                      h = (perimeter / ratesObj.guttersSpeed) * coats;
                                      m = (perimeter / ratesObj.guttersCoverage) * coats * ratesObj.guttersMaterialCost;
                                      fLabor = `${perimeter} lin ft ÷ ${ratesObj.guttersSpeed} ft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${perimeter} lin ft ÷ ${ratesObj.guttersCoverage} ft/gal × ${coats} coat(s) × $${ratesObj.guttersMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-fascia') {
                                      h = (perimeter / ratesObj.fasciaSpeed) * coats;
                                      m = (perimeter / ratesObj.fasciaCoverage) * coats * ratesObj.fasciaMaterialCost;
                                      fLabor = `${perimeter} lin ft ÷ ${ratesObj.fasciaSpeed} ft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${perimeter} lin ft ÷ ${ratesObj.fasciaCoverage} ft/gal × ${coats} coat(s) × $${ratesObj.fasciaMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-trims') {
                                      h = (perimeter / ratesObj.trimsSpeed) * coats;
                                      m = (perimeter / ratesObj.trimsCoverage) * coats * ratesObj.trimsMaterialCost;
                                      fLabor = `${perimeter} lin ft ÷ ${ratesObj.trimsSpeed} ft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${perimeter} lin ft ÷ ${ratesObj.trimsCoverage} ft/gal × ${coats} coat(s) × $${ratesObj.trimsMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-garage-door') {
                                      const q = Number(qty) || 1;
                                      h = q * ratesObj.garageHoursPerCoat * coats;
                                      m = q * ratesObj.garageMaterialCostPerCoat * coats;
                                      fLabor = `${q} unit(s) × ${ratesObj.garageHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} unit(s) × $${ratesObj.garageMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-doors') {
                                      const q = Number(qty) || 1;
                                      h = q * ratesObj.extDoorsHoursPerCoat * coats;
                                      m = q * ratesObj.extDoorsMaterialCostPerCoat * coats;
                                      fLabor = `${q} door(s) × ${ratesObj.extDoorsHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} door(s) × $${ratesObj.extDoorsMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-windows-fixed') {
                                      const q = Number(qty) || 2;
                                      h = q * ratesObj.windowsFixedHoursPerCoat * coats;
                                      m = q * ratesObj.windowsFixedMaterialCostPerCoat * coats;
                                      fLabor = `${q} window(s) × ${ratesObj.windowsFixedHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} window(s) × $${ratesObj.windowsFixedMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-railings') {
                                      h = (perimeter / ratesObj.railingsSpeed) * coats;
                                      m = (perimeter / ratesObj.railingsCoverage) * coats * ratesObj.railingsMaterialCost;
                                      fLabor = `${perimeter} lin ft ÷ ${ratesObj.railingsSpeed} ft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${perimeter} lin ft ÷ ${ratesObj.railingsCoverage} ft/gal × ${coats} coat(s) × $${ratesObj.railingsMaterialCost}/gal = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'ext-shutters') {
                                      const q = Number(qty) || 2;
                                      h = q * ratesObj.shuttersHoursPerCoat * coats;
                                      m = q * ratesObj.shuttersMaterialCostPerCoat * coats;
                                      fLabor = `${q} shutter set(s) × ${ratesObj.shuttersHoursPerCoat} hrs/coat × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${q} shutter set(s) × $${ratesObj.shuttersMaterialCostPerCoat}/coat × ${coats} coat(s) = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'washing') {
                                      h = cArea / ratesObj.washingSpeed;
                                      m = cArea * ratesObj.washingMaterialCostPerSqft;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.washingSpeed} sqft/hr = ${h.toFixed(1)} hrs`;
                                      fMat = `${cArea} sqft × $${ratesObj.washingMaterialCostPerSqft}/sqft = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'stripping') {
                                      h = cArea / ratesObj.strippingSpeed;
                                      m = cArea * ratesObj.strippingMaterialCostPerSqft;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.strippingSpeed} sqft/hr = ${h.toFixed(1)} hrs`;
                                      fMat = `${cArea} sqft × $${ratesObj.strippingMaterialCostPerSqft}/sqft = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'reviving') {
                                      h = cArea / ratesObj.revivingSpeed;
                                      m = cArea * ratesObj.revivingMaterialCostPerSqft;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.revivingSpeed} sqft/hr = ${h.toFixed(1)} hrs`;
                                      fMat = `${cArea} sqft × $${ratesObj.revivingMaterialCostPerSqft}/sqft = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'sanding') {
                                      h = cArea / ratesObj.sandingSpeed;
                                      m = ratesObj.sandingMaterialCostFlat;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.sandingSpeed} sqft/hr = ${h.toFixed(1)} hrs`;
                                      fMat = `Flat sanding supplies allowance = $${m.toFixed(2)}`;
                                    } else if (sub.key === 'staining') {
                                      h = (cArea / ratesObj.stainingSpeed) * coats;
                                      m = (cArea / ratesObj.stainingCoverage) * coats * ratesObj.stainingMaterialCost;
                                      fLabor = `${cArea} sqft ÷ ${ratesObj.stainingSpeed} sqft/hr × ${coats} coat(s) = ${h.toFixed(1)} hrs`;
                                      fMat = `${cArea} sqft ÷ ${ratesObj.stainingCoverage} sqft/gal × ${coats} coat(s) × $${ratesObj.stainingMaterialCost}/gal = $${m.toFixed(2)}`;
                                    }

                                    const lCost = h * hourlyLaborRate;
                                    const tot = lCost + m;

                                    items.push({
                                      key: sub.key,
                                      label: sub.label,
                                      isCustom: false,
                                      type: 'surface',
                                      checked,
                                      isOption,
                                      coats,
                                      qty,
                                      hasQty: sub.hasQty,
                                      hours: h,
                                      materialCost: m,
                                      laborCost: lCost,
                                      totalCost: tot,
                                      formulaLabor: fLabor,
                                      formulaMaterial: fMat
                                    });
                                  });

                                  // Custom areas
                                  const customAreas = (room as any).customAreas || [];
                                  customAreas.forEach((cItem: any) => {
                                    const checked = cItem.checked !== false;
                                    const coats = Number(cItem.coats) || 2;
                                    const qty = cItem.qty === 'auto' ? 1 : (Number(cItem.qty) || 1);
                                    const isOption = !!cItem.isOption;

                                    let h = 0;
                                    let m = 0;
                                    const speed = cItem.speed || 150;
                                    const coverage = cItem.coverage || 350;
                                    const matCost = cItem.materialCost || 25;

                                    if (cItem.calcType === 'wall') {
                                      h = (wArea / speed) * coats;
                                      m = (wArea / coverage) * coats * matCost;
                                    } else if (cItem.calcType === 'ceiling') {
                                      h = (cArea / speed) * coats;
                                      m = (cArea / coverage) * coats * matCost;
                                    } else if (cItem.calcType === 'perimeter') {
                                      h = (perimeter / speed) * coats;
                                      m = (perimeter / coverage) * coats * matCost;
                                    } else {
                                      h = qty * 0.75 * coats;
                                      m = qty * 7.00 * coats;
                                    }

                                    const lCost = h * hourlyLaborRate;
                                    const tot = lCost + m;

                                    items.push({
                                      key: cItem.key,
                                      label: cItem.label || 'Custom Layer',
                                      isCustom: true,
                                      type: 'surface',
                                      checked,
                                      isOption,
                                      coats,
                                      qty,
                                      hasQty: cItem.calcType === 'item',
                                      hours: h,
                                      materialCost: m,
                                      laborCost: lCost,
                                      totalCost: tot,
                                      formulaLabor: `Custom surface calc: ${h.toFixed(1)} hrs`,
                                      formulaMaterial: `Custom material rate: $${m.toFixed(2)}`
                                    });
                                  });

                                  // Tasks
                                  const surfaceTasks = getRoomTasks(room);
                                  surfaceTasks.forEach((task) => {
                                    const checked = !task.completed;
                                    let tHours = 0.75;
                                    let tMat = 12.00;

                                    const textLower = (task.text || '').toLowerCase();
                                    if (textLower.includes('wash') || textLower.includes('clean')) {
                                      tHours = 0.5; tMat = 8.00;
                                    } else if (textLower.includes('patch') || textLower.includes('repair') || textLower.includes('drywall')) {
                                      tHours = 1.0; tMat = 15.00;
                                    } else if (textLower.includes('prime') || textLower.includes('stain') || textLower.includes('strip')) {
                                      tHours = 1.0; tMat = 20.00;
                                    } else if (textLower.includes('sand')) {
                                      tHours = 0.5; tMat = 10.00;
                                    }

                                    const lCost = tHours * hourlyLaborRate;
                                    const tot = lCost + tMat;

                                    items.push({
                                      key: `task-${task.id}`,
                                      label: task.text,
                                      isCustom: false,
                                      type: 'task',
                                      checked,
                                      isOption: !!task.isOption,
                                      coats: 1,
                                      qty: 1,
                                      hasQty: false,
                                      hours: tHours,
                                      materialCost: tMat,
                                      laborCost: lCost,
                                      totalCost: tot,
                                      formulaLabor: `Prep Task Estimate: ${tHours.toFixed(1)} hrs @ $${hourlyLaborRate}/hr`,
                                      formulaMaterial: `Prep Materials / Consumables Allowance: $${tMat.toFixed(2)}`,
                                      taskObj: task
                                    });
                                  });

                                  const activeTotalCost = items.filter(i => i.checked && !i.isOption).reduce((sum, i) => sum + i.totalCost, 0);

                                  return (
                                    <div className="space-y-3 pt-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                                        <div className="flex items-center gap-2">
                                          <Layers className="w-4 h-4 text-blue-400" />
                                          <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                                            Configured Room Specifications & Cost Table
                                          </span>
                                          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                                            (Expand row for material & labor formulas)
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 font-mono text-[11px]">
                                          <span className="text-zinc-400">
                                            Active Total: <strong className="text-emerald-400 font-bold">${Math.round(activeTotalCost).toLocaleString()}</strong>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setAddingAreaRoomId(room.id)}
                                            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-blue-300 hover:text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                                          >
                                            <Plus className="w-3 h-3" />
                                            <span>+ Custom Layer</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Expandable Table container */}
                                      <div className="border border-neutral-800/90 rounded-2xl overflow-hidden bg-neutral-950/80 shadow-inner">
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left font-mono text-xs border-collapse">
                                            <thead>
                                              <tr className="bg-neutral-900/90 border-b border-neutral-800 text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                                                <th className="py-2.5 px-3 min-w-[170px]">Task / Surface Item</th>
                                                <th className="py-2.5 px-3 text-center min-w-[100px]">Coats / Qty</th>
                                                <th className="py-2.5 px-3 text-right min-w-[110px]">Labour (Hrs / $)</th>
                                                <th className="py-2.5 px-3 text-right min-w-[90px]">Materials ($)</th>
                                                <th className="py-2.5 px-3 text-right min-w-[120px]">Total & Impact</th>
                                                <th className="py-2.5 px-3 text-center min-w-[90px]">Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-850/80">
                                              {/* Surface Items Section */}
                                              <tr className="bg-neutral-900/40 font-bold text-[10px] text-blue-300 uppercase tracking-wider">
                                                <td colSpan={6} className="py-1.5 px-3 bg-blue-950/20 border-b border-neutral-850">
                                                  Surfaces & Coatings ({items.filter(i => i.type === 'surface').length})
                                                </td>
                                              </tr>

                                              {items.filter(i => i.type === 'surface').map(item => {
                                                const rowKey = `${room.id}::${item.key}`;
                                                const isRowExpanded = !!expandedRowKeys[rowKey];
                                                const impactPct = activeTotalCost > 0 && item.checked && !item.isOption
                                                  ? ((item.totalCost / activeTotalCost) * 100).toFixed(1)
                                                  : '0.0';

                                                const toggleChecked = () => {
                                                  setRooms(prev => prev.map(r => {
                                                    if (r.id === room.id) {
                                                      if (item.isCustom) {
                                                        const customAreas = (r as any).customAreas || [];
                                                        return {
                                                          ...r,
                                                          customAreas: customAreas.map((c: any) => c.key === item.key ? { ...c, checked: !item.checked } : c)
                                                        };
                                                      }
                                                      const subObj = (r as any)[item.key] || { checked: true, qty: item.qty, coats: item.coats, isOption: false };
                                                      return {
                                                        ...r,
                                                        [item.key]: { ...subObj, checked: !item.checked }
                                                      };
                                                    }
                                                    return r;
                                                  }));
                                                };

                                                const toggleOption = (e: React.MouseEvent) => {
                                                  e.stopPropagation();
                                                  setRooms(prev => prev.map(r => {
                                                    if (r.id === room.id) {
                                                      if (item.isCustom) {
                                                        const customAreas = (r as any).customAreas || [];
                                                        return {
                                                          ...r,
                                                          customAreas: customAreas.map((c: any) => c.key === item.key ? { ...c, isOption: !item.isOption } : c)
                                                        };
                                                      }
                                                      const subObj = (r as any)[item.key] || { checked: true, qty: item.qty, coats: item.coats, isOption: false };
                                                      return {
                                                        ...r,
                                                        [item.key]: { ...subObj, isOption: !item.isOption }
                                                      };
                                                    }
                                                    return r;
                                                  }));
                                                };

                                                const updateCoats = (newCoats: number) => {
                                                  setRooms(prev => prev.map(r => {
                                                    if (r.id === room.id) {
                                                      if (item.isCustom) {
                                                        const customAreas = (r as any).customAreas || [];
                                                        return {
                                                          ...r,
                                                          customAreas: customAreas.map((c: any) => c.key === item.key ? { ...c, coats: newCoats } : c)
                                                        };
                                                      }
                                                      const subObj = (r as any)[item.key] || { checked: true, qty: item.qty, coats: item.coats, isOption: false };
                                                      return {
                                                        ...r,
                                                        [item.key]: { ...subObj, coats: newCoats }
                                                      };
                                                    }
                                                    return r;
                                                  }));
                                                };

                                                const updateQty = (newQty: number) => {
                                                  setRooms(prev => prev.map(r => {
                                                    if (r.id === room.id) {
                                                      if (item.isCustom) {
                                                        const customAreas = (r as any).customAreas || [];
                                                        return {
                                                          ...r,
                                                          customAreas: customAreas.map((c: any) => c.key === item.key ? { ...c, qty: newQty } : c)
                                                        };
                                                      }
                                                      const subObj = (r as any)[item.key] || { checked: true, qty: item.qty, coats: item.coats, isOption: false };
                                                      return {
                                                        ...r,
                                                        [item.key]: { ...subObj, qty: newQty }
                                                      };
                                                    }
                                                    return r;
                                                  }));
                                                };

                                                return (
                                                  <React.Fragment key={item.key}>
                                                    <tr className={`transition hover:bg-neutral-900/60 ${
                                                      item.isOption
                                                        ? 'bg-amber-950/15 text-amber-200'
                                                        : item.checked
                                                          ? 'text-zinc-100'
                                                          : 'text-zinc-500 opacity-60'
                                                    }`}>
                                                      <td className="py-2 px-3">
                                                        <div className="flex items-center gap-2">
                                                          <input
                                                            type="checkbox"
                                                            checked={item.checked}
                                                            onChange={toggleChecked}
                                                            className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-950 text-blue-500 focus:ring-0 cursor-pointer shrink-0"
                                                          />
                                                          <span className="font-bold">{item.label}</span>
                                                          {item.isOption && (
                                                            <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-500/50 px-1.5 py-0.2 rounded uppercase font-extrabold shrink-0">
                                                              Option
                                                            </span>
                                                          )}
                                                        </div>
                                                      </td>

                                                      <td className="py-2 px-3 text-center">
                                                        {item.checked ? (
                                                          <div className="inline-flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5">
                                                            <button
                                                              type="button"
                                                              onClick={() => updateCoats(Math.max(1, item.coats - 1))}
                                                              className="w-4 h-4 hover:bg-neutral-800 text-zinc-300 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                                                            >
                                                              -
                                                            </button>
                                                            <span className="w-5 text-center font-bold text-white text-[11px]">{item.coats}c</span>
                                                            <button
                                                              type="button"
                                                              onClick={() => updateCoats(Math.min(4, item.coats + 1))}
                                                              className="w-4 h-4 hover:bg-neutral-800 text-zinc-300 rounded flex items-center justify-center cursor-pointer text-xs font-bold"
                                                            >
                                                              +
                                                            </button>
                                                            {item.hasQty && (
                                                              <div className="pl-1 border-l border-neutral-800 flex items-center gap-0.5 ml-1">
                                                                <button
                                                                  type="button"
                                                                  onClick={() => updateQty(Math.max(0, (typeof item.qty === 'number' ? item.qty : 2) - 1))}
                                                                  className="w-3.5 h-3.5 hover:bg-neutral-800 text-zinc-300 rounded flex items-center justify-center cursor-pointer text-[10px]"
                                                                >
                                                                  -
                                                                </button>
                                                                <span className="text-[10px] text-zinc-300">{item.qty === 'auto' ? 2 : item.qty}u</span>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => updateQty((typeof item.qty === 'number' ? item.qty : 2) + 1)}
                                                                  className="w-3.5 h-3.5 hover:bg-neutral-800 text-zinc-300 rounded flex items-center justify-center cursor-pointer text-[10px]"
                                                                >
                                                                  +
                                                                </button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        ) : (
                                                          <span className="text-zinc-600 italic text-[11px]">Unselected</span>
                                                        )}
                                                      </td>

                                                      <td className="py-2 px-3 text-right">
                                                        {item.checked ? (
                                                          <div>
                                                            <span className="font-bold text-zinc-200">${item.laborCost.toFixed(0)}</span>
                                                            <span className="text-[10px] text-zinc-400 block font-normal">{item.hours.toFixed(1)} hrs</span>
                                                          </div>
                                                        ) : (
                                                          <span className="text-zinc-600">—</span>
                                                        )}
                                                      </td>

                                                      <td className="py-2 px-3 text-right">
                                                        {item.checked ? (
                                                          <span className="font-bold text-amber-300">${item.materialCost.toFixed(0)}</span>
                                                        ) : (
                                                          <span className="text-zinc-600">—</span>
                                                        )}
                                                      </td>

                                                      <td className="py-2 px-3 text-right">
                                                        {item.checked ? (
                                                          <div className="flex items-center justify-end gap-1.5">
                                                            <span className="font-bold text-emerald-400 text-xs">${item.totalCost.toFixed(0)}</span>
                                                            {!item.isOption && (
                                                              <span className="text-[9px] bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                                                {impactPct}%
                                                              </span>
                                                            )}
                                                          </div>
                                                        ) : (
                                                          <span className="text-zinc-600">—</span>
                                                        )}
                                                      </td>

                                                      <td className="py-2 px-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() => toggleRowExpand(rowKey)}
                                                            className="p-1 hover:bg-neutral-800 rounded transition cursor-pointer text-zinc-400 hover:text-white"
                                                            title="Toggle mathematical cost calculation breakdown"
                                                          >
                                                            {isRowExpanded ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                          </button>

                                                          <button
                                                            type="button"
                                                            onClick={toggleOption}
                                                            className="p-1 hover:bg-neutral-800 rounded transition cursor-pointer"
                                                            title={item.isOption ? "Active Option. Click to make standard." : "Mark as Option"}
                                                          >
                                                            <Diamond className={`w-3.5 h-3.5 ${item.isOption ? 'fill-amber-400 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`} />
                                                          </button>

                                                          {item.isCustom && (
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setRooms(prev => prev.map(r => {
                                                                  if (r.id === room.id) {
                                                                    const customAreas = (r as any).customAreas || [];
                                                                    return {
                                                                      ...r,
                                                                      customAreas: customAreas.filter((c: any) => c.key !== item.key)
                                                                    };
                                                                  }
                                                                  return r;
                                                                }));
                                                              }}
                                                              className="p-1 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                                                              title="Delete custom surface layer"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>

                                                    {/* EXPANDABLE DETAIL DRAWER ROW */}
                                                    {isRowExpanded && (
                                                      <tr className="bg-neutral-900/90 text-[11px] border-b border-neutral-800">
                                                        <td colSpan={6} className="p-3 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950">
                                                          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-2">
                                                            <div className="flex items-center justify-between text-blue-300 font-bold border-b border-neutral-800 pb-1 text-[10px] uppercase">
                                                              <span>📊 Cost Impact & Mathematical Calculation Breakdown</span>
                                                              <span>{item.label}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-300">
                                                              <div className="space-y-1">
                                                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Labour Formula:</span>
                                                                <p className="text-zinc-300 bg-neutral-900 p-2 rounded border border-neutral-800 font-mono text-[10px]">
                                                                  {item.formulaLabor}
                                                                </p>
                                                                <p className="text-[10px] text-zinc-400">
                                                                  Labour Rate: <strong>${hourlyLaborRate.toFixed(2)}/hr</strong> • Labour Cost: <strong className="text-blue-300">${item.laborCost.toFixed(2)}</strong>
                                                                </p>
                                                              </div>
                                                              <div className="space-y-1">
                                                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Material Formula:</span>
                                                                <p className="text-zinc-300 bg-neutral-900 p-2 rounded border border-neutral-800 font-mono text-[10px]">
                                                                  {item.formulaMaterial}
                                                                </p>
                                                                <p className="text-[10px] text-zinc-400">
                                                                  Material Cost: <strong className="text-amber-300">${item.materialCost.toFixed(2)}</strong>
                                                                </p>
                                                              </div>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-1 border-t border-neutral-850 text-[11px]">
                                                              <span className="text-zinc-400">Total Price Impact on Room: <strong className="text-emerald-400">${item.totalCost.toFixed(2)}</strong></span>
                                                              {!item.isOption && activeTotalCost > 0 && (
                                                                <span className="text-zinc-400">Contributes <strong className="text-blue-300">{impactPct}%</strong> to room total</span>
                                                              )}
                                                            </div>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </React.Fragment>
                                                );
                                              })}

                                              {/* Tasks Section Header */}
                                              <tr className="bg-neutral-900/40 font-bold text-[10px] text-indigo-300 uppercase tracking-wider border-t border-neutral-800">
                                                <td colSpan={6} className="py-1.5 px-3 bg-indigo-950/20 border-b border-neutral-850 flex items-center justify-between">
                                                  <span>Preparation & Surface Tasks ({items.filter(i => i.type === 'task').length})</span>
                                                  {room.category === 'deck' && items.filter(i => i.type === 'task').length === 0 && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, surfaceTasks: DEFAULT_DECK_TASKS } : r));
                                                      }}
                                                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                                                    >
                                                      + Load Default Deck Tasks
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>

                                              {items.filter(i => i.type === 'task').map(item => {
                                                const rowKey = `${room.id}::${item.key}`;
                                                const isRowExpanded = !!expandedRowKeys[rowKey];
                                                const impactPct = activeTotalCost > 0 && item.checked && !item.isOption
                                                  ? ((item.totalCost / activeTotalCost) * 100).toFixed(1)
                                                  : '0.0';

                                                const taskObj = item.taskObj;

                                                return (
                                                  <React.Fragment key={item.key}>
                                                    <tr className={`transition hover:bg-neutral-900/60 ${
                                                      item.isOption
                                                        ? 'bg-amber-950/15 text-amber-200'
                                                        : taskObj?.completed
                                                          ? 'text-zinc-500 line-through opacity-60'
                                                          : 'text-zinc-100'
                                                    }`}>
                                                      <td className="py-2 px-3">
                                                        <div className="flex items-center gap-2">
                                                          <input
                                                            type="checkbox"
                                                            checked={taskObj?.completed || false}
                                                            onChange={() => handleToggleRoomTask(room.id, taskObj.id)}
                                                            className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-950 text-blue-500 focus:ring-0 cursor-pointer shrink-0"
                                                          />
                                                          <span className={`font-bold ${taskObj?.completed ? 'line-through' : ''}`}>{item.label}</span>
                                                          {taskObj?.surfaceCategory && (
                                                            <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-zinc-400 px-1.5 py-0.2 rounded uppercase shrink-0">
                                                              {taskObj.surfaceCategory}
                                                            </span>
                                                          )}
                                                          {item.isOption && (
                                                            <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-500/50 px-1.5 py-0.2 rounded uppercase font-extrabold shrink-0">
                                                              Option
                                                            </span>
                                                          )}
                                                        </div>
                                                      </td>

                                                      <td className="py-2 px-3 text-center text-zinc-400 text-[11px]">
                                                        Task Item
                                                      </td>

                                                      <td className="py-2 px-3 text-right">
                                                        <div>
                                                          <span className="font-bold text-zinc-200">${item.laborCost.toFixed(0)}</span>
                                                          <span className="text-[10px] text-zinc-400 block font-normal">{item.hours.toFixed(1)} hrs</span>
                                                        </div>
                                                      </td>

                                                      <td className="py-2 px-3 text-right">
                                                        <span className="font-bold text-amber-300">${item.materialCost.toFixed(0)}</span>
                                                      </td>

                                                      <td className="py-2 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                          <span className="font-bold text-emerald-400 text-xs">${item.totalCost.toFixed(0)}</span>
                                                          {!item.isOption && (
                                                            <span className="text-[9px] bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                                              {impactPct}%
                                                            </span>
                                                          )}
                                                        </div>
                                                      </td>

                                                      <td className="py-2 px-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() => toggleRowExpand(rowKey)}
                                                            className="p-1 hover:bg-neutral-800 rounded transition cursor-pointer text-zinc-400 hover:text-white"
                                                            title="Toggle mathematical cost calculation breakdown"
                                                          >
                                                            {isRowExpanded ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                          </button>

                                                          <button
                                                            type="button"
                                                            onClick={() => handleToggleRoomTaskOption(room.id, taskObj.id)}
                                                            className="p-1 hover:bg-neutral-800 rounded transition cursor-pointer"
                                                            title={item.isOption ? "Active Option. Click to make standard task." : "Mark task as Option"}
                                                          >
                                                            <Diamond className={`w-3.5 h-3.5 ${item.isOption ? 'fill-amber-400 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`} />
                                                          </button>

                                                          <button
                                                            type="button"
                                                            onClick={() => handleDeleteRoomTask(room.id, taskObj.id)}
                                                            className="p-1 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                                                            title="Delete task"
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      </td>
                                                    </tr>

                                                    {/* EXPANDABLE TASK DETAIL DRAWER ROW */}
                                                    {isRowExpanded && (
                                                      <tr className="bg-neutral-900/90 text-[11px] border-b border-neutral-800">
                                                        <td colSpan={6} className="p-3 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950">
                                                          <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-2">
                                                            <div className="flex items-center justify-between text-indigo-300 font-bold border-b border-neutral-800 pb-1 text-[10px] uppercase">
                                                              <span>📋 Task Cost Breakdown</span>
                                                              <span>{item.label}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-300">
                                                              <div>
                                                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Labour Allocation:</span>
                                                                <p className="text-zinc-300 bg-neutral-900 p-2 rounded border border-neutral-800 font-mono text-[10px]">
                                                                  {item.formulaLabor}
                                                                </p>
                                                              </div>
                                                              <div>
                                                                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Consumables / Materials:</span>
                                                                <p className="text-zinc-300 bg-neutral-900 p-2 rounded border border-neutral-800 font-mono text-[10px]">
                                                                  {item.formulaMaterial}
                                                                </p>
                                                              </div>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-1 border-t border-neutral-850 text-[11px]">
                                                              <span className="text-zinc-400">Total Task Price Impact: <strong className="text-emerald-400">${item.totalCost.toFixed(2)}</strong></span>
                                                              {!item.isOption && activeTotalCost > 0 && (
                                                                <span className="text-zinc-400">Contributes <strong className="text-blue-300">{impactPct}%</strong> to room total</span>
                                                              )}
                                                            </div>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Add Task Input Form Bar */}
                                        <div className="p-3 bg-neutral-900/80 border-t border-neutral-800 flex flex-wrap items-center gap-2">
                                          <input
                                            type="text"
                                            placeholder="Add task to this room (e.g. Patch drywall, Power wash, Clean trim...)"
                                            id={`new-task-input-${room.id}`}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const target = e.currentTarget;
                                                if (target.value.trim()) {
                                                  handleAddRoomTask(room.id, target.value.trim(), 'General', roomTaskIsOption[room.id] || false);
                                                  target.value = '';
                                                }
                                              }
                                            }}
                                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono min-w-[180px]"
                                          />

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRoomTaskIsOption(prev => ({ ...prev, [room.id]: !prev[room.id] }));
                                            }}
                                            className={`px-2.5 py-1.5 text-xs font-bold font-mono rounded-xl border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                                              roomTaskIsOption[room.id]
                                                ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                                : 'bg-neutral-950 border-neutral-800 text-zinc-400 hover:text-white'
                                            }`}
                                            title={roomTaskIsOption[room.id] ? "New task will be added as Option" : "Click to mark new task as Option"}
                                          >
                                            <Diamond className={`w-3 h-3 ${roomTaskIsOption[room.id] ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                                            <span>Option</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const inputEl = document.getElementById(`new-task-input-${room.id}`) as HTMLInputElement;
                                              if (inputEl && inputEl.value.trim()) {
                                                handleAddRoomTask(room.id, inputEl.value.trim(), 'General', roomTaskIsOption[room.id] || false);
                                                inputEl.value = '';
                                              }
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Task</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                              </div>
                            )}

                          </div>
                        );
                      };

                        return (
                          <>
                            {/* Render Collapsible Room Groups First */}
                            {groupNames.map(gName => {
                              const gRooms = catRooms.filter(r => r.groupName === gName);
                              const gTotalPrice = gRooms.reduce((sum, r) => sum + (liveSummary.roomCosts[r.id] || 0), 0);
                              const gTotalHours = gRooms.reduce((sum, r) => sum + (liveSummary.roomHours[r.id] || 0), 0);
                              const gTotalMaterials = gRooms.reduce((sum, r) => sum + (liveSummary.roomMaterials[r.id] || 0), 0);
                              const isGroupCollapsed = !!collapsedGroupNames[gName];
                              const allGroupRoomsSelected = gRooms.length > 0 && gRooms.every(r => selectedRoomIds[r.id]);

                              return (
                                <div key={gName} className="border-2 border-blue-500/50 bg-gradient-to-b from-blue-950/20 to-neutral-950/80 rounded-2xl overflow-hidden shadow-2xl space-y-2 mb-5">
                                  {/* Group Header Bar */}
                                  <div className="bg-blue-950/60 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-blue-800/60 select-none">
                                    <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                                      {selectMode && (
                                        <input
                                          type="checkbox"
                                          checked={allGroupRoomsSelected}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const next = { ...selectedRoomIds };
                                            gRooms.forEach(r => { next[r.id] = !allGroupRoomsSelected; });
                                            setSelectedRoomIds(next);
                                          }}
                                          className="w-4 h-4 rounded border-blue-600 bg-neutral-950 text-blue-500 focus:ring-0 cursor-pointer shrink-0"
                                          title="Select all rooms in this group"
                                        />
                                      )}

                                      <div 
                                        onClick={() => toggleGroupCollapse(gName)} 
                                        className="flex items-center gap-2.5 cursor-pointer group/g flex-1"
                                      >
                                        <div className="p-1.5 bg-blue-900/80 border border-blue-700/80 rounded-lg text-blue-300 group-hover/g:text-white transition">
                                          {isGroupCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                        <Folder className="w-4 h-4 text-blue-400 shrink-0 fill-blue-500/20" />
                                        <h4 className="font-bold text-sm sm:text-base text-white font-sans tracking-wide group-hover/g:text-blue-300 transition">
                                          {gName}
                                        </h4>
                                        <span className="text-[10px] text-blue-300/90 font-mono font-bold bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-700/50">
                                          {gRooms.length} room{gRooms.length > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Group Metrics Summary Badges */}
                                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                                      <div className="bg-neutral-950 border border-emerald-800/80 px-3 py-1 rounded-xl text-emerald-400 font-bold flex items-center gap-1.5 shadow-inner">
                                        <span className="text-zinc-500 text-[10px] uppercase font-sans">Total Price:</span>
                                        <span>${gTotalPrice.toLocaleString()}</span>
                                      </div>

                                      <div className="bg-neutral-950 border border-blue-800/80 px-3 py-1 rounded-xl text-blue-300 font-bold flex items-center gap-1.5 shadow-inner">
                                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-zinc-500 text-[10px] uppercase font-sans">Time:</span>
                                        <span>{gTotalHours.toFixed(1)} hrs</span>
                                      </div>

                                      <div className="bg-neutral-950 border border-amber-800/80 px-3 py-1 rounded-xl text-amber-300 font-bold flex items-center gap-1.5 shadow-inner">
                                        <span className="text-zinc-500 text-[10px] uppercase font-sans">Materials:</span>
                                        <span>${gTotalMaterials.toLocaleString()}</span>
                                      </div>

                                      {/* Group Action Buttons */}
                                      <div className="flex items-center gap-1.5 pl-2 border-l border-blue-800/60">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingGroupModalName(gName);
                                          }}
                                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md border border-blue-400/40"
                                          title="Bulk edit all rooms, coats, and tasks in this group"
                                        >
                                          <Sliders className="w-3.5 h-3.5" />
                                          <span>Batch Edit Group</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRenameGroup(gName);
                                          }}
                                          className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-zinc-300 hover:text-white rounded-lg transition cursor-pointer"
                                          title="Rename group heading"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUngroupRooms(gName);
                                          }}
                                          className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-zinc-400 hover:text-red-400 rounded-lg transition text-[11px] font-mono cursor-pointer"
                                          title="Remove group heading from these rooms"
                                        >
                                          Ungroup
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Group Rooms List */}
                                  {!isGroupCollapsed && (
                                    <div className="p-3 space-y-3">
                                      {gRooms.map(room => renderRoomCardContent(room))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Render Ungrouped Rooms */}
                            <div className="space-y-3">
                              {ungroupedRooms.map(room => renderRoomCardContent(room))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* PROPOSAL NOTES & CONTRACT TERMS */}
        <div id="section-scope" className="scroll-mt-24 bg-[#161616] border border-[#222222] rounded-2xl overflow-hidden text-left shadow-lg">
          <div className="px-5 py-4 border-b border-[#222222] flex items-center justify-between">
            <h3 className="font-mono font-bold text-xs text-white tracking-widest uppercase">
              Proposal Notes & Scope of Work
            </h3>
            <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase">
              Custom Terms & Team Logs
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusions */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Inclusions (Shows on Proposal)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(proposalSettings.scopePresets || DEFAULT_PROPOSAL_SETTINGS.scopePresets)
                    .filter(sp => sp.type === 'inclusions')
                    .map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setInclusions(preset.content);
                          triggerNotification(`Loaded ${preset.title} preset!`, 'success');
                        }}
                        className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                      >
                        {preset.title}
                      </button>
                    ))}
                </div>
              </div>
              <textarea
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                placeholder="List what is included (e.g. Premium wall preparation, double coat primer, trim paint...)"
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500/55 rounded-xl p-3.5 text-xs text-zinc-300 focus:outline-none transition leading-relaxed"
              />
            </div>

            {/* Exclusions */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Exclusions (Shows on Proposal)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(proposalSettings.scopePresets || DEFAULT_PROPOSAL_SETTINGS.scopePresets)
                    .filter(sp => sp.type === 'exclusions')
                    .map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setExclusions(preset.content);
                          triggerNotification(`Loaded ${preset.title} preset!`, 'success');
                        }}
                        className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                      >
                        {preset.title}
                      </button>
                    ))}
                </div>
              </div>
              <textarea
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                placeholder="List what is excluded (e.g. Drywall replacement, ceiling paint unless selected, exterior deck...)"
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500/55 rounded-xl p-3.5 text-xs text-zinc-300 focus:outline-none transition leading-relaxed"
              />
            </div>

            {/* Special Conditions */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  Special Conditions (Shows on Proposal)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(proposalSettings.scopePresets || DEFAULT_PROPOSAL_SETTINGS.scopePresets)
                    .filter(sp => sp.type === 'specialConditions')
                    .map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSpecialConditions(preset.content);
                          triggerNotification(`Loaded ${preset.title} preset!`, 'success');
                        }}
                        className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                      >
                        {preset.title}
                      </button>
                    ))}
                </div>
              </div>
              <textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                placeholder="List any special circumstances (e.g. Work must be done outside office hours, height restrictions...)"
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500/55 rounded-xl p-3.5 text-xs text-zinc-300 focus:outline-none transition leading-relaxed"
              />
            </div>

            {/* Team Notes (Private) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Internal Team Notes (Hidden from Client)
              </label>
              <textarea
                value={teamNotes}
                onChange={(e) => setTeamNotes(e.target.value)}
                placeholder="Private team details (e.g. Customer prefers early morning, key code is 4846, gate is locked...)"
                rows={4}
                className="w-full bg-neutral-950 border border-purple-900/30 focus:border-purple-500/55 rounded-xl p-3.5 text-xs text-zinc-300 focus:outline-none transition leading-relaxed bg-purple-950/5"
              />
            </div>

            {/* General Notes */}
            <div className="space-y-2 md:col-span-2 border-t border-neutral-800 pt-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                  General Notes (Shows on Proposal PDF)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const text = proposalSettings.interiorGeneralNotes || DEFAULT_PROPOSAL_SETTINGS.interiorGeneralNotes || 'All interior surfaces will be fully prepared prior to painting. This includes filling nail holes, minor caulking, and dust protection for furniture and flooring. Premium quality materials will be used.';
                      setGeneralNotes(text);
                      triggerNotification('Loaded Interior General Notes preset!', 'success');
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    Load Interior Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = proposalSettings.exteriorGeneralNotes || DEFAULT_PROPOSAL_SETTINGS.exteriorGeneralNotes || 'Exterior preparation includes pressure washing to remove dirt and loose paint, scraping peeling areas, priming bare wood, and caulking joints as specified. Premium weather-resistant paint will be applied.';
                      setGeneralNotes(text);
                      triggerNotification('Loaded Exterior General Notes preset!', 'success');
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    Load Exterior Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = proposalSettings.woodStainingGeneralNotes || DEFAULT_PROPOSAL_SETTINGS.woodStainingGeneralNotes || '';
                      setGeneralNotes(text);
                      triggerNotification('Loaded Wood Staining preset!', 'success');
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    Load Wood Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = proposalSettings.brickStainingGeneralNotes || DEFAULT_PROPOSAL_SETTINGS.brickStainingGeneralNotes || 'Brick surfaces will be cleaned and masonry-grade staining or breathing silicate coatings will be applied to guarantee high durability without trapping moisture.';
                      setGeneralNotes(text);
                      triggerNotification('Loaded Brick Staining preset!', 'success');
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    Load Brick Preset
                  </button>
                </div>
              </div>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="General notes and warranty info..."
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500/55 rounded-xl p-3.5 text-xs text-zinc-300 focus:outline-none transition leading-relaxed"
              />
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2 md:col-span-2 border-t border-neutral-800 pt-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                  Terms & Conditions (Shows on Proposal PDF)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const text = proposalSettings.termsAndConditions || DEFAULT_PROPOSAL_SETTINGS.termsAndConditions || '1. PAYMENT TERMS: A 30% deposit is required to schedule the project. Balance is due immediately upon completion of work.\n2. SCHEDULING: Weather permitting for exterior jobs. Any schedule delays will be communicated promptly.\n3. WARRANTY: We provide a 2-year warranty on workmanship. Warranty does not cover normal wear and tear, abuse, or structural settlement.';
                      setTermsAndConditions(text);
                      triggerNotification('Loaded Standard Terms preset!', 'success');
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    Load Residential Terms
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTermsAndConditions('1. PAYMENT TERMS: 30% deposit upon contract signing, 40% progress billing at mid-point, 30% balance upon substantial completion (Net 15).\n2. CHANGE ORDERS: Any scope additions or field changes must be signed in writing prior to execution.\n3. WARRANTY: 3-year limited warranty on commercial coating applications.');
                      triggerNotification('Loaded Commercial Terms preset!', 'success');
                    }}
                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-zinc-400 hover:text-white rounded transition cursor-pointer"
                  >
                    Load Commercial Terms
                  </button>
                </div>
              </div>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Contract terms and legal conditions..."
                rows={5}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500/55 rounded-xl p-3.5 text-xs text-zinc-300 focus:outline-none transition leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* 4.5 CLIENT-FACING PROPOSAL PDF PREVIEW & GMAIL DISPATCHER */}
        <div id="section-preview" className="scroll-mt-24 mt-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
            <div>
              <h2 className="text-lg font-bold font-sans text-white tracking-tight flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-blue-500" /> Client Proposal PDF Preview
              </h2>
              <p className="text-zinc-400 text-xs">
                This preview matches the official document sent to clients. Internal company costs, hourly rates, and margins are automatically hidden.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const { blobUrl } = generateProposalPDF({
                    project,
                    client,
                    rooms,
                    liveSummary,
                    inclusions,
                    exclusions,
                    specialConditions,
                    signerName,
                    signerTitle,
                    signedDate,
                    clientSigned,
                    clientAddress,
                    clientPhone,
                    clientEmail,
                    projectDate,
                    proposalNo,
                    generalNotes,
                    termsAndConditions,
                    signatureDataUrl: project.signatureDataUrl,
                    installments: project.installments || installments,
                  });
                  if (blobUrl) {
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `Proposal_${proposalNo}.pdf`;
                    link.click();
                    triggerNotification('PDF generated and downloaded successfully!', 'success');
                  } else {
                    triggerNotification('Could not generate PDF download.', 'error');
                  }
                }}
                className="bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-mono font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" /> Print PDF Version
              </button>
            </div>
          </div>

          {/* PHYSICAL WHITE SHEET PDF SIMULATION */}
          <div 
            id="client-proposal-pdf-sheet" 
            className="bg-white text-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-200 shadow-2xl max-w-4xl mx-auto font-sans relative text-left"
          >
            {/* Watermark or Stamp */}
            {clientSigned && (
              <div className="absolute right-12 top-28 border-4 border-emerald-500/80 text-emerald-600/80 font-mono font-black uppercase tracking-widest text-lg px-4 py-2 rounded-lg transform rotate-12 select-none pointer-events-none z-10 bg-white/90">
                ✓ Signed & Accepted
              </div>
            )}

            {/* PDF Document Header */}
            <div className="flex flex-col sm:flex-row items-baseline sm:justify-between border-b-2 border-zinc-900 pb-6 gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
                  PaintNav Proposal & Estimate
                </h1>
                <p className="text-xs text-zinc-500 font-mono mt-1">Proposal Reference: #{proposalNo}</p>
              </div>
              <div className="text-left sm:text-right font-mono text-zinc-600 text-xs space-y-1">
                <p><span className="font-bold text-zinc-400">Date:</span> {projectDate}</p>
                <p><span className="font-bold text-zinc-400">Status:</span> {clientSigned ? 'SIGNED & LOCKED' : 'PENDING ACCEPTANCE'}</p>
                <p><span className="font-bold text-zinc-400">Valid Until:</span> 30 Days from Date</p>
              </div>
            </div>

            {/* Details columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 text-xs leading-relaxed">
              <div className="space-y-1 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-zinc-200 pr-0 md:pr-8">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-1">Contractor Details</span>
                <p className="font-bold text-zinc-900 text-sm">PaintNav CRM Professional Services</p>
                <p className="text-zinc-600">Toronto Siding & Framing Division</p>
                <p className="text-zinc-600">Email: support@paintnav.com • Tel: (416) 555-0199</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-1">Prepared For</span>
                <p className="font-bold text-zinc-900 text-sm">{clientName}</p>
                <p className="text-zinc-600">{clientAddress}</p>
                <p className="text-zinc-600">Phone: {clientPhone} • Email: {clientEmail}</p>
              </div>
            </div>

            {/* Work scope & standard specs table */}
            <div className="space-y-3 my-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block">Scope of Work (Standard Services)</span>
                <span className="text-[10px] text-zinc-500 font-mono italic">Click "Make Optional" on any area to make it a client choice</span>
              </div>
              <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-150 bg-zinc-50/50">
                <div className="grid grid-cols-12 gap-2 bg-zinc-100 p-3 text-[10px] text-zinc-500 uppercase font-bold font-mono">
                  <div className="col-span-5 text-left">Room / Area Description</div>
                  <div className="col-span-4 text-left">Areas Applied</div>
                  <div className="col-span-3 text-right">Flat Price & Option Toggle</div>
                </div>

                {rooms.filter(r => !r.isOption).length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400 italic">
                    All areas are currently marked as optional add-ons. Click "Include in Scope" below to move an area into standard services.
                  </div>
                ) : (
                  rooms.filter(r => !r.isOption).map(room => {
                    const price = liveSummary.roomCosts[room.id] || 0;
                    return (
                      <div key={room.id} className="p-3 sm:p-3.5 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-center text-xs">
                        <div className="sm:col-span-4 text-left font-bold text-zinc-900 font-mono flex items-center justify-between sm:justify-start gap-2">
                          <span>{room.name}</span>
                          <span className="font-bold text-zinc-900 sm:hidden">${price.toLocaleString()}</span>
                        </div>
                        <div className="sm:col-span-5 text-left text-zinc-600 font-mono text-[11px] leading-relaxed break-words">
                          {getRoomHighlightsText(room)}
                        </div>
                        <div className="sm:col-span-3 text-right font-mono flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-200/60">
                          <span className="font-bold text-zinc-900 hidden sm:inline">${price.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isOption: true } : r));
                              triggerNotification(`Moved ${room.name} to Optional Extras!`);
                            }}
                            className="px-2.5 py-1 text-[10px] bg-zinc-200 hover:bg-amber-100 text-zinc-700 hover:text-amber-900 font-bold rounded border border-zinc-300 transition cursor-pointer"
                            title="Convert area into an optional add-on choice for the client"
                          >
                            Make Optional
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Optional choices table (highlighted in yellow outline/background if any exist) */}
            {rooms.some(r => r.isOption) && (
              <div className="space-y-3 my-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-600 uppercase font-black tracking-widest flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Optional Extras & Choices (Client Add-Ons)
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono font-bold">
                    Toggle switches to include or exclude optional add-ons
                  </span>
                </div>
                <div className="border-2 border-amber-300/80 rounded-xl overflow-hidden divide-y divide-amber-200/60 bg-amber-50/40 shadow-xs">
                  <div className="grid grid-cols-12 gap-2 bg-amber-100/80 p-3 text-[10px] text-amber-900 uppercase font-bold font-mono">
                    <div className="col-span-5 text-left">Optional Area / Service</div>
                    <div className="col-span-4 text-left">Specifications</div>
                    <div className="col-span-3 text-right">Optional Upgrade Price</div>
                  </div>

                  {rooms.filter(r => r.isOption).map(room => {
                    const price = liveSummary.roomCosts[room.id] || 0;
                    return (
                      <div key={room.id} className="p-3 sm:p-3.5 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-center text-xs text-amber-950">
                        <div className="sm:col-span-4 text-left font-bold font-mono flex items-center justify-between sm:justify-start gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                            <span>{room.name}</span>
                            <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-extrabold">OPTION</span>
                          </div>
                          <span className="font-bold text-amber-950 sm:hidden">+${price.toLocaleString()}</span>
                        </div>
                        <div className="sm:col-span-5 text-left text-amber-900/80 font-mono text-[11px] leading-relaxed break-words">
                          {getRoomHighlightsText(room)}
                        </div>
                        <div className="sm:col-span-3 text-right font-mono flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                          <span className="font-bold text-amber-950 hidden sm:inline">+${price.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isOption: false } : r));
                              triggerNotification(`Included ${room.name} into standard proposal scope!`);
                            }}
                            className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                            title="Click to include this option in the main proposal scope"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Include in Scope</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inclusions, Exclusions, Special Conditions Comments block */}
            {(inclusions || exclusions || specialConditions) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 pt-4 border-t border-zinc-100">
                {inclusions && (
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/60 space-y-1 text-left">
                    <span className="text-[9px] text-emerald-600 uppercase font-black tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Inclusions
                    </span>
                    <div className="text-zinc-600 text-[11px] leading-relaxed whitespace-pre-wrap">{inclusions}</div>
                  </div>
                )}
                {exclusions && (
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/60 space-y-1 text-left">
                    <span className="text-[9px] text-red-600 uppercase font-black tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Exclusions
                    </span>
                    <div className="text-zinc-600 text-[11px] leading-relaxed whitespace-pre-wrap">{exclusions}</div>
                  </div>
                )}
                {specialConditions && (
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/60 space-y-1 text-left">
                    <span className="text-[9px] text-amber-600 uppercase font-black tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Conditions
                    </span>
                    <div className="text-zinc-600 text-[11px] leading-relaxed whitespace-pre-wrap">{specialConditions}</div>
                  </div>
                )}
              </div>
            )}

            {/* PDF Pricing Totals Breakdown (Hiding labor hours, material detail costs, wages, markup details) */}
            <div className="my-8 bg-zinc-50 p-6 rounded-xl border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs leading-relaxed">
              <div className="max-w-md text-zinc-500 space-y-1 text-left">
                <span className="font-black text-[10px] text-zinc-400 uppercase tracking-widest block font-mono">Payment Schedule</span>
                <p>
                  A standard 30% deposit of <strong>${liveSummary.deposit.toLocaleString()}</strong> is required to coordinate labor allocation and paint supply channels. The remaining balance of <strong>${liveSummary.balance.toLocaleString()}</strong> is settleable upon final physical site walkthrough validation.
                </p>
              </div>
              <div className="w-full md:w-72 divide-y divide-zinc-200 space-y-2 pt-1">
                <div className="flex justify-between text-zinc-500 font-mono">
                  <span>Subtotal Price</span>
                  <span className="font-bold">${liveSummary.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-mono pt-1.5">
                  <span>Sales Tax / HST (13%)</span>
                  <span className="font-bold">${liveSummary.hst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-zinc-900 pt-2 font-mono">
                  <span>Grand Proposal Price</span>
                  <span className="text-emerald-700 font-black text-base">${liveSummary.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* SIGNATURE SECTION DISPLAY INSIDE PDF SHEET */}
            <div className="mt-12 pt-8 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="space-y-2">
                <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest block">Contractor Representative</span>
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-left font-mono">
                  <p className="font-bold text-zinc-800">PaintNav CRM Services</p>
                  <div className="border-b border-dashed border-zinc-300 py-1 text-blue-600 font-black text-sm italic">
                    PaintNav CRM Division
                  </div>
                  <p className="text-[10px] text-zinc-400">Authorized Digital Signature</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest block">Client E-Sign Authorization</span>
                {clientSigned ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-left relative overflow-hidden">
                    <div className="absolute right-2 top-2 text-emerald-500/10">
                      <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <p className="font-bold text-zinc-800">{signerName}</p>
                    {project.signatureDataUrl ? (
                      <div className="border border-emerald-200/60 bg-white p-1 rounded-lg h-12 flex items-center justify-center my-1 select-none pointer-events-none">
                        <img 
                          src={project.signatureDataUrl} 
                          alt="Client Signature" 
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="border-b border-dashed border-emerald-300 py-1 font-mono text-emerald-700 font-black text-sm italic tracking-wide">
                        {signerName}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Signed as: {signerTitle} • Date: {signedDate}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl flex flex-col justify-center items-center h-[98px] text-zinc-400 italic">
                    Waiting for electronic signature authorization below...
                  </div>
                )}
              </div>
            </div>

            {/* Corporate Footer line */}
            <div className="text-center text-[9px] text-zinc-400 font-mono mt-12 pt-4 border-t border-zinc-100 select-none">
              Thank you for your trusted patronage. Powered securely by PaintNav Painting Estimator.
            </div>
          </div>

          {/* WORK BENCH & GMAIL CONTROLS BELOW THE SIMULATED SHEET */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT PANEL: CONTRACT ACCEPTANCE & LIVE BILLING */}
            <div id="section-acceptance" className="scroll-mt-24 bg-[#161616] border border-[#222222] rounded-2xl p-6 text-left space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-500" /> Contract & Billing Control
                </h3>
                {clientSigned ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded uppercase tracking-wider font-mono">
                    Signed & Approved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded uppercase tracking-wider font-mono">
                    Pending Approval
                  </span>
                )}
              </div>

              {/* Status Section */}
              {clientSigned ? (
                <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-emerald-300">Contract Approved & Digitally Locked</p>
                      <p className="text-zinc-400 mt-1 leading-relaxed">
                        Approved by <strong>{signerName || 'Client'}</strong> ({signerTitle || 'Homeowner'}) on {signedDate || 'N/A'}.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                    <button
                      onClick={downloadProposalPDF}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Signed Proposal
                    </button>
                    
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to retract/reset this signature? This will unlock the proposal.')) {
                          setClientSigned(false);
                          localStorage.removeItem(`proposal-signed-${project.id}`);
                          triggerNotification('Signature removed. Proposal unlocked.', 'success');
                          
                          const updated = {
                            ...project,
                            id: proposalNo,
                            status: 'Draft' as const,
                            rooms,
                            clientSigned: false,
                            signerName: '',
                            signerTitle: '',
                            signedDate: '',
                          };
                          await handleSaveBoth(updated, 'Draft');
                        }
                      }}
                      className="py-2 px-3 bg-neutral-900 border border-neutral-850 hover:border-red-500/30 hover:bg-neutral-850 text-xs text-zinc-400 hover:text-red-400 rounded-xl transition cursor-pointer font-bold font-mono"
                      title="Reset signature state"
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-950/40 border border-neutral-850 rounded-xl p-4 space-y-3.5">
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-zinc-300">Waiting for Client Acceptance</p>
                    <p className="text-zinc-500 leading-relaxed">
                      Send this proposal to the client using the Gmail dispatcher. They can review, authorize, and sign it online.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={downloadProposalPDF}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Draft Proposal
                    </button>
                    
                    <button
                      onClick={async () => {
                        const name = window.prompt("Enter signer full name to authorize offline:", clientName);
                        if (name === null) return;
                        if (!name.trim()) {
                          triggerNotification("Please enter a signer name.", "error");
                          return;
                        }
                        const title = window.prompt("Enter signer title / relation:", "Homeowner") || "Homeowner";
                        const nowStr = new Date().toLocaleString();
                        
                        setClientSigned(true);
                        setSignerName(name);
                        setSignerTitle(title);
                        setSignedDate(nowStr);
                        
                        localStorage.setItem(`proposal-signed-${project.id}`, 'true');
                        localStorage.setItem(`signer-name-${project.id}`, name);
                        localStorage.setItem(`signer-title-${project.id}`, title);
                        localStorage.setItem(`signer-date-${project.id}`, nowStr);
                        
                        triggerNotification('Proposal marked approved offline!', 'success');
                        
                        const updated = {
                          ...project,
                          id: proposalNo,
                          status: 'Approved' as const,
                          rooms,
                          clientSigned: true,
                          signerName: name,
                          signerTitle: title,
                          signedDate: nowStr,
                        };
                        await handleSaveBoth(updated, 'Approved');
                      }}
                      className="flex-1 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorize Offline
                    </button>
                  </div>
                </div>
              )}

              {/* Live Remaining Cost Section */}
              <div className="border-t border-neutral-850 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Live Financial Overview
                  </h4>
                  {clientSigned && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Stripe Payments Integrated
                    </span>
                  )}
                </div>

                {(() => {
                  const activeInstallments = installments || [];
                  const grandTotal = liveSummary.total;

                  return (
                    <div className="space-y-4">
                      {/* Bento Dashboard stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-850/60">
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">Proposal Total</span>
                          <span className="text-xs font-bold text-zinc-200 font-mono block mt-0.5">
                            ${grandTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-850/60">
                          <span className="text-[8px] text-emerald-500/80 font-bold uppercase tracking-wider font-mono block">Paid to Date</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono block mt-0.5">
                            ${totalPaid.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-850/60">
                          <span className="text-[8px] text-amber-500/80 font-bold uppercase tracking-wider font-mono block">Remaining Cost</span>
                          <span className="text-xs font-bold text-amber-400 font-mono block mt-0.5">
                            ${remainingCost.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Payment Schedule Table */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">Installments Breakdown</span>
                        {activeInstallments.length === 0 ? (
                          <div className="bg-neutral-950/30 border border-dashed border-neutral-850 p-4 rounded-xl text-center">
                            <p className="text-[10px] text-zinc-500 leading-normal">
                              No installments billed yet. First payment request can automatically be set to 30%.
                            </p>
                            <button
                              onClick={() => {
                                handleOpenInvoiceModalWithPreset(30, "Upfront Deposit (30%)");
                              }}
                              className="mt-2.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Initialize 30% Deposit
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                            {activeInstallments.map((inst, idx) => {
                              const isPaid = inst.status === 'Paid';
                              const isRequested = inst.status === 'Requested';
                              return (
                                <div 
                                  key={inst.id || idx}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-[11px] gap-2 ${
                                    isPaid 
                                      ? 'bg-emerald-950/10 border-emerald-500/20' 
                                      : isRequested 
                                        ? 'bg-amber-950/5 border-amber-500/15' 
                                        : 'bg-neutral-950/40 border-neutral-850'
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-zinc-300">{inst.name}</span>
                                      <span className="text-[9px] text-zinc-500 font-mono">({inst.percentage}%)</span>
                                    </div>
                                    <span className="text-[9px] text-zinc-500 font-mono block">
                                      {isPaid 
                                        ? `Paid on ${inst.paidAt || 'N/A'}` 
                                        : isRequested 
                                          ? `Requested on ${inst.requestedAt || 'N/A'}` 
                                          : 'Draft (unbilled)'
                                      }
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                    <span className="font-mono font-bold text-zinc-300">${inst.amount.toLocaleString()}</span>
                                    
                                    <div className="flex items-center gap-1.5">
                                      {isPaid ? (
                                        <>
                                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded font-mono">
                                            Paid
                                          </span>
                                          <button
                                            onClick={() => handleOpenReceiptModal(inst.id)}
                                            className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 text-[9px] font-bold rounded cursor-pointer transition flex items-center gap-1"
                                            title="Send Receipt via Gmail"
                                          >
                                            <Mail className="w-2.5 h-2.5" /> Receipt
                                          </button>
                                          <button
                                            onClick={() => downloadReceiptPDF(inst)}
                                            className="px-2 py-0.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 text-[9px] font-bold rounded cursor-pointer transition flex items-center gap-1"
                                            title="Download PDF Receipt"
                                          >
                                            <Download className="w-2.5 h-2.5" /> Download
                                          </button>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          {inst.stripeInvoiceUrl && (
                                            <a 
                                              href={inst.stripeInvoiceUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[9px] font-black rounded transition"
                                            >
                                              Stripe
                                            </a>
                                          )}
                                          <button
                                            onClick={() => handleOpenRequestModal(inst.id)}
                                            className="px-2 py-0.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[9px] font-bold rounded cursor-pointer transition flex items-center gap-1"
                                            title="Send Payment Request Email"
                                          >
                                            <Send className="w-2.5 h-2.5" /> Send Request
                                          </button>
                                          <button
                                            onClick={() => handleOpenReceiptModal(inst.id)}
                                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-750 text-white text-[9px] font-bold rounded cursor-pointer transition flex items-center gap-1 shadow-sm"
                                            title="Record Payment Received & Send Receipt"
                                          >
                                            <CheckCircle2 className="w-2.5 h-2.5" /> Payment Received
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              const remainingPct = 100 - activeInstallments.reduce((sum, inst) => sum + inst.percentage, 0);
                              const nextPct = remainingPct > 0 ? remainingPct : 10;
                              handleOpenInvoiceModalWithPreset(nextPct, `Milestone Payment (${nextPct}%)`);
                            }}
                            className="w-full py-2 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Request Invoice
                          </button>
                          
                          <button
                            onClick={() => handleOpenReceiptModal()}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Payment Received
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* RIGHT PANEL: GMAIL INVOICE & PROPOSAL DISPATCHER */}
            <div className="bg-[#161616] border border-[#222222] rounded-2xl p-6 text-left space-y-4">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-500" /> Gmail Client Dispatcher
              </h3>

              {!localToken ? (
                <div className="space-y-3.5 w-full">
                  <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-850 text-center space-y-3.5">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-white">Gmail Integration Disconnected</p>
                      <p className="text-[11px] text-zinc-500 leading-normal max-w-xs mx-auto">
                        Securely authorize your Google Workspace account to email professional PDF-style interactive estimates directly to clients.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (isAuthenticating) return;
                        try {
                          setIsAuthenticating(true);
                          setGmailAuthError(null);
                          const result = await googleSignIn();
                          if (result) {
                            setLocalToken(result.accessToken);
                            triggerNotification('Connected to Google Account successfully!', 'success');
                          }
                        } catch (err: any) {
                          const isPopupClosed = err?.message?.includes('popup-closed-by-user') || err?.code?.includes('popup-closed-by-user') || String(err).includes('popup-closed-by-user') ||
                                                err?.message?.includes('cancelled-popup-request') || err?.code?.includes('cancelled-popup-request') || String(err).includes('cancelled-popup-request');
                          if (isPopupClosed) {
                            console.warn('Google authorization was closed or blocked by the user.');
                          } else {
                            console.error('Google authorization failed:', err);
                          }
                          const isUnauthorizedDomain = err?.message?.includes('unauthorized-domain') || err?.code?.includes('unauthorized-domain') || String(err).includes('unauthorized-domain');
                          if (isUnauthorizedDomain) {
                            setGmailAuthError('unauthorized-domain');
                            triggerNotification('Domain not authorized in Firebase.', 'error');
                          } else if (isPopupClosed) {
                            setGmailAuthError('popup-blocked');
                            triggerNotification('Sign-in popup blocked or closed.', 'error');
                          } else {
                            setGmailAuthError('generic');
                            triggerNotification('Failed to authorize Google Account.', 'error');
                          }
                        } finally {
                          setIsAuthenticating(false);
                        }
                      }}
                      disabled={isAuthenticating}
                      className={`px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mx-auto ${isAuthenticating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isAuthenticating ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 48 48">
                          <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
                          <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
                          <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
                          <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853" />
                        </svg>
                      )}
                      <span>{isAuthenticating ? 'Connecting Google...' : 'Connect Gmail Service'}</span>
                    </button>
                  </div>

                  {gmailAuthError && (
                    <div className="p-3.5 bg-neutral-950 border border-neutral-850 rounded-xl text-left space-y-2">
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-[10px] font-mono tracking-wider">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        {gmailAuthError === 'unauthorized-domain' 
                          ? 'DOMAIN AUTHORIZATION REQUIRED' 
                          : gmailAuthError === 'popup-blocked'
                          ? 'SIGN-IN POPUP BLOCKED'
                          : 'SIGN-IN FAILED'}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal">
                        {gmailAuthError === 'unauthorized-domain' ? (
                          <>
                            This domain (<code className="text-white font-mono bg-neutral-900 px-1 py-0.5 rounded">{window.location.hostname}</code>) is not whitelisted in your Firebase console. 
                            <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1">
                              Open Console <ExternalLink className="w-2.5 h-2.5" />
                            </a> and add it under <strong className="text-zinc-300">Build &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.
                          </>
                        ) : gmailAuthError === 'popup-blocked' ? (
                          'Your browser blocked the Google Sign-In popup window. Please allow popups or open the app in a new standalone tab.'
                        ) : (
                          'Google authorization failed. Please check your network and Firebase configuration.'
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-mono text-[10px]">Gmail is connected</span>
                    <button
                      onClick={() => {
                        setLocalToken(null);
                        triggerNotification('Disconnected Gmail integration.', 'success');
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                    >
                      Disconnect Account
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">To (Client Email)</label>
                        <input
                          type="email"
                          value={gmailRecipient}
                          onChange={(e) => setGmailRecipient(e.target.value)}
                          placeholder="client@email.com"
                          className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Email Subject</label>
                        <input
                          type="text"
                          value={gmailSubject}
                          onChange={(e) => setGmailSubject(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2 text-xs text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Intro Message Body</label>
                      <textarea
                        value={gmailMessage}
                        onChange={(e) => setGmailMessage(e.target.value)}
                        rows={3}
                        className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white outline-none"
                        placeholder="Write a custom greeting to the client..."
                      />
                    </div>
                  </div>

                  {gmailError && (
                    <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-red-400 font-mono text-[11px] leading-relaxed break-words">
                      Error: {renderErrorWithLinks(gmailError)}
                    </div>
                  )}

                  {gmailSuccess && (
                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 text-emerald-400 font-mono text-[11px]">
                      ✓ Proposal Email dispatched successfully! Check your Gmail Sent folder.
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      if (!gmailRecipient) {
                        triggerNotification('Please provide a client email address.', 'error');
                        return;
                      }
                      setIsSendingGmail(true);
                      setGmailSuccess(false);
                      setGmailError('');
                      try {
                        // Fetch project photos as base64 email attachments
                        const imageAttachments = await getPhotoEmailAttachments();

                        const roomsList = rooms.filter(r => !r.isOption).map(room => {
                          const price = liveSummary.roomCosts[room.id] || 0;
                          return `
                            <tr>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${room.name}</strong></td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${getRoomHighlightsText(room)}</td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${price.toLocaleString()}</td>
                            </tr>
                          `;
                        }).join('');

                        const optionsList = rooms.filter(r => r.isOption).map(room => {
                          const price = liveSummary.roomCosts[room.id] || 0;
                          return `
                            <tr style="background-color: #fefbeb;">
                              <td style="padding: 10px; border-bottom: 1px solid #fde047;"><strong>${room.name} (Option)</strong></td>
                              <td style="padding: 10px; border-bottom: 1px solid #fde047; color: #666;">${getRoomHighlightsText(room)}</td>
                              <td style="padding: 10px; border-bottom: 1px solid #fde047; text-align: right; font-weight: bold; color: #b45309;">$${price.toLocaleString()}</td>
                            </tr>
                          `;
                        }).join('');

                        const inclusionsHTML = inclusions ? `<div style="margin-bottom: 12px;"><strong>Inclusions:</strong><br/>${inclusions.replace(/\n/g, '<br/>')}</div>` : '';
                        const exclusionsHTML = exclusions ? `<div style="margin-bottom: 12px;"><strong>Exclusions:</strong><br/>${exclusions.replace(/\n/g, '<br/>')}</div>` : '';
                        const specialHTML = specialConditions ? `<div style="margin-bottom: 12px;"><strong>Special Conditions:</strong><br/>${specialConditions.replace(/\n/g, '<br/>')}</div>` : '';

                        const htmlBody = `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">PaintNav Proposal & Estimate</h2>
                            <p>Dear ${clientName},</p>
                            <p>${gmailMessage.replace(/\n/g, '<br/>')}</p>

                            <div style="text-align: center; margin: 30px 0;">
                              <a href="${window.location.origin}/?proposalId=${project.id}&action=sign" 
                                 style="background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);"
                                 target="_blank">
                                ✍️ Review & Sign Proposal Online
                              </a>
                            </div>
                            
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                              <h3 style="margin-top: 0; color: #0f172a;">Summary of Estimate #${proposalNo}</h3>
                              <p><strong>Date:</strong> ${projectDate}</p>
                              <p><strong>Client:</strong> ${clientName}</p>
                              <p><strong>Address:</strong> ${clientAddress}</p>
                            </div>

                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                              <thead>
                                <tr style="background-color: #f1f5f9;">
                                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Room / Option</th>
                                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Details</th>
                                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${roomsList || '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">No standard scope items</td></tr>'}
                                ${optionsList}
                              </tbody>
                            </table>

                            <div style="text-align: right; margin-bottom: 25px; padding-top: 10px; border-top: 2px solid #e2e8f0;">
                              <p style="margin: 4px 0;"><strong>Subtotal:</strong> $${liveSummary.subtotal.toLocaleString()}</p>
                              <p style="margin: 4px 0;"><strong>HST (13%):</strong> $${liveSummary.hst.toLocaleString()}</p>
                              <h3 style="margin: 8px 0; color: #166534;">Grand Total: $${liveSummary.total.toLocaleString()}</h3>
                              <p style="font-size: 11px; color: #666; margin: 4px 0;">30% Deposit Due: $${liveSummary.deposit.toLocaleString()}</p>
                            </div>

                            ${inclusionsHTML || exclusionsHTML || specialHTML ? `
                              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <h4 style="margin-top: 0; margin-bottom: 10px; color: #0f172a;">Scope Comments</h4>
                                ${inclusionsHTML}
                                ${exclusionsHTML}
                                ${specialHTML}
                              </div>
                            ` : ''}

                            <div style="text-align: center; margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                              <p style="font-size: 13px; font-weight: bold; color: #1e3a8a;">This proposal is ready for your signature online.</p>
                              <p style="font-size: 11px; color: #999; margin-top: 15px;">Powered securely by PaintNav Painting Estimator.</p>
                            </div>
                          </div>
                        `;

                        const { base64: proposalPdfBase64 } = generateProposalPDF({
                          project,
                          client,
                          rooms,
                          liveSummary,
                          inclusions,
                          exclusions,
                          specialConditions,
                          signerName,
                          signerTitle,
                          signedDate,
                          clientSigned,
                          clientAddress,
                          clientPhone,
                          clientEmail,
                          projectDate,
                          proposalNo,
                          generalNotes,
                          termsAndConditions,
                          signatureDataUrl: project.signatureDataUrl,
                          installments: project.installments || installments,
                        });

                        await sendProposalEmail({
                          accessToken: localToken,
                          to: gmailRecipient,
                          subject: gmailSubject,
                          body: htmlBody,
                          pdfBase64: proposalPdfBase64,
                          pdfFilename: `Proposal_${proposalNo}.pdf`,
                          attachments: imageAttachments,
                        });

                        setGmailSuccess(true);
                        triggerNotification('Email dispatched successfully!', 'success');
                      } catch (err: any) {
                        console.error('Failed to send proposal email:', err);
                        const isAuthError = String(err?.message || '').toLowerCase().includes('expired') ||
                                            String(err?.message || '').toLowerCase().includes('credentials') ||
                                            String(err?.message || '').toLowerCase().includes('unauthenticated') ||
                                            String(err?.message || '').toLowerCase().includes('401');
                        if (isAuthError) {
                          setLocalToken(null);
                          setAccessToken(null);
                          setGmailError('Google session expired or missing permissions. Please re-authorize Gmail below.');
                          triggerNotification('Gmail auth expired. Please re-connect Gmail.', 'error');
                        } else {
                          setGmailError(err.message || 'An unexpected error occurred during Gmail send.');
                          triggerNotification('Gmail send failed.', 'error');
                        }
                      } finally {
                        setIsSendingGmail(false);
                      }
                    }}
                    disabled={isSendingGmail}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> 
                    {isSendingGmail ? 'Dispatching Email...' : 'Send Invoice & Proposal via Gmail'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 5. GUEST SHARE ACCORDION DIALOG POPUP MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-md p-6 relative text-left shadow-2xl"
          >
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-lg cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="font-display font-bold text-white text-base mb-1.5 flex items-center gap-1.5">
              <Share2 className="w-4.5 h-4.5 text-blue-500" /> Share Change Order Estimate
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              Collaborate and capture electronic signatures instantly. Generate a secure, read-only dashboard checkout sheet for homeowner:
            </p>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 text-xs font-mono text-zinc-400 flex items-center justify-between select-all leading-none break-all pr-2">
              <span className="truncate select-all text-blue-400 pr-1 select-all">
                {window.location.origin}/?proposalId={proposalNo}&action=sign
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?proposalId=${proposalNo}&action=sign`);
                  triggerNotification('Link copied to clipboard!');
                }}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 font-bold text-[10px] text-white rounded-lg cursor-pointer"
              >
                Copy
              </button>
            </div>

            <div className="mt-5 flex gap-2 justify-end border-t border-neutral-850 pt-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-neutral-850 hover:bg-neutral-850 border border-neutral-750 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. COMPREHENSIVE CONTRACTOR WORK ESTIMATE STATEMENT PREVIEW SHEET */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-neutral-7d0 rounded-2xl w-full max-w-3xl p-6 relative text-left shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={() => setShowPreviewModal(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-neutral-800 text-zinc-450 hover:text-white rounded-lg cursor-pointer transition z-10"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Document Header Panel */}
            <div className="space-y-6 text-zinc-150">
              
              <div className="flex flex-col sm:flex-row items-baseline sm:justify-between border-b border-zinc-800 pb-5 gap-3">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white uppercase font-sans flex items-center gap-1.5">
                    <Paintbrush className="w-5 h-5 text-blue-500" /> PaintNav Proposal Invoice
                  </h1>
                  <p className="text-xs text-zinc-500 font-mono mt-1">Estimate Ref: #{proposalNo}</p>
                </div>
                <div className="text-left sm:text-right font-mono text-zinc-400 text-xs space-y-0.5">
                  <p><span className="text-zinc-650">Date:</span> {projectDate}</p>
                  <p><span className="text-zinc-650">Status:</span> APPROVED</p>
                </div>
              </div>

              {/* Client specifications contacts card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-mono block mb-1">Contractor Details</span>
                  <p className="font-bold text-white">PaintNav CRM Professional Services</p>
                  <p className="text-zinc-400">Toronto Siding & Framing Division</p>
                  <p className="text-zinc-400">Email: support@paintnav.com</p>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-mono block mb-1">Client Address</span>
                  <p className="font-bold text-white">{clientName}</p>
                  <p className="text-zinc-450 truncate">{clientAddress}</p>
                  <p className="text-zinc-450">Phone: {clientPhone} • Email: {clientEmail}</p>
                </div>
              </div>

              {/* Dynamic room summary display table */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase font-mono text-zinc-400">Room spec items</h3>
                <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-850 bg-neutral-950">
                  <div className="grid grid-cols-12 gap-2 bg-neutral-900/60 p-3 text-[10px] text-zinc-500 uppercase font-bold font-mono">
                    <div className="col-span-5 text-left">Room Name</div>
                    <div className="col-span-4 text-left">Applied Areas</div>
                    <div className="col-span-3 text-right">Estimated Surcharge</div>
                  </div>

                  {rooms.filter(r => !r.isOption).length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500 italic">
                      No standard rooms configured in standard scope.
                    </div>
                  ) : (
                    rooms.filter(r => !r.isOption).map(room => {
                      const price = liveSummary.roomCosts[room.id] || 0;
                      return (
                        <div key={room.id} className="grid grid-cols-12 gap-2 p-3.5 items-center text-xs">
                          <div className="col-span-5 text-left font-bold text-white font-mono">{room.name}</div>
                          <div className="col-span-4 text-left text-zinc-400 truncate">{getRoomHighlightsText(room)}</div>
                          <div className="col-span-3 text-right font-bold text-zinc-100 font-mono">${price.toLocaleString()}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Options Section */}
              {rooms.some(r => r.isOption) && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-xs uppercase font-mono text-yellow-500 flex items-center gap-1.5">
                    Optional Extras / Choices
                  </h3>
                  <div className="border border-yellow-500/30 rounded-xl overflow-hidden divide-y divide-neutral-850 bg-neutral-950">
                    <div className="grid grid-cols-12 gap-2 bg-yellow-950/10 p-3 text-[10px] text-yellow-500 uppercase font-bold font-mono">
                      <div className="col-span-5 text-left">Option / Room Name</div>
                      <div className="col-span-4 text-left">Applied Areas</div>
                      <div className="col-span-3 text-right">Optional Add-On Cost</div>
                    </div>

                    {rooms.filter(r => r.isOption).map(room => {
                      const price = liveSummary.roomCosts[room.id] || 0;
                      return (
                        <div key={room.id} className="grid grid-cols-12 gap-2 p-3.5 items-center text-xs">
                          <div className="col-span-5 text-left font-bold text-white font-mono flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                            {room.name}
                          </div>
                          <div className="col-span-4 text-left text-zinc-400 truncate">{getRoomHighlightsText(room)}</div>
                          <div className="col-span-3 text-right font-bold text-yellow-450 font-mono">${price.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total finalization breakdown statement */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1 text-left leading-relaxed max-w-sm text-zinc-500">
                  <p className="font-bold text-zinc-400 uppercase text-[10px] font-mono">Payment Terms Terms</p>
                  <p>A standard 30% initial deposit of <strong>${liveSummary.deposit.toLocaleString()}</strong> is required to coordinate paint supply channels. Remaining balance is settleable upon final site walkthrough validation.</p>
                </div>

                <div className="w-full md:w-64 divide-y divide-neutral-900 space-y-1.5 pt-2">
                  <div className="flex justify-between text-zinc-500">
                    <span className="font-mono">Subtotal</span>
                    <span className="font-medium font-mono">${liveSummary.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 pt-1.5">
                    <span className="font-mono">HST (13%)</span>
                    <span className="font-medium font-mono">${liveSummary.hst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-2">
                    <span>Grand Total</span>
                    <span className="text-bold text-emerald-400 font-mono">${liveSummary.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Proposal Scope Notes (Inclusions, Exclusions, Special Conditions) */}
              {(inclusions || exclusions || specialConditions) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {inclusions && (
                    <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-850/60 space-y-1.5 text-left">
                      <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider font-mono flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full" /> Inclusions
                      </span>
                      <div className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-wrap">{inclusions}</div>
                    </div>
                  )}
                  {exclusions && (
                    <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-850/60 space-y-1.5 text-left">
                      <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider font-mono flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-red-400 rounded-full" /> Exclusions
                      </span>
                      <div className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-wrap">{exclusions}</div>
                    </div>
                  )}
                  {specialConditions && (
                    <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-850/60 space-y-1.5 text-left">
                      <span className="text-[9px] text-amber-400 uppercase font-bold tracking-wider font-mono flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-amber-400 rounded-full" /> Special Conditions
                      </span>
                      <div className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-wrap">{specialConditions}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center text-[10px] text-zinc-600 font-mono pt-4 border-t border-neutral-850 select-none">
                Thank you for your trusted patronage. Powered securely by PaintNav Painting Estimator.
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-neutral-850 pt-4">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition"
              >
                Print Invoice
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-750 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* GOOGLE MAPS CONFIGURATION HELP MODAL */}
      {showMapsConfigModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-md p-6 relative text-left shadow-2xl space-y-4"
          >
            <button
              onClick={() => {
                setShowMapsConfigModal(false);
                setMapsErrorType('NONE');
              }}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className={`w-12 h-12 ${mapsErrorType !== 'NONE' ? 'bg-red-500/10' : 'bg-blue-500/10'} rounded-full flex items-center justify-center`}>
              <MapPin className={`w-6 h-6 ${mapsErrorType !== 'NONE' ? 'text-red-400' : 'text-blue-400'}`} />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-widest">
                {mapsErrorType === 'BILLING' 
                  ? 'Billing Setup or Geocoding API Required' 
                  : 'Google Maps API Key Required'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {mapsErrorType === 'BILLING'
                  ? 'Your Google Cloud Project returned a billing error (REQUEST_DENIED). Google Maps API requires a linked billing account to perform address verification.'
                  : 'To enable real-time address verification, geocoding, and auto-correction, you need to add your Google Maps Platform API key to this application.'}
              </p>
            </div>

            {mapsErrorType === 'BILLING' && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-2 text-xs text-amber-300">
                <span className="font-bold flex items-center gap-1.5 uppercase font-mono text-[10px] tracking-wider">
                  💡 Want a quick offline fix?
                </span>
                <p className="text-[11px] text-zinc-300 leading-normal">
                  You can bypass Google Cloud billing completely by using our build-in smart offline formatter:
                </p>
                <button
                  onClick={() => {
                    setShowMapsConfigModal(false);
                    setShowOfflineFallbackModal(true);
                  }}
                  className="w-full py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Offline Auto-Correct
                </button>
              </div>
            )}

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3 text-[11px] font-mono leading-relaxed text-zinc-300">
              {mapsErrorType === 'BILLING' ? (
                <>
                  <p>
                    <strong className="text-red-400">Step 1:</strong> Enable billing for your project:<br />
                    <a 
                      href="https://console.cloud.google.com/project/_/billing/enable" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline break-all"
                    >
                      https://console.cloud.google.com/project/_/billing/enable
                    </a>
                  </p>
                  <p>
                    <strong className="text-red-400">Step 2:</strong> Ensure the <strong className="text-zinc-200">Geocoding API</strong> and <strong className="text-zinc-200">Places API</strong> are enabled in your Google Cloud API library.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong className="text-blue-400">Step 1:</strong> Get an API Key:<br />
                    <a 
                      href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline break-all"
                    >
                      https://console.cloud.google.com/google/maps-apis/start
                    </a>
                  </p>
                  <p>
                    <strong className="text-blue-400">Step 2:</strong> Add key as an environment variable in AI Studio:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    <li>Open <strong className="text-zinc-200">Settings</strong> (⚙️ gear icon in top-right corner)</li>
                    <li>Go to <strong className="text-zinc-200">Secrets</strong></li>
                    <li>Add a new secret named <code className="bg-neutral-900 px-1 py-0.5 rounded text-white font-black font-mono">GOOGLE_MAPS_PLATFORM_KEY</code></li>
                    <li>Paste your API key value and save</li>
                  </ul>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setShowMapsConfigModal(false);
                setMapsErrorType('NONE');
              }}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              Close instructions
            </button>
          </motion.div>
        </div>
      )}

      {/* SEND PROPOSAL VIA EMAIL MODAL */}
      {showSendProposalEmailModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-lg p-6 relative text-left shadow-2xl space-y-4"
          >
            <button
              onClick={() => setShowSendProposalEmailModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-widest">
                Send Proposal to Client
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dispatch the official proposal preview PDF directly to your client. You can connect your Gmail account to automate the email delivery securely.
              </p>
            </div>

            {!localToken ? (
              <div className="space-y-3.5 w-full">
                <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-850 space-y-4 text-center">
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-zinc-200">Gmail Integration Not Connected</p>
                    <p className="text-[11px] text-zinc-500 leading-normal max-w-sm mx-auto">
                      Sign in with your Google Workspace account to securely send the generated proposal PDF attachment directly to <span className="text-blue-400 font-semibold">{clientEmail}</span>.
                    </p>
                  </div>
                  
                    <button
                      onClick={async () => {
                        if (isAuthenticating) return;
                        try {
                          setIsAuthenticating(true);
                          setGmailAuthError(null);
                          const result = await googleSignIn();
                          if (result) {
                            setLocalToken(result.accessToken);
                            triggerNotification('Connected to Google Account successfully!', 'success');
                          }
                        } catch (err: any) {
                          const isPopupClosed = err?.message?.includes('popup-closed-by-user') || err?.code?.includes('popup-closed-by-user') || String(err).includes('popup-closed-by-user') ||
                                                err?.message?.includes('cancelled-popup-request') || err?.code?.includes('cancelled-popup-request') || String(err).includes('cancelled-popup-request');
                          if (isPopupClosed) {
                            console.warn('Google authorization was closed or blocked by the user.');
                          } else {
                            console.error('Google authorization failed:', err);
                          }
                          const isUnauthorizedDomain = err?.message?.includes('unauthorized-domain') || err?.code?.includes('unauthorized-domain') || String(err).includes('unauthorized-domain');
                          if (isUnauthorizedDomain) {
                            setGmailAuthError('unauthorized-domain');
                            triggerNotification('Domain not authorized in Firebase.', 'error');
                          } else if (isPopupClosed) {
                            setGmailAuthError('popup-blocked');
                            triggerNotification('Sign-in popup blocked or closed.', 'error');
                          } else {
                            setGmailAuthError('generic');
                            triggerNotification('Failed to authorize Google Account.', 'error');
                          }
                        } finally {
                          setIsAuthenticating(false);
                        }
                      }}
                      disabled={isAuthenticating}
                      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mx-auto ${isAuthenticating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isAuthenticating ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 48 48">
                          <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
                          <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
                          <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
                        </svg>
                      )}
                      <span>{isAuthenticating ? 'Connecting Google...' : 'Connect Google Service'}</span>
                    </button>
                  
                  <div className="border-t border-neutral-850/60 pt-3 text-[10px] text-zinc-500">
                    Or bypass email dispatch and update the project status directly:
                  </div>

                  <button
                    onClick={() => handleSendProposalAndEmail(false)}
                    className="text-xs text-zinc-400 hover:text-white underline font-semibold transition cursor-pointer"
                  >
                    Mark as Sent Offline (Skip Email)
                  </button>
                </div>

                {gmailAuthError && (
                  <div className="p-3.5 bg-neutral-950 border border-neutral-850 rounded-xl text-left space-y-2">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-[10px] font-mono tracking-wider">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      {gmailAuthError === 'unauthorized-domain' 
                        ? 'DOMAIN AUTHORIZATION REQUIRED' 
                        : gmailAuthError === 'popup-blocked'
                        ? 'SIGN-IN POPUP BLOCKED'
                        : 'SIGN-IN FAILED'}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {gmailAuthError === 'unauthorized-domain' ? (
                        <>
                          This domain (<code className="text-white font-mono bg-neutral-900 px-1 py-0.5 rounded">{window.location.hostname}</code>) is not whitelisted in your Firebase console. 
                          <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-1">
                            Open Console <ExternalLink className="w-2.5 h-2.5" />
                          </a> and add it under <strong className="text-zinc-300">Build &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.
                        </>
                      ) : gmailAuthError === 'popup-blocked' ? (
                        'Your browser blocked the Google Sign-In popup window. Please allow popups or open the app in a new standalone tab.'
                      ) : (
                        'Google authorization failed. Please check your network and Firebase configuration.'
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">To (Client Email)</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="client@email.com"
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Email Subject</label>
                      <input
                        type="text"
                        value={gmailSubject}
                        onChange={(e) => setGmailSubject(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Intro Message Body</label>
                    <textarea
                      value={gmailMessage}
                      onChange={(e) => setGmailMessage(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-neutral-900/40 p-2 rounded-lg border border-neutral-850 text-[11px] text-zinc-400">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>Attached Document: <strong className="text-zinc-300">Proposal_{proposalNo}.pdf</strong> (Auto-generated from specifications)</span>
                  </div>
                </div>

                {gmailError && (
                  <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-red-400 font-mono text-[11px] leading-relaxed break-words">
                    Error: {renderErrorWithLinks(gmailError)}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => handleSendProposalAndEmail(true)}
                    disabled={isSendingGmail}
                    className="flex-grow py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> 
                    {isSendingGmail ? 'Sending Email...' : 'Send Proposal & Email'}
                  </button>
                  <button
                    onClick={() => handleSendProposalAndEmail(false)}
                    disabled={isSendingGmail}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-xs text-zinc-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    Mark as Sent Out (Offline)
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* OFFLINE FALLBACK AUTO-CORRECT MODAL */}
      {showOfflineFallbackModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-md p-6 relative text-left shadow-2xl space-y-4"
          >
            <button
              onClick={() => setShowOfflineFallbackModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-widest">
                Offline Auto-Correct Fallback
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Google Maps Platform returned an API key or billing error. To proceed immediately, we can clean, format, and capitalize your address locally.
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2 text-xs">
              <div className="text-zinc-500">Current Input:</div>
              <div className="text-zinc-350 font-mono break-all font-semibold">{clientAddress}</div>
              <div className="text-zinc-500 mt-2">Will be formatted to:</div>
              <div className="text-emerald-400 font-mono break-all font-bold">
                {formatAddressLocally(clientAddress) || '(Empty address)'}
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleApplyOfflineFallback}
                className="flex-grow py-2.5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Apply Smart Formatting
              </button>
              <button
                onClick={() => setShowOfflineFallbackModal(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-xs text-zinc-300 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* STRIPE CONFIGURATION HELP MODAL */}
      {showStripeConfigModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-md p-6 relative text-left shadow-2xl space-y-4"
          >
            <button
              onClick={() => {
                setShowStripeConfigModal(false);
                setStripeError(null);
              }}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-widest">
                Stripe API Key Setup Required
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stripe integration is fully coded and ready! To send real bills and invoices to <span className="text-blue-400 font-semibold">{clientEmail}</span>, you need to add your Stripe Secret API Key from your Stripe Dashboard to AI Studio.
              </p>
            </div>

            {stripeError && (
              <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-red-400 font-mono text-[10px] break-words">
                Status: {stripeError}
              </div>
            )}

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3 text-[11px] font-mono leading-relaxed text-zinc-300">
              <p>
                <strong className="text-amber-400">Step 1:</strong> Find your Stripe Secret Key (starts with <code className="bg-neutral-900 text-white px-1">sk_test_</code> or <code className="bg-neutral-900 text-white px-1">sk_live_</code>):<br />
                <a 
                  href="https://dashboard.stripe.com/test/apikeys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline break-all"
                >
                  https://dashboard.stripe.com/test/apikeys
                </a>
              </p>
              <p>
                <strong className="text-amber-400">Step 2:</strong> Save it inside AI Studio Secrets:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                <li>Open <strong className="text-zinc-200">Settings</strong> (⚙️ gear icon in top-right corner)</li>
                <li>Go to <strong className="text-zinc-200">Secrets</strong></li>
                <li>Add a secret named <code className="bg-neutral-900 px-1 py-0.5 rounded text-white font-black font-mono">STRIPE_SECRET_KEY</code></li>
                <li>Paste your secret key and save</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setShowStripeConfigModal(false);
                setStripeError(null);
              }}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              Close instructions
            </button>
          </motion.div>
        </div>
      )}

      {/* CUSTOMIZABLE PERCENTAGE INVOICE DISPATCH POPUP / MODAL */}
      {showCustomInvoiceModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-lg p-6 relative text-left shadow-2xl space-y-5"
          >
            <button
              onClick={() => setShowCustomInvoiceModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                  Configure Installment Invoice
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Billed against Grand Total of ${liveSummary.total.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Invoice Name / Label</label>
                <input
                  type="text"
                  value={customInvoiceName}
                  onChange={(e) => setCustomInvoiceName(e.target.value)}
                  placeholder="e.g. Upfront Deposit, Milestone 1, Final Bill"
                  className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Quick Percentage Presets</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[20, 30, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setCustomInvoicePercent(pct);
                        const amt = Math.round(liveSummary.total * (pct / 100));
                        setCustomInvoiceAmount(amt);
                        let name = `${pct}% Installment`;
                        if (pct === 30) name = "Upfront Deposit (30%)";
                        if (pct === 100) name = "Full Amount Payment (100%)";
                        setCustomInvoiceName(name);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition border cursor-pointer text-center ${
                        customInvoicePercent === pct
                          ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                          : 'bg-neutral-950 border-neutral-850 hover:bg-neutral-850 text-zinc-400'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Percent & Amount inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Invoice Percentage (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customInvoicePercent}
                      onChange={(e) => handleCustomInvoicePercentChange(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white outline-none font-mono pr-8"
                    />
                    <span className="absolute right-3.5 top-2.5 text-zinc-500 font-mono font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Invoice Dollar Amount ($)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-zinc-500 font-mono font-bold">$</span>
                    <input
                      type="number"
                      value={customInvoiceAmount}
                      onChange={(e) => handleCustomInvoiceAmountChange(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2.5 pl-8 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Scope/Room Specifications breakdown display */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850/70 space-y-1.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono block">
                  Configured Room Specifications Preview:
                </span>
                <div className="text-[10px] font-mono text-zinc-400 leading-relaxed max-h-[100px] overflow-y-auto whitespace-pre-wrap pr-1">
                  {getRoomsBreakdownText()}
                </div>
                <p className="text-[9px] text-zinc-600 italic">
                  Note: The room specifications will automatically be appended to this Stripe invoice and sent to the client.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowCustomInvoiceModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-xs text-zinc-300 font-bold rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleDispatchCustomInvoice}
                disabled={isSendingStripe}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSendingStripe ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Invoice...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Dispatch via Stripe
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SEND PAYMENT REQUEST DIALOG */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-lg p-6 relative text-left shadow-2xl space-y-5"
          >
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                  Send Payment Request
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Dispatch a professional payment milestone request to your client via Gmail.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Recipient</span>
                  <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl text-zinc-300 font-mono truncate">
                    {clientEmail || 'client@email.com'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Status</span>
                  <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl text-amber-500 font-mono font-bold">
                    Draft Milestone Request
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Email Subject</label>
                <input
                  type="text"
                  value={requestSubject}
                  onChange={(e) => setRequestSubject(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Email Message Body</label>
                <textarea
                  rows={8}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none font-sans whitespace-pre-wrap leading-relaxed"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-xs text-zinc-300 font-bold rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleDispatchPaymentRequest}
                disabled={isSendingRequest}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSendingRequest ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" /> Dispatch via Gmail
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* RECORD PAYMENT & SEND RECEIPT DIALOG WITH INSTALLMENTS OVERRIDE */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-[#2d2d2d] rounded-2xl w-full max-w-2xl p-6 relative text-left shadow-2xl my-8 space-y-5"
          >
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                  Record Payment & Send Receipt
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Record payments, override or customize installment milestones in unison, and email an official receipt.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: OVERRIDE INSTALLMENTS (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest font-mono">
                      Customizable Installments Schedule
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Total: ${liveSummary.total.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {receiptInstallments.map((inst, index) => {
                      const isPaid = inst.status === 'Paid';
                      return (
                        <div 
                          key={inst.id || index} 
                          className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                            isPaid ? 'bg-emerald-950/15 border-emerald-500/25' : 'bg-neutral-950 border-neutral-850'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {/* Left: Checkbox to toggle Paid status */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={isPaid}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updated = receiptInstallments.map((item, idx) => {
                                    if (idx === index) {
                                      return {
                                        ...item,
                                        status: (checked ? 'Paid' : 'Requested') as any,
                                        paidAt: checked ? new Date().toLocaleDateString() : undefined,
                                        requestedAt: item.requestedAt || new Date().toLocaleDateString()
                                      };
                                    }
                                    return item;
                                  });
                                  setReceiptInstallments(updated);
                                  updateReceiptBodyWithInstallments(updated);
                                }}
                                className="w-4 h-4 rounded text-emerald-500 border-neutral-800 bg-neutral-900 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-bold font-mono text-zinc-300">
                                {isPaid ? '✓ Marked Paid' : 'Pending Payment'}
                              </span>
                            </label>

                            {/* Right: delete button */}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = receiptInstallments.filter((_, idx) => idx !== index);
                                setReceiptInstallments(updated);
                                updateReceiptBodyWithInstallments(updated);
                              }}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-neutral-900 transition cursor-pointer"
                              title="Delete installment row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Inputs: Name, Percent, Amount */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono">Installment Name</span>
                              <input 
                                type="text"
                                value={inst.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = receiptInstallments.map((item, idx) => {
                                    if (idx === index) {
                                      return { ...item, name: val };
                                    }
                                    return item;
                                  });
                                  setReceiptInstallments(updated);
                                  updateReceiptBodyWithInstallments(updated);
                                }}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono">Percent (%)</span>
                              <input 
                                type="number"
                                value={inst.percentage}
                                onChange={(e) => {
                                  const pct = Number(e.target.value);
                                  const amt = Math.round(liveSummary.total * (pct / 100));
                                  const updated = receiptInstallments.map((item, idx) => {
                                    if (idx === index) {
                                      return { ...item, percentage: pct, amount: amt };
                                    }
                                    return item;
                                  });
                                  setReceiptInstallments(updated);
                                  updateReceiptBodyWithInstallments(updated);
                                }}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono">Amount ($)</span>
                              <input 
                                type="number"
                                value={inst.amount}
                                onChange={(e) => {
                                  const amt = Number(e.target.value);
                                  const pct = liveSummary.total > 0 ? Math.round((amt / liveSummary.total) * 100) : 0;
                                  const updated = receiptInstallments.map((item, idx) => {
                                    if (idx === index) {
                                      return { ...item, percentage: pct, amount: amt };
                                    }
                                    return item;
                                  });
                                  setReceiptInstallments(updated);
                                  updateReceiptBodyWithInstallments(updated);
                                }}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const remainingPct = 100 - receiptInstallments.reduce((sum, i) => sum + i.percentage, 0);
                      const nextPct = remainingPct > 0 ? remainingPct : 10;
                      const nextAmt = Math.round(liveSummary.total * (nextPct / 100));
                      
                      const newInst = {
                        id: `inst-${Date.now()}`,
                        name: `Milestone Payment (${nextPct}%)`,
                        percentage: nextPct,
                        amount: nextAmt,
                        status: 'Requested' as const,
                        requestedAt: new Date().toLocaleDateString()
                      };

                      const updated = [...receiptInstallments, newInst];
                      setReceiptInstallments(updated);
                      updateReceiptBodyWithInstallments(updated);
                    }}
                    className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 border border-dashed border-neutral-800 text-zinc-400 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Installment Row
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Payment Method</span>
                    <select
                      value={receiptPaymentMethod}
                      onChange={(e) => setReceiptPaymentMethod(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-2.5 text-xs text-white outline-none"
                    >
                      <option value="Stripe">Stripe (Online Card)</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check / Draft</option>
                      <option value="Bank Transfer">Bank Transfer / EFT</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Recipient Email</span>
                    <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl text-zinc-300 font-mono truncate">
                      {clientEmail || 'client@email.com'}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: GMAIL DISPATCH PREVIEW (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Email Subject</label>
                  <input
                    type="text"
                    value={receiptSubject}
                    onChange={(e) => setReceiptSubject(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Email Message Body</label>
                  <textarea
                    rows={11}
                    value={receiptMessage}
                    onChange={(e) => setReceiptMessage(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none font-sans whitespace-pre-wrap leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-xs text-zinc-300 font-bold rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleDispatchReceiptAndRecordPayment}
                disabled={isSendingReceipt}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/40 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSendingReceipt ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving & Sending...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Record & Send Receipt
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* UNIFIED DESKTOP & MOBILE STICKY BOTTOM LIVE PRICE & SELECTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-neutral-850 p-4 shadow-2xl safe-bottom transition-all duration-300 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left Panel: Pricing or Selection Stats, and the Select Toggle */}
          <div className="flex items-center gap-4 justify-between md:justify-start">
            {!selectMode ? (
              <div className="flex items-center gap-4 text-left">
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Live Proposal Price</span>
                  <span className="text-xl font-black text-white font-mono mt-0.5">
                    ${liveSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="h-7 w-[1px] bg-neutral-850" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider font-mono">Paid to Date</span>
                      <span className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                        ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-7 w-[1px] bg-neutral-850" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider font-mono">Remaining Balance</span>
                      <span className="text-base font-bold text-amber-400 font-mono mt-0.5">
                        ${remainingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider font-mono">Bulk Selection Active</span>
                  <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5">
                    {(() => {
                      const roomsCount = Object.values(selectedRoomIds).filter(Boolean).length;
                      const areasCount = Object.values(selectedAreas).filter(Boolean).length;
                      if (roomsCount === 0 && areasCount === 0) return 'Nothing selected';
                      const parts = [];
                      if (roomsCount > 0) parts.push(`${roomsCount} room${roomsCount > 1 ? 's' : ''}`);
                      if (areasCount > 0) parts.push(`${areasCount} layer${areasCount > 1 ? 's' : ''}`);
                      return parts.join(' & ');
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Select Toggle Button */}
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) {
                  setSelectedRoomIds({});
                  setSelectedAreas({});
                }
              }}
              className={`px-3.5 py-2 rounded-xl border text-[11px] font-bold font-mono transition flex items-center gap-1.5 cursor-pointer select-none shrink-0 ${
                selectMode
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:bg-blue-500'
                  : 'bg-neutral-900 border-neutral-800 text-zinc-400 hover:text-white hover:border-neutral-700'
              }`}
              title="Toggle selection mode for rooms and individual layers"
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span>{selectMode ? 'Select On' : 'Select'}</span>
            </button>
          </div>

          {/* Right Panel: Actions or Bulk Options */}
          <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible py-1 md:py-0 scrollbar-none select-none">
            {!selectMode ? (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handleSave()}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-white font-bold font-mono text-[11px] px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4.5 h-4.5 text-zinc-400" />
                  Save
                </button>
                {btnConfig && (
                  <button
                    onClick={btnConfig.onClick}
                    className={`${btnConfig.className} font-bold font-mono text-[11px] px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5`}
                  >
                    {btnConfig.label}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={handleBulkDuplicate}
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 text-zinc-300 hover:text-white font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Duplicate selected rooms/areas"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkToggleOption}
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 text-zinc-300 hover:text-white font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Toggle option state for selected items"
                >
                  <Diamond className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Toggle Option</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selectedIds = Object.keys(selectedRoomIds).filter(id => selectedRoomIds[id]);
                    if (selectedIds.length === 0) {
                      triggerNotification('Please select at least one room to group.', 'error');
                      return;
                    }
                    const heading = window.prompt('Enter group heading (e.g. "Main Floor", "Master Suite", "Exterior Work"):');
                    if (heading && heading.trim()) {
                      handleGroupSelectedRooms(heading.trim());
                    }
                  }}
                  className="px-3 py-2 bg-blue-900/60 hover:bg-blue-800 border border-blue-700/80 text-blue-200 hover:text-white font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Group selected rooms together under a heading"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Group Rooms</span>
                </button>

                {/* Bulk Set Ceiling Height dropdown */}
                <div className="relative">
                  <select
                    onChange={(e) => {
                      const h = parseFloat(e.target.value);
                      if (h > 0) handleBulkSetCeilingHeight(h);
                      e.target.value = "";
                    }}
                    className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 text-zinc-300 hover:text-white rounded-xl px-2.5 py-2 outline-none cursor-pointer text-[10px] font-bold"
                  >
                    <option value="">Set Height...</option>
                    <option value="8">8 ft</option>
                    <option value="9">9 ft</option>
                    <option value="10">10 ft</option>
                    <option value="12">12 ft</option>
                  </select>
                </div>

                {/* Bulk Set Coats dropdown */}
                <div className="relative">
                  <select
                    onChange={(e) => {
                      const coats = parseInt(e.target.value, 10);
                      if (coats > 0) handleBulkSetCoats(coats);
                      e.target.value = "";
                    }}
                    className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 text-zinc-300 hover:text-white rounded-xl px-2.5 py-2 outline-none cursor-pointer text-[10px] font-bold"
                  >
                    <option value="">Set Coats...</option>
                    <option value="1">1 Coat</option>
                    <option value="2">2 Coats</option>
                    <option value="3">3 Coats</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-2 bg-red-950/20 hover:bg-red-900/30 border border-red-950/40 text-red-400 hover:text-red-300 font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Delete/Remove selected items"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomIds({});
                    setSelectedAreas({});
                  }}
                  className="px-2.5 py-2 text-zinc-500 hover:text-zinc-300 font-semibold transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
    
    {/* PRESET & CUSTOM AREA SELECTOR MODAL */}
    {addingAreaRoomId && (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 relative shadow-2xl flex flex-col gap-6 animate-fade-in max-h-[90vh] overflow-y-auto text-left">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Add Area Layer
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Select a preset or create a custom area layer for {rooms.find(r => r.id === addingAreaRoomId)?.name || 'this room'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddingAreaRoomId(null)}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Options */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">
              Popular Presets
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(() => {
                const activeRoom = rooms.find(r => r.id === addingAreaRoomId);
                const cat = activeRoom?.category || 'interior';
                const customPresets = (proposalSettings.areaPresets || DEFAULT_PROPOSAL_SETTINGS.areaPresets || []).filter((ap: any) => ap.category ? ap.category === cat : true);
                const presets = customPresets.length > 0 ? customPresets : (PRESET_AREAS[cat] || PRESET_AREAS.interior);
                return presets.map((preset, idx) => {
                  const isSelectedInRoom = activeRoom?.customAreas?.some((c: any) => c.label.toLowerCase() === preset.label.toLowerCase());
                  return (
                    <button
                      key={(preset as any).id || `${preset.label}-${idx}`}
                      type="button"
                      disabled={isSelectedInRoom}
                      onClick={() => {
                        if (activeRoom) {
                          handleAddArea(activeRoom, preset.label, preset.calcType, preset.defaultQty, preset.defaultCoats);
                          setAddingAreaRoomId(null);
                        }
                      }}
                      className={`p-3 text-left rounded-xl border transition flex flex-col justify-between h-20 ${
                        isSelectedInRoom
                          ? 'bg-zinc-950/40 border-zinc-850 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-200 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-bold font-sans truncate block w-full">{preset.label}</span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-1 uppercase block">
                        {preset.calcType === 'wall' && 'Wall-like (SqFt)'}
                        {preset.calcType === 'ceiling' && 'Ceiling-like (SqFt)'}
                        {preset.calcType === 'perimeter' && 'Trim-like (Linear)'}
                        {preset.calcType === 'item' && `Item-like (Qty: ${preset.defaultQty})`}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Custom Input */}
          <div className="border-t border-zinc-800 pt-5 space-y-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block">
              Or Create Custom Area
            </span>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block mb-1.5">
                    Area Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accent Column, Cabinet Trim..."
                    id="custom-modal-name"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const btn = document.getElementById('custom-modal-add-btn');
                        if (btn) btn.click();
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-mono tracking-wider block mb-1.5">
                    Calculation Method
                  </label>
                  <select
                    id="custom-modal-calc"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="wall">Wall-like (SqFt)</option>
                    <option value="ceiling">Ceiling-like (SqFt)</option>
                    <option value="perimeter">Trim-like (Linear)</option>
                    <option value="item">Item-like (Qty)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="custom-modal-add-btn"
                  type="button"
                  onClick={() => {
                    const activeRoom = rooms.find(r => r.id === addingAreaRoomId);
                    const nameInput = document.getElementById('custom-modal-name') as HTMLInputElement;
                    const calcSelect = document.getElementById('custom-modal-calc') as HTMLSelectElement;
                    
                    if (activeRoom && nameInput && nameInput.value.trim()) {
                      const label = nameInput.value.trim();
                      const calcType = calcSelect.value as 'wall' | 'ceiling' | 'perimeter' | 'item';
                      handleAddArea(
                        activeRoom,
                        label,
                        calcType,
                        calcType === 'item' ? 1 : 'auto',
                        2
                      );
                      setAddingAreaRoomId(null);
                    } else {
                      triggerNotification('Please enter a valid area name.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-xs rounded-xl transition cursor-pointer select-none"
                >
                  Create Custom Area
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    )}
      {/* GROUP BATCH EDITING MODAL */}
      {editingGroupModalName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-blue-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-white font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-900/50 border border-blue-700/50 rounded-xl text-blue-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Group Batch Manager: <span className="text-blue-400">{editingGroupModalName}</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Applying bulk modifications to all {rooms.filter(r => r.groupName === editingGroupModalName).length} room(s) in this group simultaneously
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingGroupModalName(null)}
                className="p-1.5 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Batch Coat Count controls */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  1. Batch Surface Coats (Set All Rooms)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGroupBatchSetCoats(editingGroupModalName, 1)}
                    className="py-2 bg-neutral-900 hover:bg-blue-950/60 border border-neutral-800 hover:border-blue-500/50 text-zinc-200 hover:text-white font-bold rounded-lg transition text-center cursor-pointer"
                  >
                    Set 1 Coat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGroupBatchSetCoats(editingGroupModalName, 2)}
                    className="py-2 bg-neutral-900 hover:bg-blue-950/60 border border-neutral-800 hover:border-blue-500/50 text-zinc-200 hover:text-white font-bold rounded-lg transition text-center cursor-pointer"
                  >
                    Set 2 Coats
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGroupBatchSetCoats(editingGroupModalName, 3)}
                    className="py-2 bg-neutral-900 hover:bg-blue-950/60 border border-neutral-800 hover:border-blue-500/50 text-zinc-200 hover:text-white font-bold rounded-lg transition text-center cursor-pointer"
                  >
                    Set 3 Coats
                  </button>
                </div>
              </div>

              {/* Batch Task Adder */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  2. Add Task to All Rooms in Group
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={groupBatchTaskInput}
                    onChange={(e) => setGroupBatchTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (groupBatchTaskInput.trim()) {
                          handleGroupBatchAddTask(editingGroupModalName, groupBatchTaskInput.trim());
                        }
                      }
                    }}
                    placeholder="e.g. Scrape flaking paint, Prime drywall repairs..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (groupBatchTaskInput.trim()) {
                        handleGroupBatchAddTask(editingGroupModalName, groupBatchTaskInput.trim());
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>

              {/* Batch Option Status Toggle */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  3. Batch Option Pricing Status
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGroupBatchSetOption(editingGroupModalName, true)}
                    className="py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/50 text-amber-300 font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Diamond className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Mark Group as Option</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGroupBatchSetOption(editingGroupModalName, false)}
                    className="py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-zinc-300 font-bold rounded-lg transition text-center cursor-pointer"
                  >
                    Mark Group as Standard
                  </button>
                </div>
              </div>

              {/* Batch Category Change & Delete Group */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                  4. Category & Group Management
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      id={`group-cat-select-${editingGroupModalName}`}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white cursor-pointer"
                    >
                      <option value="interior">Interior</option>
                      <option value="exterior">Exterior</option>
                      <option value="deck">Deck / Stain</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const sel = document.getElementById(`group-cat-select-${editingGroupModalName}`) as HTMLSelectElement;
                        if (sel) {
                          handleGroupBatchSetCategory(editingGroupModalName, sel.value as any);
                        }
                      }}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-zinc-200 hover:text-white rounded-lg transition font-bold cursor-pointer"
                    >
                      Apply Category
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGroupBatchDelete(editingGroupModalName)}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-300 hover:text-white rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Entire Group</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingGroupModalName(null)}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

    </APIProvider>
  );
}
