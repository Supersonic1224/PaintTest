/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ClientLead, ProjectDetails as ProjectType, RoomSpec, ProjectTask } from './types';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken,
  setAccessToken 
} from './firebase';
import { 
  fetchClientsFromFirestore, 
  fetchProjectsFromFirestore, 
  saveClientToFirestore, 
  saveProjectToFirestore, 
  deleteClientFromFirestore, 
  deleteProjectFromFirestore 
} from './firebaseService';
import { getSupabase } from './supabase';
import {
  fetchClientsFromSupabase,
  fetchProjectsFromSupabase,
  saveClientToSupabase,
  saveProjectToSupabase,
  deleteClientFromSupabase,
  deleteProjectFromSupabase,
  checkIsAuthorized
} from './supabaseService';

import Dashboard from './components/Dashboard';
import LeadForm from './components/LeadForm';
import ProjectDetails from './components/ProjectDetails';
import ProposalsList from './components/ProposalsList';
import InvoicesList from './components/InvoicesList';
import WorkOrdersList from './components/WorkOrdersList';
import SettingsPanel from './components/SettingsPanel';
import AdminPortal from './components/AdminPortal';
import { motion, AnimatePresence } from 'motion/react';

import { 
  Paintbrush, 
  Users, 
  FileText, 
  FolderIcon, 
  LogOut, 
  Plus, 
  FolderSync, 
  Laptop, 
  UserCheck,
  ChevronRight,
  Info,
  Layers,
  Calculator,
  Menu,
  X,
  Home,
  DollarSign,
  CheckSquare,
  Settings,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';

// --- SEED SEED DATA FOR DEMO / LOCAL MODE ---
const DEMO_CLIENTS: ClientLead[] = [
  {
    id: 'client-ali',
    name: 'Ali Al-Nasih',
    email: 'ali@al-nasih.com',
    phone: '(416) 555-1212',
    address: '45 Overlea Blvd, East York, ON M4H 1C3, Canada',
    status: 'Active',
    notes: 'Soffit & trim coating project. Homeowner accepted the full-service package with weather protection.',
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
  {
    id: 'client-daniel',
    name: 'Daniel Testing',
    email: 'daniel@testing.com',
    phone: '(647) 555-9876',
    address: '—',
    status: 'Lead',
    notes: 'Drafting initial wall quotation parameters for interior repainting.',
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
  }
];

const DEMO_PROJECTS: ProjectType[] = [
  {
    id: '26061501',
    clientId: 'client-daniel',
    title: 'Daniel Testing',
    status: 'Draft',
    description: 'Interior wall painting estimate with standard prep.',
    rooms: [],
    summary: {
      materialCost: 450.00,
      laborCost: 4767.11,
      taxRate: 0.08,
      discount: 0,
      totalPrice: 5634.31
    },
    tasks: [],
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
  },
  {
    id: '26061001',
    clientId: 'client-ali',
    title: 'Ali Al-Nasih',
    status: 'Approved', // maps to ACCEPTED
    description: 'Full exterior painting and siding weather sealing service.',
    rooms: [
      {
        id: 'r-ali-1',
        name: 'Main Brick Accent Walls',
        length: 30,
        width: 25,
        height: 10,
        wallsArea: 1100,
        ceilingArea: 750,
        paints: [
          {
            surface: 'walls',
            brand: 'Sherwin-Williams',
            colorName: 'SuperPaint Acrylic Latex',
            colorCode: 'SW 7015',
            hex: '#1e3a8a',
            finish: 'Satin',
            coats: 2,
            gallonsNeeded: 5
          }
        ]
      }
    ],
    summary: {
      materialCost: 520.50,
      laborCost: 5365.187,
      taxRate: 0.08,
      discount: 0,
      totalPrice: 6359.687
    },
    tasks: [
      { id: 't1', text: 'Powerwash and strip peeling exterior paint layers', completed: true },
      { id: 't2', text: 'Apply dark waterproof breathable weather sealant coat', completed: true },
      { id: 't3', text: 'Soffit and trim detail brush painting layers', completed: true }
    ],
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  }
];

const STANDARD_CHECKLIST: ProjectTask[] = [
  { id: 't1', text: 'Verify color chips against physical wall in daylight', completed: false },
  { id: 't2', text: 'Prep work: patch drywall dents, sand smooth, and prime raw mud', completed: false },
  { id: 't3', text: 'Protect belongings: apply heavy duty plastic drop cloths', completed: false },
  { id: 't4', text: 'Apply color coat 1 with roller, maintain dry-edge lines', completed: false },
  { id: 't5', text: 'Apply color coat 2 once dry for premium color depth', completed: false },
  { id: 't6', text: 'Paint trim, windows, baseboards, and window stool casings', completed: false },
  { id: 't7', text: 'Clean-up site, remove tape, vacuum dust, and present job', completed: false }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // App navigation state: 'dashboard' | 'proposals' | 'invoices' | 'work-orders' | 'settings' | 'clients' | 'edit-client' | 'project-details' | 'quick-calc'
  const [currentView, setCurrentView] = useState<'dashboard' | 'proposals' | 'invoices' | 'work-orders' | 'settings' | 'clients' | 'edit-client' | 'project-details' | 'quick-calc' | 'admin-portal'>('dashboard');
  
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authErrorModalOpen, setAuthErrorModalOpen] = useState(false);
  const [authErrorCode, setAuthErrorCode] = useState<'popup-blocked' | 'generic' | null>(null);

  // Active storage synced provider state: 'firestore' | 'supabase'
  const [dbProvider, setDbProvider] = useState<'firestore' | 'supabase'>(() => {
    return (localStorage.getItem('painter_crm_provider') as 'firestore' | 'supabase') || 'firestore';
  });

  // App core database state
  const [clients, setClients] = useState<ClientLead[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  
  // Focus selection variables
  const [selectedClient, setSelectedClient] = useState<ClientLead | undefined>(undefined);
  const [selectedProject, setSelectedProject] = useState<ProjectType | undefined>(undefined);

  // Standalone instant calculator variables
  const [calcLength, setCalcLength] = useState(14);
  const [calcWidth, setCalcWidth] = useState(12);
  const [calcHeight, setCalcHeight] = useState(9);
  const [calcPricePerGal, setCalcPricePerGal] = useState(55);
  const [calcLaborRate, setCalcLaborRate] = useState(2.25);
  const [calcCoats, setCalcCoats] = useState(2);

  // Supabase Auth states
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [isSupabaseAuthorized, setIsSupabaseAuthorized] = useState<boolean>(false);
  const [loadingAuthorized, setLoadingAuthorized] = useState<boolean>(false);

  const getAnonId = (): string => {
    let id = localStorage.getItem('painter_crm_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('painter_crm_anon_id', id);
    }
    return id;
  };

  const getActiveUid = (): string => {
    if (dbProvider === 'supabase') {
      return supabaseUser?.id || getAnonId();
    }
    return currentUser?.uid || getAnonId();
  };

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Load initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        setLoadingAuthorized(true);
        const authStatus = await checkIsAuthorized();
        setIsSupabaseAuthorized(authStatus);
        setLoadingAuthorized(false);
      } else {
        setIsSupabaseAuthorized(false);
      }
    });

    // Subscribe to auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        setLoadingAuthorized(true);
        const authStatus = await checkIsAuthorized();
        setIsSupabaseAuthorized(authStatus);
        setLoadingAuthorized(false);
      } else {
        setIsSupabaseAuthorized(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dbProvider]);

  // Load Auth Status and Sync Database on boot
  useEffect(() => {
    initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setDriveToken(token);
        setNeedsAuth(false);
        setIsDemoMode(false);
        await syncUserData(user.uid);
      },
      async () => {
        // If not authenticated, we can default to demo/anonymous mode or wait for action
        setNeedsAuth(true);
        const storedProvider = (localStorage.getItem('painter_crm_provider') as 'firestore' | 'supabase') || 'firestore';
        if (storedProvider === 'supabase' && getSupabase()) {
          setIsDemoMode(false);
          await syncUserData(getActiveUid(), 'supabase');
        } else {
          loadDemoSeedData();
        }
      }
    );
  }, [supabaseUser]);

  const loadDemoSeedData = () => {
    // Read local storage or default to seed data
    const localClients = localStorage.getItem('painter_crm_clients');
    const localProjects = localStorage.getItem('painter_crm_projects');
    
    if (localClients && localProjects) {
      setClients(JSON.parse(localClients));
      setProjects(JSON.parse(localProjects));
    } else {
      setClients(DEMO_CLIENTS);
      setProjects(DEMO_PROJECTS);
      localStorage.setItem('painter_crm_clients', JSON.stringify(DEMO_CLIENTS));
      localStorage.setItem('painter_crm_projects', JSON.stringify(DEMO_PROJECTS));
    }
    setIsDemoMode(true);
  };

  const syncUserData = async (userId: string, providerOverride?: 'firestore' | 'supabase') => {
    const activeProvider = providerOverride || dbProvider;
    setLoading(true);
    try {
      if (activeProvider === 'supabase' && getSupabase()) {
        const cList = await fetchClientsFromSupabase(userId);
        const pList = await fetchProjectsFromSupabase(userId);
        setClients(cList);
        setProjects(pList);
      } else {
        const cList = await fetchClientsFromFirestore(userId);
        const pList = await fetchProjectsFromFirestore(userId);
        setClients(cList);
        setProjects(pList);
      }
    } catch (err) {
      console.error(`Error syncing ${activeProvider} user database:`, err);
      if (activeProvider === 'supabase') {
        // Clear tables if there are permissions or RLS blocks to prevent stale data visibility
        setClients([]);
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDbProvider = async (provider: 'firestore' | 'supabase') => {
    setDbProvider(provider);
    localStorage.setItem('painter_crm_provider', provider);
    
    if (provider === 'supabase' && getSupabase()) {
      setIsDemoMode(false);
      const activeUid = supabaseUser?.id || getAnonId();
      await syncUserData(activeUid, 'supabase');
    } else if (currentUser) {
      setIsDemoMode(false);
      await syncUserData(currentUser.uid, provider);
    } else {
      setIsDemoMode(true);
      loadDemoSeedData();
    }
  };

  const handleImportBackup = async (importedClients: ClientLead[], importedProjects: ProjectType[]) => {
    setClients(importedClients);
    setProjects(importedProjects);
    localStorage.setItem('painter_crm_clients', JSON.stringify(importedClients));
    localStorage.setItem('painter_crm_projects', JSON.stringify(importedProjects));
  };

  const handlePushToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const activeUid = getActiveUid();
    const supabase = getSupabase();
    if (!supabase || !supabaseUser) {
      return { success: false, message: 'You must be logged into a configured Supabase account to push data.' };
    }
    
    setLoading(true);
    try {
      let clientsPushed = 0;
      let projectsPushed = 0;
      
      for (const client of clients) {
        await saveClientToSupabase(activeUid, client);
        clientsPushed++;
      }
      for (const project of projects) {
        await saveProjectToSupabase(activeUid, project);
        projectsPushed++;
      }
      
      // Refresh list to verify successful push
      const cList = await fetchClientsFromSupabase(activeUid);
      const pList = await fetchProjectsFromSupabase(activeUid);
      setClients(cList);
      setProjects(pList);
      
      return { 
        success: true, 
        message: `Successfully uploaded and synced all data to your Supabase server! (${clientsPushed} clients, ${projectsPushed} projects loaded).`
      };
    } catch (err: any) {
      console.error('Failed to push data to Supabase:', err);
      return { 
        success: false, 
        message: `Database synchronization failed: ${err.message || err}. Please ensure your SQL setup script has been executed to create the required tables and permissions.` 
      };
    } finally {
      setLoading(false);
    }
  };


  // Google Sign-In Trigger
  const handleSignIn = async () => {
    setLoading(true);
    setAuthErrorCode(null);
    setAuthErrorModalOpen(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setDriveToken(result.accessToken);
        setNeedsAuth(false);
        setIsDemoMode(false);
        await syncUserData(result.user.uid);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const isPopupClosed = err?.message?.includes('popup-closed-by-user') || err?.code?.includes('popup-closed-by-user') || String(err).includes('popup-closed-by-user');
      if (isPopupClosed) {
        setAuthErrorCode('popup-blocked');
      } else {
        setAuthErrorCode('generic');
      }
      setAuthErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-Out Trigger
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await googleSignOut();
      setAccessToken(null);
      setCurrentUser(null);
      setDriveToken(null);
      setNeedsAuth(true);
      loadDemoSeedData();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save/Update Client lead profile & unified Proposal creation
  const handleSaveClient = async (
    leadData: Omit<ClientLead, 'id' | 'createdAt' | 'updatedAt'>,
    projectTitle: string,
    projectNotes: string
  ) => {
    const isEdit = selectedClient !== undefined;
    const clientDetails: ClientLead = isEdit 
      ? {
          ...selectedClient!,
          ...leadData,
          updatedAt: new Date().toISOString(),
        }
      : {
          ...leadData,
          id: 'client-' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    // Update in-memory state
    const updatedClients = isEdit
      ? clients.map(c => c.id === clientDetails.id ? clientDetails : c)
      : [...clients, clientDetails];
    
    setClients(updatedClients);

    // Persist as per active user state
    if (dbProvider === 'supabase' && getSupabase()) {
      const activeUid = getActiveUid();
      await saveClientToSupabase(activeUid, clientDetails);
    } else if (!isDemoMode && currentUser) {
      await saveClientToFirestore(currentUser.uid, clientDetails);
    } else {
      localStorage.setItem('painter_crm_clients', JSON.stringify(updatedClients));
    }

    // If it is a new client + estimate registration, automatically synthesize a new project
    if (!isEdit) {
      const projId = 'project-' + Math.random().toString(36).substr(2, 9);
      const newProj: ProjectType = {
        id: projId,
        clientId: clientDetails.id,
        title: projectTitle || ('Interior Painting - ' + clientDetails.name),
        status: 'Draft',
        description: projectNotes || 'Custom interior residential walls, ceiling and details prep.',
        rooms: [], // Fresh new proposal with no configured rooms as requested!
        summary: {
          materialCost: 0,
          laborCost: 0,
          taxRate: 0.13,
          discount: 0,
          totalPrice: 0,
        },
        tasks: STANDARD_CHECKLIST.map(t => ({ ...t, id: Math.random().toString(36).substr(2, 6) })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProjects = [...projects, newProj];
      setProjects(updatedProjects);

      if (dbProvider === 'supabase' && getSupabase()) {
        const activeUid = getActiveUid();
        await saveProjectToSupabase(activeUid, newProj);
      } else if (!isDemoMode && currentUser) {
        await saveProjectToFirestore(currentUser.uid, newProj);
      } else {
        localStorage.setItem('painter_crm_projects', JSON.stringify(updatedProjects));
      }

      setSelectedProject(newProj);
      setCurrentView('project-details');
    } else {
      setCurrentView('dashboard');
    }

    setSelectedClient(undefined);
  };

  // Save/Update client record directly from the active project sheet
  const handleSaveClientDirect = async (updatedClient: ClientLead) => {
    const updatedClients = clients.find(c => c.id === updatedClient.id)
      ? clients.map(c => c.id === updatedClient.id ? updatedClient : c)
      : [...clients, updatedClient];

    setClients(updatedClients);

    if (dbProvider === 'supabase' && getSupabase()) {
      const activeUid = getActiveUid();
      await saveClientToSupabase(activeUid, updatedClient);
    } else if (!isDemoMode && currentUser) {
      await saveClientToFirestore(currentUser.uid, updatedClient);
    } else {
      localStorage.setItem('painter_crm_clients', JSON.stringify(updatedClients));
    }
  };

  // Save/Update project estimate spreadsheet
  const handleSaveProject = async (updatedProject: ProjectType) => {
    const updatedProjects = projects.find(p => p.id === updatedProject.id)
      ? projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      : [...projects, updatedProject];

    setProjects(updatedProjects);

    // Save to active cloud database provider
    if (dbProvider === 'supabase' && getSupabase()) {
      const activeUid = getActiveUid();
      await saveProjectToSupabase(activeUid, updatedProject);
    } else if (!isDemoMode && currentUser) {
      await saveProjectToFirestore(currentUser.uid, updatedProject);
    } else {
      localStorage.setItem('painter_crm_projects', JSON.stringify(updatedProjects));
    }

    setSelectedProject(updatedProject);
  };

  // Delete project quote proposal
  const handleDeleteProject = async (projectId: string) => {
    const updated = projects.filter(p => p.id !== projectId);
    setProjects(updated);
    
    if (dbProvider === 'supabase' && getSupabase()) {
      await deleteProjectFromSupabase(projectId);
    } else if (!isDemoMode && currentUser) {
      await deleteProjectFromFirestore(projectId);
    } else {
      localStorage.setItem('painter_crm_projects', JSON.stringify(updated));
    }

    setCurrentView('dashboard');
    setSelectedProject(undefined);
  };

  // Launch fresh project builder for a client
  const handleCreateProjectForClient = async (clientId: string) => {
    const clientName = clients.find(c => c.id === clientId)?.name || 'New Paint Project';
    const newProj: ProjectType = {
      id: 'project-' + Math.random().toString(36).substr(2, 9),
      clientId,
      title: 'Interior Painting - ' + clientName,
      status: 'Draft',
      description: 'Custom interior residential walls, ceiling and details prep.',
      rooms: [],
      summary: {
        materialCost: 0,
        laborCost: 0,
        taxRate: 0.08,
        discount: 0,
        totalPrice: 0,
      },
      tasks: STANDARD_CHECKLIST.map(t => ({ ...t, id: Math.random().toString(2).substr(2, 5) })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedProjects = [...projects, newProj];
    setProjects(updatedProjects);

    if (dbProvider === 'supabase' && getSupabase()) {
      const activeUid = getActiveUid();
      await saveProjectToSupabase(activeUid, newProj);
    } else if (!isDemoMode && currentUser) {
      await saveProjectToFirestore(currentUser.uid, newProj);
    } else {
      localStorage.setItem('painter_crm_projects', JSON.stringify(updatedProjects));
    }

    setSelectedProject(newProj);
    setCurrentView('project-details');
  };

  // Instantly synthesize a fresh new proposal and a new CRM client record linked in one go
  const handleCreateNewProposalImmediately = async () => {
    const newClientId = 'client-' + Math.random().toString(36).substr(2, 9);
    const newClient: ClientLead = {
      id: newClientId,
      name: 'New Client',
      email: '',
      phone: '',
      address: '',
      status: 'Lead',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newProjId = 'PR-' + Math.floor(100000 + Math.random() * 900000);
    const newProj: ProjectType = {
      id: newProjId,
      clientId: newClientId,
      title: 'Interior Painting - New Client',
      status: 'Draft',
      description: 'Custom interior residential walls, ceiling and details prep.',
      rooms: [], // Empty draft estimate as requested
      summary: {
        materialCost: 0,
        laborCost: 0,
        taxRate: 0.13,
        discount: 0,
        totalPrice: 0,
      },
      tasks: STANDARD_CHECKLIST.map(t => ({ ...t, id: Math.random().toString(36).substr(2, 6) })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedClients = [...clients, newClient];
    const updatedProjects = [...projects, newProj];

    setClients(updatedClients);
    setProjects(updatedProjects);

    if (dbProvider === 'supabase' && getSupabase()) {
      const activeUid = getActiveUid();
      await saveClientToSupabase(activeUid, newClient);
      await saveProjectToSupabase(activeUid, newProj);
    } else if (!isDemoMode && currentUser) {
      await saveClientToFirestore(currentUser.uid, newClient);
      await saveProjectToFirestore(currentUser.uid, newProj);
    } else {
      localStorage.setItem('painter_crm_clients', JSON.stringify(updatedClients));
      localStorage.setItem('painter_crm_projects', JSON.stringify(updatedProjects));
    }

    setSelectedProject(newProj);
    setCurrentView('project-details');
  };

  // Standalone Quick calculation metrics
  const quickCalcMetrics = React.useMemo(() => {
    const wallArea = Math.round(2 * calcHeight * (Number(calcLength) + Number(calcWidth)));
    const ceilingArea = Math.round(Number(calcLength) * Number(calcWidth));
    const totalArea = wallArea + ceilingArea;
    const standardsGallons = parseFloat(((totalArea / 350) * calcCoats).toFixed(1));
    const materialsCost = Math.round(standardsGallons * calcPricePerGal);
    const laborCost = Math.round(totalArea * calcLaborRate);
    const total = Math.round((materialsCost + laborCost) * 1.08); // with tax

    return {
      wallArea,
      ceilingArea,
      totalArea,
      standardsGallons,
      materialsCost,
      laborCost,
      total,
    };
  }, [calcLength, calcWidth, calcHeight, calcPricePerGal, calcLaborRate, calcCoats]);

  const activeEmail = currentUser?.email || 'Demo Painter Local Workspace';

  const viewTitle = {
    'dashboard': 'Home',
    'proposals': 'Proposals',
    'invoices': 'Invoices',
    'work-orders': 'Work Orders',
    'settings': 'Settings',
    'clients': 'Customer Directory',
    'edit-client': selectedClient ? 'Update Client Portfolio' : 'New Client Lead & Proposal',
    'project-details': 'Proposal Estimator Worksheet',
    'quick-calc': 'Instant Drywall & Paint Estimator',
    'admin-portal': 'Team Access & Admin Portal'
  }[currentView];

  return (
    <div className="h-screen w-screen bg-[#121212] font-sans text-zinc-100 flex overflow-hidden relative">
      
      {/* 1. Mobile overlay menu drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className={`fixed inset-0 z-50 flex ${currentView === 'project-details' ? '' : 'md:hidden'}`} id="mobile-menu-drawer">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
            />

            {/* Sidebar content drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-64 max-w-xs bg-[#111111] border-r border-[#222222] flex flex-col h-full shrink-0 select-none z-50 shadow-2xl"
            >
              {/* Brand App Header */}
              <div className="p-5 border-b border-[#222222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8.5 h-8.5 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow shadow-blue-600/30">
                    <Paintbrush className="w-4 h-4" />
                  </div>
                  <h1 className="font-display font-extrabold text-white text-base tracking-tight leading-none">
                    PaintNav
                  </h1>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-neutral-850 rounded-lg cursor-pointer transition flex items-center justify-center"
                  title="Close Menu"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* New Proposal Prominent Button */}
              <div className="px-4 py-4 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleCreateNewProposalImmediately();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-150 shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Proposal
                </button>
              </div>

              {/* Navigation items list */}
              <nav className="flex-1 px-3 py-1 space-y-1.5 overflow-y-auto">
                {[
                  { id: 'dashboard', label: 'Home', icon: Home },
                  { id: 'proposals', label: 'Proposals', icon: FileText },
                  { id: 'invoices', label: 'Invoices', icon: DollarSign },
                  { id: 'work-orders', label: 'Work Orders', icon: CheckSquare },
                  { id: 'admin-portal', label: 'Team Access', icon: Users },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'quick-calc', label: 'Instant Calculator', icon: Calculator },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id || (item.id === 'proposals' && currentView === 'clients');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedClient(undefined);
                        setCurrentView(item.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600/10 text-white font-bold border border-blue-500/10' 
                          : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-zinc-500'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Bottom User Area */}
              <div className="p-4 border-t border-[#222222] shrink-0 bg-[#0c0c0e]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-zinc-100 text-xs font-bold font-mono">
                      {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'PT'}
                    </div>
                    <div className="truncate text-left">
                      <p className="text-xs font-semibold text-white leading-tight truncate">{currentUser?.displayName || 'Painting Manager'}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{currentUser?.email || 'Offline Local Mode'}</p>
                    </div>
                  </div>
                  {!isDemoMode && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="p-1 px-2 bg-neutral-900 hover:bg-red-950/25 hover:text-red-400 border border-neutral-800 font-bold text-[10px] text-zinc-400 rounded-lg cursor-pointer transition"
                    >
                      Exit
                    </button>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Left Sidebar Navigation Panel (Persistent on Desktop, hidden when editing proposals) */}
      <aside className={`${currentView === 'project-details' ? 'hidden' : 'hidden md:flex'} w-64 bg-[#111111] border-r border-[#222222] flex flex-col h-full shrink-0 select-none`}>
        
        {/* Brand App Header */}
        <div className="p-5 border-b border-[#222222] flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow shadow-blue-600/30">
            <Paintbrush className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-white text-lg tracking-tight block leading-none">
              PaintNav
            </h1>
          </div>
        </div>

        {/* New Proposal prominent button in Sidebar */}
        <div className="px-4 py-4 shrink-0">
          <button
            onClick={handleCreateNewProposalImmediately}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-150 shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Proposal
          </button>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-3 py-1 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Home', icon: Home },
            { id: 'proposals', label: 'Proposals', icon: FileText },
            { id: 'invoices', label: 'Invoices', icon: DollarSign },
            { id: 'work-orders', label: 'Work Orders', icon: CheckSquare },
            { id: 'admin-portal', label: 'Team Access', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'quick-calc', label: 'Instant Calculator', icon: Calculator },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'proposals' && currentView === 'clients');
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedClient(undefined);
                  setCurrentView(item.id as any);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600/10 text-white font-bold border border-blue-500/10' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1a1a]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-zinc-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-[#222222] shrink-0 bg-[#0c0c0e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-zinc-100 text-xs font-bold font-mono">
                {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'PT'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-white leading-tight truncate">{currentUser?.displayName || 'Painting Manager'}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{currentUser?.email || 'Offline Local Mode'}</p>
              </div>
            </div>
            {!isDemoMode && (
              <button
                onClick={handleSignOut}
                className="p-1 px-2 bg-neutral-900 hover:bg-red-950/25 hover:text-red-400 border border-neutral-800 font-bold text-[10px] text-zinc-400 rounded-lg cursor-pointer transition"
                title="Disconnect Google"
              >
                Exit
              </button>
            )}
          </div>
        </div>

      </aside>

      {/* 3. Main Contents Area Frame Panel */}
      <main className="flex-1 bg-[#121212] flex flex-col h-full overflow-hidden">
        
        {/* Main Content Header bar */}
        {currentView !== 'project-details' && (
          <header className="h-16 border-b border-[#222222] px-4 md:px-8 flex items-center justify-between shrink-0 bg-[#121212]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-neutral-850 rounded-lg cursor-pointer md:hidden transition flex items-center justify-center"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-left">
                <h2 className="font-display text-xl md:text-2xl font-black text-white tracking-tight leading-none">{viewTitle}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDemoMode && (
                <span className="inline-flex items-center gap-1 text-[9px] bg-neutral-900 border border-[#222222] text-zinc-400 font-bold uppercase px-3 py-1 rounded-full select-none">
                  Local Cache Storage
                </span>
              )}
              {!isDemoMode && (
                <span className="inline-flex items-center gap-1.5 text-[9px] bg-emerald-950/50 border border-emerald-900/40 text-emerald-400 font-bold uppercase px-3 py-1 rounded-full select-none">
                  ● Drive Synced
                </span>
              )}
            </div>
          </header>
        )}

        {/* View container with custom wrapper */}
        <div className={`flex-grow overflow-y-auto ${currentView === 'project-details' ? 'p-0' : 'p-4 md:p-8 space-y-6'}`}>
          
          {/* Router view states */}
          {currentView === 'dashboard' && (
            <Dashboard
              clients={clients}
              projects={projects}
              onSelectProject={(projId) => {
                const targetProj = projects.find(p => p.id === projId);
                if (targetProj) {
                  setSelectedProject(targetProj);
                  setCurrentView('project-details');
                }
              }}
              onNewClient={handleCreateNewProposalImmediately}
              onOpenEstimator={() => setCurrentView('quick-calc')}
              userName={currentUser?.displayName || 'Painting Professional'}
              driveConnected={!isDemoMode && driveToken !== null}
            />
          )}

          {currentView === 'proposals' && (
            <ProposalsList
              projects={projects}
              clients={clients}
              onSelectProject={(projId) => {
                const targetProj = projects.find(p => p.id === projId);
                if (targetProj) {
                  setSelectedProject(targetProj);
                  setCurrentView('project-details');
                }
              }}
              onNewProposal={handleCreateNewProposalImmediately}
            />
          )}

          {currentView === 'invoices' && (
            <InvoicesList
              projects={projects}
              clients={clients}
              onSelectProject={(projId) => {
                const targetProj = projects.find(p => p.id === projId);
                if (targetProj) {
                  setSelectedProject(targetProj);
                  setCurrentView('project-details');
                }
              }}
            />
          )}

          {currentView === 'work-orders' && (
            <WorkOrdersList
              projects={projects}
              clients={clients}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPanel
              currentUser={currentUser}
              isDemoMode={isDemoMode}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onResetDatabase={() => {
                localStorage.removeItem('painter_crm_clients');
                localStorage.removeItem('painter_crm_projects');
                loadDemoSeedData();
                setCurrentView('dashboard');
              }}
              dbProvider={dbProvider}
              onSetDbProvider={handleSetDbProvider}
              supabaseUser={supabaseUser}
              isSupabaseAuthorized={isSupabaseAuthorized}
              loadingAuthorized={loadingAuthorized}
              onCheckAuth={async () => {
                const authStatus = await checkIsAuthorized();
                setIsSupabaseAuthorized(authStatus);
              }}
              clients={clients}
              projects={projects}
              onImportBackup={handleImportBackup}
              onPushToSupabase={handlePushToSupabase}
            />
          )}
 
          {currentView === 'admin-portal' && (
            <AdminPortal
              supabaseUser={supabaseUser}
              isSupabaseAuthorized={isSupabaseAuthorized}
              loadingAuthorized={loadingAuthorized}
              dbProvider={dbProvider}
              onSetDbProvider={handleSetDbProvider}
              onCheckAuth={async () => {
                const authStatus = await checkIsAuthorized();
                setIsSupabaseAuthorized(authStatus);
              }}
              clients={clients}
              projects={projects}
              onImportBackup={handleImportBackup}
              onPushToSupabase={handlePushToSupabase}
            />
          )}

          {currentView === 'edit-client' && (
            <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 shadow-xl text-left">
              <LeadForm
                existingLead={selectedClient}
                onSave={handleSaveClient}
                onCancel={() => {
                  setSelectedClient(undefined);
                  setCurrentView('dashboard');
                }}
              />
            </div>
          )}

          {currentView === 'project-details' && selectedProject && (
            <ProjectDetails
              project={selectedProject}
              client={clients.find(c => c.id === selectedProject.clientId) || {
                id: 'unknown',
                name: 'Unknown Client',
                email: '',
                phone: '',
                address: '',
                status: 'Lead',
                notes: '',
                createdAt: '',
                updatedAt: ''
              }}
              driveToken={driveToken}
              onBack={() => {
                setSelectedProject(undefined);
                setCurrentView('proposals');
              }}
              onSaveProject={async (updated) => {
                await handleSaveProject(updated);
              }}
              onDeleteProject={async (id) => {
                await handleDeleteProject(id);
              }}
              onSaveClient={handleSaveClientDirect}
              onOpenMenu={() => setMobileMenuOpen(true)}
            />
          )}

          {currentView === 'quick-calc' && (
            <div className="max-w-4xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Calculator Specs card */}
                <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 space-y-5">
                  <h3 className="font-display font-semibold text-white text-sm text-left">Room Physical Dimensions</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase">Length (ft)</label>
                      <input
                        type="number"
                        value={calcLength}
                        onChange={(e) => setCalcLength(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase">Width (ft)</label>
                      <input
                        type="number"
                        value={calcWidth}
                        onChange={(e) => setCalcWidth(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase">Height (ft)</label>
                      <input
                        type="number"
                        value={calcHeight}
                        onChange={(e) => setCalcHeight(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase">Coats</label>
                      <select
                        value={calcCoats}
                        onChange={(e) => setCalcCoats(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-blue-500 selection:bg-neutral-900"
                      >
                        <option value={1}>1 Coat</option>
                        <option value={2}>2 Coats</option>
                        <option value={3}>3 Coats</option>
                      </select>
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase">Labor $/SqFt</label>
                      <input
                        type="number"
                        step="0.05"
                        value={calcLaborRate}
                        onChange={(e) => setCalcLaborRate(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase">Paint $/Gal</label>
                      <input
                        type="number"
                        value={calcPricePerGal}
                        onChange={(e) => setCalcPricePerGal(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Display outputs card */}
                <div className="bg-neutral-900 border border-[#222222] rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-display font-semibold text-white text-sm text-left">Estimated Resources</h3>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs text-left">
                      <div>
                        <span className="text-zinc-300 block">Walls Surface Area</span>
                        <span className="text-sm font-bold text-white font-mono mt-0.5 block">{quickCalcMetrics.wallArea} sqft</span>
                      </div>
                      <div>
                        <span className="text-zinc-300 block">Ceiling Surface Area</span>
                        <span className="text-sm font-bold text-white font-mono mt-0.5 block">{quickCalcMetrics.ceilingArea} sqft</span>
                      </div>
                      <div>
                        <span className="text-zinc-300 block">Estimate Paint Needed</span>
                        <span className="text-sm font-bold text-blue-400 font-mono mt-0.5 block">{quickCalcMetrics.standardsGallons} Gals</span>
                      </div>
                      <div>
                        <span className="text-zinc-300 block">Material & Labor</span>
                        <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                          M: ${quickCalcMetrics.materialsCost} / L: ${quickCalcMetrics.laborCost}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-neutral-950/40 border border-neutral-850 rounded-xl flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[10px] text-zinc-300 uppercase font-bold tracking-wider block">Estimated Quote Total</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Includes 8% standard state tax</span>
                    </div>
                    <span className="text-emerald-400 font-display text-2xl font-black">${quickCalcMetrics.total.toLocaleString()}</span>
                  </div>
                </div>

              </div>

              <div className="p-4 bg-neutral-950/40 border border-[#222222] rounded-xl text-zinc-500 text-xs text-left leading-relaxed">
                Estimation assumes standard professional visual paint coverage templates (approx. 350 sqft/gal base coats). Custom designs can be saved to clients directory folder systems directly.
              </div>
            </div>
          )}

        </div>

        {/* Universal deep footer block */}
        <footer className="h-10 border-t border-[#222222] px-8 flex items-center justify-between text-[10px] text-zinc-500 bg-[#0e0e0f] shrink-0 font-mono">
          <p>© 2026 PaintNav Painting CRM. All rights reserved.</p>
          <p>Workspace: Sync Active ({activeEmail})</p>
        </footer>

      </main>

      {/* Google Authentication Iframe Fallback & Error Guidance Modal */}
      <AnimatePresence>
        {authErrorModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthErrorModalOpen(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 relative text-left shadow-2xl z-10 space-y-4"
            >
              <button
                onClick={() => setAuthErrorModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-900/40 text-amber-400 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">
                    {authErrorCode === 'popup-blocked'
                      ? 'Google Sign-In Popup Blocked / Closed'
                      : 'Google Sign-In Failed'}
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono tracking-wider block mt-0.5">
                    ERROR STATE: {authErrorCode === 'popup-blocked' ? 'auth/popup-closed-by-user' : 'auth/sign-in-failed'}
                  </span>
                </div>
              </div>

              <div className="text-zinc-300 text-xs space-y-3 leading-relaxed">
                <p>
                  Because this application is currently embedded in the <strong>Google AI Studio preview iframe</strong>, your browser's security/sandbox policies or an active popup blocker may prevent the authentication popup window from communicating back to the app.
                </p>

                <div className="bg-neutral-950/40 border border-neutral-850 p-4 rounded-xl space-y-3.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-blue-400" /> Recommended Steps to Connect:
                  </h4>
                  <ol className="list-decimal pl-4 space-y-2.5 text-[11px] text-zinc-400">
                    <li>
                      <strong className="text-zinc-200">Open in standalone tab:</strong> Click the button below to open the app directly outside the AI Studio preview frame, or click the <strong className="text-zinc-200">"Open in new tab"</strong> icon in the grey header bar at the top-right of your AI Studio screen.
                    </li>
                    <li>
                      <strong className="text-zinc-200">Grant permissions:</strong> Once opened in the new tab, click the connection button again and allow the sign-in popup.
                    </li>
                    <li>
                      <strong className="text-zinc-200">Alternative Option (Supabase):</strong> You can select the <strong className="text-emerald-400">"Supabase / Postgres SQL"</strong> active database provider in settings, which works immediately in the iframe without requiring Google OAuth popups!
                    </li>
                  </ol>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 border-t border-neutral-850">
                <button
                  onClick={() => setAuthErrorModalOpen(false)}
                  className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-zinc-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition text-center"
                >
                  Close Dialog
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition text-center flex items-center justify-center gap-1.5 font-sans"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Standalone App Tab</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
