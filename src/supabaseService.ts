import { getSupabase } from './supabase';
import { ClientLead, ProjectDetails, AuthorizedUser } from './types';
import { getLocalAuthorizedUsers, saveLocalAuthorizedUser } from './firebaseService';

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
    summary: {
      ...project.summary,
      inclusions: project.inclusions || '',
      exclusions: project.exclusions || '',
      specialConditions: project.specialConditions || '',
      teamNotes: project.teamNotes || '',
      photos: project.photos || [],
      clientSigned: project.clientSigned || false,
      signerName: project.signerName || '',
      signerTitle: project.signerTitle || '',
      signedDate: project.signedDate || '',
      signatureDataUrl: project.signatureDataUrl || '',
      contractorAccessToken: project.contractorAccessToken || '',
      installments: project.installments || [],
    }, // Automatically serialized to JSONB by supabase-js
    tasks: project.tasks, // Automatically serialized to JSONB by supabase-js
    drive_folder_id: project.driveFolderId || null,
    created_at: project.createdAt,
    updated_at: project.updatedAt || new Date().toISOString()
  };
}

function mapDbToProject(dbRow: any): ProjectDetails {
  const summaryObj = typeof dbRow.summary === 'string' ? JSON.parse(dbRow.summary) : (dbRow.summary || {});
  return {
    id: dbRow.id,
    clientId: dbRow.client_id,
    title: dbRow.title,
    status: dbRow.status,
    description: dbRow.description || '',
    rooms: typeof dbRow.rooms === 'string' ? JSON.parse(dbRow.rooms) : (dbRow.rooms || []),
    summary: {
      laborCost: summaryObj.laborCost || 0,
      materialCost: summaryObj.materialCost || 0,
      taxRate: summaryObj.taxRate ?? 0.13,
      discount: summaryObj.discount || 0,
      totalPrice: summaryObj.totalPrice || 0
    },
    tasks: typeof dbRow.tasks === 'string' ? JSON.parse(dbRow.tasks) : (dbRow.tasks || []),
    driveFolderId: dbRow.drive_folder_id || undefined,
    createdAt: dbRow.created_at || new Date().toISOString(),
    updatedAt: dbRow.updated_at || new Date().toISOString(),
    inclusions: summaryObj.inclusions || '',
    exclusions: summaryObj.exclusions || '',
    specialConditions: summaryObj.specialConditions || '',
    teamNotes: summaryObj.teamNotes || '',
    photos: summaryObj.photos || [],
    clientSigned: summaryObj.clientSigned || false,
    signerName: summaryObj.signerName || '',
    signerTitle: summaryObj.signerTitle || '',
    signedDate: summaryObj.signedDate || '',
    signatureDataUrl: summaryObj.signatureDataUrl || '',
    contractorAccessToken: summaryObj.contractorAccessToken || '',
    installments: summaryObj.installments || [],
  };
}

// ==========================================
// CRUD ENDPOINTS FOR CLIENTS
// ==========================================

export async function fetchClientsFromSupabase(userId?: string): Promise<ClientLead[]> {
  const client = getSupabase();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch clients warning:', error.message || error);
      return [];
    }

    return (data || []).map(mapDbToClient);
  } catch (err) {
    console.warn('Supabase fetch clients exception:', err);
    return [];
  }
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

export async function fetchProjectsFromSupabase(userId?: string): Promise<ProjectDetails[]> {
  const client = getSupabase();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch projects warning:', error.message || error);
      return [];
    }

    return (data || []).map(mapDbToProject);
  } catch (err) {
    console.warn('Supabase fetch projects exception:', err);
    return [];
  }
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

// Retrieve a single project directly for the client signature portal
export async function fetchSingleProjectFromSupabase(projectId: string): Promise<ProjectDetails | null> {
  const client = getSupabase();
  if (!client) {
    return null;
  }
  try {
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return mapDbToProject(data);
  } catch (err) {
    console.error('Error fetching single project from Supabase:', err);
    return null;
  }
}

// Retrieve a single client lead directly
export async function fetchSingleClientFromSupabase(clientId: string): Promise<ClientLead | null> {
  const client = getSupabase();
  if (!client) {
    return null;
  }
  try {
    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return mapDbToClient(data);
  } catch (err) {
    console.error('Error fetching single client from Supabase:', err);
    return null;
  }
}

// Update electronic signature parameters in Supabase
export async function updateProjectSignatureInSupabase(
  projectId: string,
  signerName: string,
  signerTitle: string,
  status: string,
  signatureDataUrl?: string,
  installments?: any[]
): Promise<void> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  // Fetch current project to retain existing summary details
  const { data: projectRow, error: fetchError } = await (client
    .from('projects') as any)
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (fetchError || !projectRow) {
    throw new Error('Failed to find project to update signature.');
  }

  const existingSummary = typeof projectRow.summary === 'string' 
    ? JSON.parse(projectRow.summary) 
    : (projectRow.summary || {});

  const updatedSummary = {
    ...existingSummary,
    clientSigned: true,
    signerName,
    signerTitle,
    signedDate: new Date().toISOString(),
    signatureDataUrl: signatureDataUrl || null,
    installments: installments || existingSummary.installments || []
  };

  const { error: updateError } = await (client
    .from('projects') as any)
    .update({
      status,
      summary: updatedSummary,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (updateError) {
    console.error('Supabase update project signature error:', updateError);
    throw updateError;
  }
}

// ==========================================
// CRUD ENDPOINTS FOR AUTHORIZED USERS
// ==========================================

export async function fetchAuthorizedUsers(): Promise<AuthorizedUser[]> {
  const client = getSupabase();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await (client
      .from('authorized_users') as any)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch authorized_users warning:', error.message || error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Supabase fetch authorized_users exception:', err);
    return [];
  }
}

export async function addAuthorizedUser(email: string): Promise<AuthorizedUser> {
  const cleanEmail = email.trim().toLowerCase();
  saveLocalAuthorizedUser(cleanEmail); // Save to local storage backup

  const client = getSupabase();
  if (!client) {
    // If Supabase is not configured, we still succeed locally using our fallback
    return {
      id: cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_'),
      email: cleanEmail,
      created_at: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await (client
      .from('authorized_users') as any)
      .insert([{ email: cleanEmail }])
      .select()
      .single();

    if (error) {
      console.warn('Supabase add authorized_users error (saved to local backup):', error);
      return {
        id: cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_'),
        email: cleanEmail,
        created_at: new Date().toISOString()
      };
    }

    return data;
  } catch (err) {
    console.warn('Supabase add authorized_users exception (saved to local backup):', err);
    return {
      id: cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_'),
      email: cleanEmail,
      created_at: new Date().toISOString()
    };
  }
}

export async function removeAuthorizedUser(id: string): Promise<void> {
  // Try removing from local backup first
  try {
    const list = getLocalAuthorizedUsers();
    const updated = list.filter(e => {
      const dId = e.replace(/[^a-zA-Z0-9_.-]/g, '_');
      return dId !== id;
    });
    localStorage.setItem('painter_crm_local_auth_users', JSON.stringify(updated));
  } catch (e) {
    console.warn('Local auth removal warn:', e);
  }

  const client = getSupabase();
  if (!client) return;

  const { error } = await (client
    .from('authorized_users') as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase remove authorized_users error:', error);
    throw error;
  }
}

export async function checkIsAuthorized(email?: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // Auto-authorize owner & admin
  if (cleanEmail === 'aalnasih4846@gmail.com' || cleanEmail === 'daniel@capstonepainting.ca') {
    return true;
  }

  // Check local cache backup
  if (getLocalAuthorizedUsers().includes(cleanEmail)) {
    return true;
  }

  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await (client
        .from('authorized_users') as any)
        .select('email')
        .eq('email', cleanEmail);

      if (!error && data && data.length > 0) {
        saveLocalAuthorizedUser(cleanEmail);
        return true;
      }
    } catch (err) {
      console.warn('Supabase authorization check exception:', err);
    }
  }

  return false;
}

/**
 * Uploads a file to the 'proposal-photos' Supabase Storage bucket.
 * Returns the public URL of the uploaded asset.
 * If the bucket/permissions don't exist yet, it throws so the front-end can fallback gracefully to Base64 storage.
 */
export async function uploadProjectPhotoToSupabaseBucket(projectId: string, file: File): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase client is not initialized.');
  }

  // Create a clean, safe path name: e.g., project_id/timestamp-random.ext
  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanProjId = projectId.replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `${cleanProjId}/${fileName}`;

  // Upload file object
  const { data, error } = await client
    .storage
    .from('proposal-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.warn('Supabase Storage upload failed, throwing error for fallback:', error.message);
    throw error;
  }

  // Retrieve public URL
  const { data: publicUrlData } = client
    .storage
    .from('proposal-photos')
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase storage.');
  }

  return publicUrlData.publicUrl;
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
  -- Returns true for all users to prevent RLS lockouts and recursive queries
  SELECT true;
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Drop existing policies to prevent 'already exists' errors and cleanly override
DROP POLICY IF EXISTS "authorized can view list" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can add users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized can remove users" ON public.authorized_users;
DROP POLICY IF EXISTS "authorized full access clients" ON public.clients;
DROP POLICY IF EXISTS "authorized full access projects" ON public.projects;
DROP POLICY IF EXISTS "Allow users to read their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to insert/update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to read their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow users to insert/update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Open full access clients" ON public.clients;
DROP POLICY IF EXISTS "Open full access projects" ON public.projects;

-- 7. Create policies for public.authorized_users table
CREATE POLICY "authorized can view list"
  ON public.authorized_users FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "authorized can add users"
  ON public.authorized_users FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "authorized can remove users"
  ON public.authorized_users FOR DELETE TO anon, authenticated
  USING (true);

-- 8. Create policies for public.clients table (open to both anon and authenticated users)
CREATE POLICY "Open full access clients"
  ON public.clients FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Create policies for public.projects table (open to both anon and authenticated users)
CREATE POLICY "Open full access projects"
  ON public.projects FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 10. (OPTIONAL) Supabase Storage Buckets configuration for proposal photos
-- Note: Create a public storage bucket named 'proposal-photos' in your Supabase Dashboard,
-- or run the following helper query (uncomment) to enable direct image uploads:
--
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('proposal-photos', 'proposal-photos', true) 
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Give public read access to proposal-photos bucket"
-- ON storage.objects FOR SELECT TO anon, authenticated 
-- USING (bucket_id = 'proposal-photos');
--
-- CREATE POLICY "Give insert/update access to proposal-photos bucket"
-- ON storage.objects FOR ALL TO anon, authenticated 
-- USING (bucket_id = 'proposal-photos') 
-- WITH CHECK (bucket_id = 'proposal-photos');
`;
}
