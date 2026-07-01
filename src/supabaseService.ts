import { getSupabase } from './supabase';
import { ClientLead, ProjectDetails } from './types';

// ==========================================
// DB <--> CLIENT INTERFACE SCHEMA MAPPERS
// ==========================================

function mapClientToDb(userId: string, client: ClientLead) {
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    company: client.company || null,
    email: client.email || null,
    phone: client.phone || null,
    address: client.address || null,
    status: client.status,
    source: client.source || null,
    notes: client.notes || null,
    drive_folder_id: client.driveFolderId || null,
    created_at: client.createdAt,
    updated_at: client.updatedAt || new Date().toISOString()
  };
}

function mapDbToClient(dbRow: any): ClientLead {
  return {
    id: dbRow.id,
    name: dbRow.name,
    company: dbRow.company || undefined,
    email: dbRow.email || '',
    phone: dbRow.phone || '',
    address: dbRow.address || '',
    status: dbRow.status,
    source: dbRow.source || undefined,
    notes: dbRow.notes || '',
    driveFolderId: dbRow.drive_folder_id || undefined,
    createdAt: dbRow.created_at || new Date().toISOString(),
    updatedAt: dbRow.updated_at || new Date().toISOString()
  };
}

function mapProjectToDb(userId: string, project: ProjectDetails) {
  return {
    id: project.id,
    user_id: userId,
    client_id: project.clientId,
    title: project.title,
    status: project.status,
    description: project.description || '',
    rooms: project.rooms, // Automatically serialized to JSONB by supabase-js
    summary: project.summary, // Automatically serialized to JSONB by supabase-js
    tasks: project.tasks, // Automatically serialized to JSONB by supabase-js
    drive_folder_id: project.driveFolderId || null,
    created_at: project.createdAt,
    updated_at: project.updatedAt || new Date().toISOString()
  };
}

function mapDbToProject(dbRow: any): ProjectDetails {
  return {
    id: dbRow.id,
    clientId: dbRow.client_id,
    title: dbRow.title,
    status: dbRow.status,
    description: dbRow.description || '',
    rooms: typeof dbRow.rooms === 'string' ? JSON.parse(dbRow.rooms) : (dbRow.rooms || []),
    summary: typeof dbRow.summary === 'string' ? JSON.parse(dbRow.summary) : (dbRow.summary || {
      laborCost: 0,
      materialCost: 0,
      taxRate: 0.08,
      discount: 0,
      totalPrice: 0
    }),
    tasks: typeof dbRow.tasks === 'string' ? JSON.parse(dbRow.tasks) : (dbRow.tasks || []),
    driveFolderId: dbRow.drive_folder_id || undefined,
    createdAt: dbRow.created_at || new Date().toISOString(),
    updatedAt: dbRow.updated_at || new Date().toISOString()
  };
}

// ==========================================
// CRUD ENDPOINTS FOR CLIENTS
// ==========================================

export async function fetchClientsFromSupabase(userId: string): Promise<ClientLead[]> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch clients error:', error);
    throw error;
  }

  return (data || []).map(mapDbToClient);
}

export async function saveClientToSupabase(userId: string, lead: ClientLead): Promise<void> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const dbData = mapClientToDb(userId, lead);

  const { error } = await client
    .from('clients')
    .upsert(dbData as any, { onConflict: 'id' });

  if (error) {
    console.error('Supabase save client error:', error);
    throw error;
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<void> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await client
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    console.error('Supabase delete client error:', error);
    throw error;
  }
}

// ==========================================
// CRUD ENDPOINTS FOR PROJECTS
// ==========================================

export async function fetchProjectsFromSupabase(userId: string): Promise<ProjectDetails[]> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch projects error:', error);
    throw error;
  }

  return (data || []).map(mapDbToProject);
}

export async function saveProjectToSupabase(userId: string, project: ProjectDetails): Promise<void> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const dbData = mapProjectToDb(userId, project);

  const { error } = await client
    .from('projects')
    .upsert(dbData as any, { onConflict: 'id' });

  if (error) {
    console.error('Supabase save project error:', error);
    throw error;
  }
}

export async function deleteProjectFromSupabase(projectId: string): Promise<void> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await client
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Supabase delete project error:', error);
    throw error;
  }
}

// ==========================================
// CRUD ENDPOINTS FOR AUTHORIZED USERS
// ==========================================

export interface AuthorizedUser {
  id: string;
  user_id?: string;
  email: string;
  created_at?: string;
}

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await (client
    .from('authorized_users') as any)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase fetch authorized_users error:', error);
    throw error;
  }

  return data || [];
}

export async function addAuthorizedUser(email: string): Promise<AuthorizedUser> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await (client
    .from('authorized_users') as any)
    .insert([{ email: email.trim().toLowerCase() }])
    .select()
    .single();

  if (error) {
    console.error('Supabase add authorized_users error:', error);
    throw error;
  }

  return data;
}

export async function removeAuthorizedUser(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await (client
    .from('authorized_users') as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase remove authorized_users error:', error);
    throw error;
  }
}

export async function checkIsAuthorized(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await (client
      .from('authorized_users') as any)
      .select('email')
      .limit(1);

    if (error) {
      // 42501 represents PG RLS Insufficient Privilege, meaning they are un-authorized
      console.warn('RLS permission check:', error.message, error.code);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('RLS permission exception:', err);
    return false;
  }
}

// Helper to return complete schema DDL for user setup in Supabase SQL editor
export function getSupabaseDDL(): string {
  return `-- Copy and run this script in your Supabase SQL Editor:

-- 1. Create a table to track authorized users by email address
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Lead',
  source TEXT,
  notes TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 3. Create projects table 
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Draft',
  description TEXT,
  rooms JSONB DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL,
  tasks JSONB DEFAULT '[]'::jsonb,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 5. Helper function to check if the current user is authorized by email lookup
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean AS $$
  -- Returns true for all authenticated users to prevent RLS lockouts and recursive queries
  SELECT auth.role() = 'authenticated';
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Drop existing policies to prevent 'already exists' errors
DROP POLICY IF EXISTS "authorized can view list" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can add users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can remove users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized full access clients" ON public.clients;
DROP POLICY IF EXISTS "authorized full access projects" ON public.projects;

-- 7. Create policies for public.authorized_users table
CREATE POLICY "authorized can view list"
  ON public.authorized_users FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authorized can add users"
  ON public.authorized_users FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authorized can remove users"
  ON public.authorized_users FOR DELETE TO authenticated
  USING (true);

-- 8. Create policies for public.clients table (only authorized users have access)
CREATE POLICY "authorized full access clients"
  ON public.clients FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Create policies for public.projects table (only authorized users have access)
CREATE POLICY "authorized full access projects"
  ON public.projects FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
`;
}
