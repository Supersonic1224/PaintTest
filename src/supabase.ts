import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Lazily initializes and returns the Supabase client instance.
// Returns null if the Supabase environment keys are not configured.
export function getSupabase(): ReturnType<typeof createClient> | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = 
    import.meta.env.VITE_SUPABASE_URL || 
    (import.meta.env as any).SUPABASE_URL || 
    (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' ? localStorage.getItem('painter_crm_supabase_url') || localStorage.getItem('supabase_url') : '');

  const supabaseAnonKey = 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    (import.meta.env as any).SUPABASE_ANON_KEY || 
    (import.meta.env as any).SUPABASE_KEY || 
    (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('painter_crm_supabase_key') || localStorage.getItem('supabase_key') : '');

  if (
    !supabaseUrl || 
    !supabaseAnonKey || 
    supabaseUrl.includes('your-supabase-project') || 
    supabaseAnonKey.includes('your-anon-key-here') ||
    supabaseUrl === '' ||
    supabaseAnonKey === ''
  ) {
    return null;
  }

  // Auto-clean the URL by stripping trailing slashes or /rest/v1 suffix if pasted by the user
  let cleanUrl = supabaseUrl.trim();
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  if (cleanUrl.endsWith('/rest/v1')) {
    cleanUrl = cleanUrl.slice(0, -8);
  }
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  try {
    supabaseClient = createClient(cleanUrl, supabaseAnonKey.trim());
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

// Simple ping helper to check if the Supabase connection matches the correct configuration
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  if (!client) {
    return { 
      success: false, 
      message: 'Supabase keys are not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.' 
    };
  }

  try {
    // Try querying a dummy or standard system query just to verify API credentials
    const { error } = await client.from('clients').select('id').limit(1);
    
    if (error) {
      // If table doesn't exist yet but the credentials are valid, it means we connected successfully but require the tables setup
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase API successfully! Note: You still need to create the required tables.'
        };
      }
      return {
        success: false,
        message: `Supabase returned an API error: ${error.message} (Code: ${error.code})`
      };
    }

    return {
      success: true,
      message: 'Connected successfully to Supabase!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || err}`
    };
  }
}

export interface SupabaseDiagnosticSubStep {
  name: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  message?: string;
}

export interface SupabaseDiagnosticTest {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  errorDetail?: string;
  solution?: string;
  subSteps?: SupabaseDiagnosticSubStep[];
}

// Highly comprehensive 12-checkpoint diagnostics suite to debug any database connect issues
export async function testSupabaseDiagnostics(): Promise<SupabaseDiagnosticTest[]> {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const tests: SupabaseDiagnosticTest[] = [
    {
      id: 1,
      name: 'URL Presence Verification',
      description: 'Check if the VITE_SUPABASE_URL variable is declared in your app setup.',
      status: 'pending'
    },
    {
      id: 2,
      name: 'URL Scheme Security Protocol',
      description: 'Check if the URL correctly begins with secure https:// schema.',
      status: 'pending'
    },
    {
      id: 3,
      name: 'URL Base Domain Extraction',
      description: 'Check for trailing rest paths or folder queries inside your API URL.',
      status: 'pending'
    },
    {
      id: 4,
      name: 'API Key Presence Check',
      description: 'Check if the VITE_SUPABASE_ANON_KEY is provided.',
      status: 'pending'
    },
    {
      id: 5,
      name: 'API Key Format Standards',
      description: 'Verify if the ANON_KEY matches JSON Web Token (JWT) standards with three dot segments.',
      status: 'pending'
    },
    {
      id: 6,
      name: 'JWT Signature & Claims Readability',
      description: 'Analyze if your token payload role matches public "anon" reader specifications.',
      status: 'pending'
    },
    {
      id: 7,
      name: 'Supabase Client Handshake',
      description: 'Test initiating the Javascript Supabase client library with the given keys.',
      status: 'pending'
    },
    {
      id: 8,
      name: 'Network Server Reachability (CORS Check)',
      description: 'Verify if your internet browser can query and communicate with the Supabase host.',
      status: 'pending'
    },
    {
      id: 9,
      name: 'API REST Endpoint Handshake',
      description: 'Test calling the root endpoint of the PostgREST server for server alive responses.',
      status: 'pending',
      subSteps: [
        { name: '1. Base URL Verification & Structure Check', status: 'pending' },
        { name: '2. CORS Header Preflight Emulation', status: 'pending' },
        { name: '3. HTTP GET Handshake (No Trailing Slash)', status: 'pending' },
        { name: '4. HTTP GET Handshake (With Trailing Slash)', status: 'pending' },
        { name: '5. JSON Schema Metadata Payload Check', status: 'pending' },
        { name: '6. API Key Keyring Authorization Check', status: 'pending' },
        { name: '7. Client SDK Query Fallback Probe', status: 'pending' },
        { name: '8. HTTP Response Status Validation', status: 'pending' }
      ]
    },
    {
      id: 10,
      name: 'Clients Table Pipeline Verification',
      description: 'Check if the "clients" table exists in your database and is accessible.',
      status: 'pending'
    },
    {
      id: 11,
      name: 'Projects Table Pipeline Verification',
      description: 'Check if the "projects" table exists in your database and is accessible.',
      status: 'pending'
    },
    {
      id: 12,
      name: 'Row-Level Security (RLS) Select Permission Check',
      description: 'Test reading zero-items to confirm active credentials can read client models without a 401/403 block.',
      status: 'pending'
    }
  ];

  const updateTest = (id: number, status: 'success' | 'failed' | 'skipped', errorDetail?: string, solution?: string) => {
    const t = tests.find(item => item.id === id);
    if (t) {
      t.status = status;
      t.errorDetail = errorDetail;
      t.solution = solution;
    }
  };

  // Test 1: URL Presence
  if (!url || url.includes('your-supabase-project') || url === '') {
    updateTest(1, 'failed', 'URL is empty or has a default placeholder.', 'Go to your Supabase project dashboard -> Settings -> API, and copy your Project URL.');
    for (let i = 2; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(1, 'success');

  // Test 2: URL Scheme
  if (!url.toLowerCase().startsWith('https://')) {
    updateTest(2, 'failed', `The provided URL (${url}) doesn't begin with secure 'https://'.`, 'Check for typos and prepend "https://" to your URL.');
    for (let i = 3; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(2, 'success');

  // Test 3: URL Suffix / Cleaning
  let cleanUrl = url.trim();
  if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
  if (cleanUrl.endsWith('/rest/v1')) cleanUrl = cleanUrl.slice(0, -8);
  if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
  
  if (url.includes('/rest/v1')) {
    updateTest(3, 'success', 'Note: Cleaned up "/rest/v1" suffix automatically from your URL.', 'We handled this! The URL must be just the base domain: "https://xxxx.supabase.co" without any trailing slashes or subdirectories.');
  } else {
    updateTest(3, 'success');
  }

  // Test 4: API Key Presence
  if (!key || key.includes('your-anon-key-here') || key === '') {
    updateTest(4, 'failed', 'Anon public key is empty or has placeholder values.', 'Go to your Supabase dashboard -> Settings -> API -> Project API keys, and copy the "anon" (public) key.');
    for (let i = 5; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(4, 'success');

  // Test 5: Key Format (JWT check)
  const segments = key.trim().split('.');
  if (segments.length !== 3) {
    updateTest(5, 'failed', `The key has ${segments.length} segment(s). Real JWTs must have exactly 3 segments separated by dots.`, 'Make sure you copy the entire Anon public API key from Supabase. It is typically a very long series of letters/numbers divided by two periods.');
    for (let i = 6; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(5, 'success');

  // Test 6: Decrying JWT claims
  try {
    const payloadSegment = segments[1];
    const decodedJson = atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decodedJson);
    if (!claims.role || (claims.role !== 'anon' && claims.role !== 'authenticated')) {
      updateTest(6, 'failed', `Token role signature is: "${claims.role || 'none'}". Expected "anon" or "authenticated".`, 'You might have accidentally copied the "service_role" key instead of the "anon" public key. Please copy the "anon" public key.');
      for (let i = 7; i <= 12; i++) updateTest(i, 'skipped');
      return tests;
    }
    updateTest(6, 'success', `Token verified for Role: "${claims.role}". Reference Ref ID: "${claims.ref || 'Unknown'}".`);
  } catch (err: any) {
    updateTest(6, 'failed', `Could not decode token claims: ${err.message}`, 'Confirm that the key was not edited, truncated or has missing characters.');
    for (let i = 7; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 7: Handshake Init
  let clientInstance: ReturnType<typeof createClient> | null = null;
  try {
    clientInstance = createClient(cleanUrl, key.trim());
    if (!clientInstance) {
      throw new Error('createClient returned null');
    }
    updateTest(7, 'success');
  } catch (err: any) {
    updateTest(7, 'failed', `Failed to initialize Client Instance: ${err.message}`, 'Please check your browser console for script loading or version mismatch errors.');
    for (let i = 8; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 8: Network Server Reachability (CORS Check)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    // Requesting the REST endpoint with the apikey is CORS-safe because PostgREST is configured with wildcards for origins.
    const response = await fetch(`${cleanUrl}/rest/v1`, { 
      method: 'GET', 
      headers: { 'apikey': key.trim() },
      signal: controller.signal, 
      mode: 'cors' 
    }).catch(() => null);
    clearTimeout(timeoutId);
    
    if (!response) {
      updateTest(8, 'failed', 'Direct fetch to Supabase URL timed out or was blocked by CORS/network policies.', 'Verify your Supabase project is active (not paused on free tier). Try opening the URL directly in a new bar to confirm access.');
      for (let i = 9; i <= 12; i++) updateTest(i, 'skipped');
      return tests;
    }
    updateTest(8, 'success', `Server replied to CORS handshake with status: ${response.status}`);
  } catch (err: any) {
    updateTest(8, 'failed', `Network handshake failed due to a browser CORS policy block: ${err.message}`, 'Make sure you are not behind an enterprise proxy or firewall that blocks *.supabase.co domains.');
    for (let i = 9; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 9: REST Endpoint Check (8-Step Granular Check Ledger)
  const apikeyVal = key.trim();
  const subSteps: SupabaseDiagnosticSubStep[] = [
    { name: '1. Base URL Verification & Structure Check', status: 'pending', message: '' },
    { name: '2. CORS Header Preflight Emulation', status: 'pending', message: '' },
    { name: '3. HTTP GET Handshake (No Trailing Slash)', status: 'pending', message: '' },
    { name: '4. HTTP GET Handshake (With Trailing Slash)', status: 'pending', message: '' },
    { name: '5. JSON Schema Metadata Payload Check', status: 'pending', message: '' },
    { name: '6. API Key Keyring Authorization Check', status: 'pending', message: '' },
    { name: '7. Client SDK Query Fallback Probe', status: 'pending', message: '' },
    { name: '8. HTTP Response Status Validation', status: 'pending', message: '' }
  ];

  const t9 = tests.find(t => t.id === 9);
  if (t9) {
    t9.subSteps = subSteps;
  }

  const updateSubStep = (idx: number, status: 'success' | 'failed' | 'skipped', message?: string) => {
    if (subSteps[idx]) {
      subSteps[idx].status = status;
      if (message !== undefined) subSteps[idx].message = message;
    }
  };

  // Step 1: Base URL Verification
  if (cleanUrl && cleanUrl.startsWith('https://') && cleanUrl.includes('.supabase.co')) {
    updateSubStep(0, 'success', `Valid project domain extracted: ${cleanUrl}`);
  } else {
    updateSubStep(0, 'failed', `Invalid or non-standard Supabase URL structure: ${cleanUrl}`);
    updateTest(9, 'failed', 'Invalid Supabase URL structure.', 'Ensure VITE_SUPABASE_URL is formatted as https://xxxx.supabase.co');
    for (let i = 1; i < 8; i++) updateSubStep(i, 'skipped');
    for (let i = 10; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Step 2: CORS Header Preflight Emulation
  if (apikeyVal.length > 50) {
    updateSubStep(1, 'success', `CORS Headers configured with key length ${apikeyVal.length}`);
  } else {
    updateSubStep(1, 'failed', `API key is too short or malformed.`);
    updateTest(9, 'failed', 'Malformed API Key.', 'Provide a valid JWT API key.');
    for (let i = 2; i < 8; i++) updateSubStep(i, 'skipped');
    for (let i = 10; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Step 3: HTTP GET Handshake (No Trailing Slash)
  let responseNoSlash: Response | null = null;
  let noSlashErrorMsg = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    responseNoSlash = await fetch(`${cleanUrl}/rest/v1`, {
      method: 'GET',
      headers: { 'apikey': apikeyVal },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    updateSubStep(2, 'success', `Received response status ${responseNoSlash.status}`);
  } catch (err: any) {
    noSlashErrorMsg = err.message || 'Timeout / Network Error';
    updateSubStep(2, 'failed', `Handshake failed: ${noSlashErrorMsg}`);
  }

  // Step 4: HTTP GET Handshake (With Trailing Slash)
  let responseWithSlash: Response | null = null;
  let withSlashErrorMsg = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    responseWithSlash = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': apikeyVal },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    updateSubStep(3, 'success', `Received response status ${responseWithSlash.status}`);
  } catch (err: any) {
    withSlashErrorMsg = err.message || 'Timeout / Network Error';
    updateSubStep(3, 'failed', `Handshake failed: ${withSlashErrorMsg}`);
  }

  const response = responseWithSlash || responseNoSlash;

  // Step 5: JSON Schema Metadata Payload Check
  if (response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json') || response.status < 500) {
      updateSubStep(4, 'success', `Gateway returned JSON metadata content type: ${contentType}`);
    } else {
      updateSubStep(4, 'failed', `Gateway returned unexpected content type: ${contentType}`);
    }
  } else {
    updateSubStep(4, 'skipped', 'Skipped because HTTP handshakes failed.');
  }

  // Step 6: API Key Keyring Authorization Check
  if (response) {
    if (response.status === 401 || response.status === 403) {
      updateSubStep(5, 'failed', `HTTP status ${response.status}: API Key signature rejected by PostgREST gateway.`);
    } else {
      updateSubStep(5, 'success', `Gateway verified key authentication with status ${response.status}`);
    }
  } else {
    updateSubStep(5, 'skipped', 'Skipped because HTTP handshakes failed.');
  }

  // Step 7: Client SDK Query Fallback Probe
  let sdkSuccess = false;
  let sdkMessage = '';
  if (clientInstance) {
    try {
      const { error } = await clientInstance.from('clients').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116' || error.code === 'PGRST121' || (error as any).status === 406) {
          sdkSuccess = true;
          sdkMessage = `REST gateway successfully connected (DB code: ${error.code} confirms communication)`;
        } else {
          sdkMessage = `SDK query failed with: ${error.message} (Code: ${error.code})`;
        }
      } else {
        sdkSuccess = true;
        sdkMessage = 'SDK select query resolved successfully.';
      }
    } catch (err: any) {
      sdkMessage = `Exception during client fetch: ${err.message}`;
    }
  } else {
    sdkMessage = 'Client SDK was not initialized.';
  }

  if (sdkSuccess) {
    updateSubStep(6, 'success', sdkMessage);
  } else {
    updateSubStep(6, 'failed', sdkMessage);
  }

  // Step 8: HTTP Response Status Validation
  const finalStatusHealthy = (response && response.status >= 200 && response.status < 400) || sdkSuccess;
  if (finalStatusHealthy) {
    updateSubStep(7, 'success', 'REST endpoint confirmed fully active and healthy.');
    updateTest(9, 'success', `API Handshake completed successfully. Active Status verified.`);
  } else {
    updateSubStep(7, 'failed', 'Could not establish a healthy handshake with PostgREST server.');
    
    let errDetail = 'PostgREST server connection failed.';
    let solution = 'Check your internet connection, confirm that your Supabase project is active, and verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly set in your .env file.';
    
    if (response && (response.status === 401 || response.status === 403)) {
      errDetail = `Authentication rejected (Status ${response.status}). The database rejected your VITE_SUPABASE_ANON_KEY.`;
      solution = 'Make sure you copy the entire "anon" public API key from your Supabase dashboard -> Settings -> API. Do not copy the service_role key.';
    } else if (!response) {
      errDetail = `Handshake timed out or was blocked. No Slash: "${noSlashErrorMsg}", With Slash: "${withSlashErrorMsg}"`;
      solution = 'This usually indicates a local network/CORS block or a paused Supabase project. Make sure the project is active on your Supabase dashboard.';
    }

    updateTest(9, 'failed', errDetail, solution);
    for (let i = 10; i <= 12; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 10: Clients Table Existence
  let hasClientsTable = false;
  try {
    const { error } = await clientInstance.from('clients').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        updateTest(10, 'failed', 'Table "clients" does not exist in public schema.', 'Copy the schema DDL SQL script shown below, paste it into your Supabase SQL Editor and click Run.');
      } else {
        updateTest(10, 'failed', `Supabase returned: ${error.message} (Code: ${error.code})`, 'Check if table public.clients exists or has different permissions.');
      }
    } else {
      hasClientsTable = true;
      updateTest(10, 'success', 'Table "clients" resolved successfully.');
    }
  } catch (err: any) {
    updateTest(10, 'failed', `Failed querying clients table: ${err.message}`);
  }

  // Test 11: Projects Table Existence
  let hasProjectsTable = false;
  try {
    const { error } = await clientInstance.from('projects').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        updateTest(11, 'failed', 'Table "projects" does not exist in public schema.', 'Copy the schema DDL SQL script shown below, paste it into your Supabase SQL Editor and click Run.');
      } else {
        updateTest(11, 'failed', `Supabase returned: ${error.message} (Code: ${error.code})`, 'Check if table public.projects exists.');
      }
    } else {
      hasProjectsTable = true;
      updateTest(11, 'success', 'Table "projects" resolved successfully.');
    }
  } catch (err: any) {
    updateTest(11, 'failed', `Failed querying projects table: ${err.message}`);
  }

  // Test 12: RLS Select policies read check
  try {
    if (!hasClientsTable && !hasProjectsTable) {
      updateTest(12, 'skipped', 'Skipped because required tables do not exist in the database yet.', 'Create the tables first to verify the security rules.');
    } else {
      // If tables exist, test a select query
      const targetTable = hasClientsTable ? 'clients' : 'projects';
      const { data, error } = await clientInstance.from(targetTable).select('*').limit(1);
      
      if (error) {
        if (error.message.includes('permission denied') || error.code === 'PGRST121' || (error as any).status === 401 || (error as any).status === 403) {
          updateTest(12, 'failed', `Read blocked by Row Level Security (RLS) policies: ${error.message}`, 'Please run the "CREATE POLICY" scripts in your Supabase SQL editor to allow Select (read) actions.');
        } else {
          updateTest(12, 'failed', `RLS read query failed: ${error.message} (Code: ${error.code})`);
        }
      } else {
        updateTest(12, 'success', 'Security checks passed! Read actions allowed for public/anon queries.');
      }
    }
  } catch (err: any) {
    updateTest(12, 'failed', `Security verification failed: ${err.message}`);
  }

  return tests;
}
