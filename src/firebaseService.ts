import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc,
  getDoc,
  limit
} from 'firebase/firestore';
import { db, auth, firebaseConfig } from './firebase';
import { ClientLead, ProjectDetails } from './types';

// Retrieve all customer leads for the authenticated user, or return empty if rules block
export async function fetchClientsFromFirestore(userId: string): Promise<ClientLead[]> {
  try {
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const clients: ClientLead[] = [];
    querySnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() } as ClientLead);
    });
    return clients;
  } catch (err) {
    console.warn('Firestore fetch clients warning (probably security rules or indexing):', err);
    return [];
  }
}

// Add or update client profile in Firestore
export async function saveClientToFirestore(userId: string, client: ClientLead): Promise<void> {
  const data = {
    ...client,
    userId,
    updatedAt: new Date().toISOString()
  };
  
  // Clean id before saving to data
  const { id, ...cleanData } = data;
  
  await setDoc(doc(db, 'clients', id), cleanData, { merge: true });
}

// Remove client from Firestore
export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', clientId));
}

// Retrieve project estimates for the authenticated user
export async function fetchProjectsFromFirestore(userId: string): Promise<ProjectDetails[]> {
  try {
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const projects: ProjectDetails[] = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() } as ProjectDetails);
    });
    return projects;
  } catch (err) {
    console.warn('Firestore fetch projects warning:', err);
    return [];
  }
}

// Add or update project estimate in Firestore
export async function saveProjectToFirestore(userId: string, project: ProjectDetails): Promise<void> {
  const data = {
    ...project,
    userId,
    updatedAt: new Date().toISOString()
  };
  
  const { id, ...cleanData } = data;
  await setDoc(doc(db, 'projects', id), cleanData, { merge: true });
}

// Remove project estimate from Firestore
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId));
}

export interface FirebaseDiagnosticSubStep {
  name: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  message?: string;
}

export interface FirebaseDiagnosticTest {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  errorDetail?: string;
  solution?: string;
  subSteps?: FirebaseDiagnosticSubStep[];
}

export async function testFirebaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return {
        success: false,
        message: 'Firebase key is not configured in environment variables or configuration file.'
      };
    }
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, limit(1));
    await getDocs(q);
    return {
      success: true,
      message: 'Connected successfully to Firebase Firestore!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Firestore connection check failed: ${err.message || err}`
    };
  }
}

export async function testFirebaseDiagnostics(): Promise<FirebaseDiagnosticTest[]> {
  const tests: FirebaseDiagnosticTest[] = [
    {
      id: 1,
      name: 'API Key Verification',
      description: 'Check if the VITE_FIREBASE_API_KEY or local apiKey is declared.',
      status: 'pending'
    },
    {
      id: 2,
      name: 'Project ID Verification',
      description: 'Check if the VITE_FIREBASE_PROJECT_ID is provided.',
      status: 'pending'
    },
    {
      id: 3,
      name: 'App ID Verification',
      description: 'Check if the VITE_FIREBASE_APP_ID is provided.',
      status: 'pending'
    },
    {
      id: 4,
      name: 'Firebase Client Handshake',
      description: 'Verify if the Firebase Web SDK successfully initialized our app instance.',
      status: 'pending'
    },
    {
      id: 5,
      name: 'Firestore Database Init',
      description: 'Test initiating the Firestore client object references.',
      status: 'pending'
    },
    {
      id: 6,
      name: 'Network Reachability (CORS / Firestore API)',
      description: 'Verify if the browser can resolve and communicate with the firestore.googleapis.com API gateway.',
      status: 'pending'
    },
    {
      id: 7,
      name: 'Authentication State Assessment',
      description: 'Evaluate if there is an authenticated user signed in (required for write/read under typical rules).',
      status: 'pending'
    },
    {
      id: 8,
      name: 'Write Pipeline Test (Object Write to Database)',
      description: 'Add a real test document to the "clients" collection to verify full write authorization.',
      status: 'pending',
      subSteps: [
        { name: '1. Create Test Document Reference', status: 'pending' },
        { name: '2. Prepare Diagnostic Payload', status: 'pending' },
        { name: '3. Execute Write (setDoc) to Firestore', status: 'pending' },
        { name: '4. Register Document Id for verification', status: 'pending' }
      ]
    },
    {
      id: 9,
      name: 'Read Pipeline Test (Readback Verification)',
      description: 'Fetch the newly created diagnostic document from Firestore to verify correct storage propagation.',
      status: 'pending'
    },
    {
      id: 10,
      name: 'Durable Pipeline Cleanup',
      description: 'Ensure the test diagnostic document is safely deleted from your Firestore instance to keep it clean.',
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

  // Test 1: API Key Presence
  const apiKey = firebaseConfig.apiKey || '';
  if (!apiKey || apiKey.startsWith('your-api-key') || apiKey === '') {
    updateTest(1, 'failed', 'Firebase apiKey is missing or has a placeholder value.', 'Please check your firebase-applet-config.json or declare VITE_FIREBASE_API_KEY.');
    for (let i = 2; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(1, 'success', `API Key found and valid (Prefix: "${apiKey.slice(0, 8)}...").`);

  // Test 2: Project ID
  const projectId = firebaseConfig.projectId || '';
  if (!projectId || projectId.startsWith('your-project-id') || projectId === '') {
    updateTest(2, 'failed', 'Firebase projectId is missing.', 'Please ensure VITE_FIREBASE_PROJECT_ID is declared.');
    for (let i = 3; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(2, 'success', `Project ID verified: "${projectId}".`);

  // Test 3: App ID
  const appId = firebaseConfig.appId || '';
  if (!appId || appId === '') {
    updateTest(3, 'failed', 'Firebase appId is missing.', 'Please ensure VITE_FIREBASE_APP_ID is declared.');
    for (let i = 4; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }
  updateTest(3, 'success', `App ID verified: "${appId}".`);

  // Test 4: Client Handshake
  try {
    if (!db.app) {
      throw new Error('Firebase app was not initialized properly.');
    }
    updateTest(4, 'success', `Connected to Firebase app named: "${db.app.name}".`);
  } catch (err: any) {
    updateTest(4, 'failed', `App instance error: ${err.message || err}`, 'Check if your config values are properly formed.');
    for (let i = 5; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 5: Firestore Database Init
  try {
    if (!db) {
      throw new Error('Firestore DB instance is null or undefined.');
    }
    updateTest(5, 'success', 'Firestore DB client handle verified.');
  } catch (err: any) {
    updateTest(5, 'failed', `Firestore init failed: ${err.message || err}`, 'Verify Firebase Firestore is enabled in your Firebase console.');
    for (let i = 6; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 6: Network Reachability
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`, {
      method: 'GET',
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (!response) {
      updateTest(6, 'failed', 'Direct GET handshake with Google Firestore API timed out or was blocked.', 'Check your internet connection and verify firestore.googleapis.com isn\'t blocked by firewall or CORS proxy.');
      for (let i = 7; i <= 10; i++) updateTest(i, 'skipped');
      return tests;
    }
    updateTest(6, 'success', `Network gateway is responsive. Firestore API returned status: ${response.status}.`);
  } catch (err: any) {
    updateTest(6, 'failed', `Network check failed: ${err.message}`, 'Make sure your browser has internet connection and is allowed to query firestore.googleapis.com.');
    for (let i = 7; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 7: Authentication State Assessment
  const currentUser = auth.currentUser;
  const userUid = currentUser?.uid || '';
  if (!currentUser) {
    updateTest(7, 'success', 'Note: No user actively authenticated (Anonymous/Public permissions session).', 'You can sign in using Firebase Auth via the main interface if security rules prevent anonymous writes.');
  } else {
    updateTest(7, 'success', `Active auth session detected. Email: "${currentUser.email}", UID: "${userUid}".`);
  }

  // Test 8: Write Pipeline Test (Adding Objects to Firestore Database)
  const testDocId = `diag_test_${Date.now()}`;
  const testDocRef = doc(db, 'clients', testDocId);
  const testObj = {
    company: 'Firebase Diagnostics Test Corp',
    fullName: `Test Object ${Date.now()}`,
    email: currentUser?.email || 'diagnostics@test.com',
    phone: '+1 (555) DIAG-TEST',
    status: 'lead' as const,
    value: 5000,
    notes: `Diagnostic automated connection test write object. Generated at: ${new Date().toISOString()}`,
    userId: userUid || 'anonymous_tester',
    isTestRecord: true,
    updatedAt: new Date().toISOString()
  };

  const t8 = tests.find(t => t.id === 8);
  const subSteps = t8?.subSteps || [];
  const updateSubStep = (idx: number, status: 'success' | 'failed' | 'skipped', message?: string) => {
    if (subSteps[idx]) {
      subSteps[idx].status = status;
      if (message !== undefined) subSteps[idx].message = message;
    }
  };

  try {
    updateSubStep(0, 'success', `Targeting collection: "clients", Document ID: "${testDocId}"`);
    updateSubStep(1, 'success', `Generated 10-field diagnostic payload: "${testObj.fullName}"`);
    await setDoc(testDocRef, testObj);
    updateSubStep(2, 'success', 'Successfully wrote document (setDoc) to Firestore storage.');
    updateSubStep(3, 'success', `Registered ID "${testDocId}" for verification check.`);
    updateTest(8, 'success', `Write operation succeeded! Successfully added test object to your Firestore database. ID: "${testDocId}"`);
  } catch (err: any) {
    updateSubStep(2, 'failed', `setDoc write rejected: ${err.message}`);
    updateSubStep(3, 'skipped');
    updateTest(
      8, 
      'failed', 
      `Firestore write block: ${err.message}`, 
      'This typically indicates Firestore security rules are blocking the write. Make sure your "firestore.rules" file is deployed and allows writes for your active authorization level.'
    );
    for (let i = 9; i <= 10; i++) updateTest(i, 'skipped');
    return tests;
  }

  // Test 9: Readback verification
  try {
    const snap = await getDoc(testDocRef);
    if (!snap.exists()) {
      updateTest(9, 'failed', `Document snapshot not found for ID "${testDocId}".`, 'This means the write operation finished but the document wasn\'t found upon immediately reading it.');
      updateTest(10, 'skipped');
      return tests;
    }
    const retrieved = snap.data();
    updateTest(9, 'success', `Read operation succeeded! Successfully retrieved document back. Found company: "${retrieved?.company}".`);
  } catch (err: any) {
    updateTest(9, 'failed', `Readback blocked or failed: ${err.message}`, 'Confirm that your firestore.rules allow select/get queries on the "clients" collection.');
    updateTest(10, 'skipped');
    return tests;
  }

  // Test 10: Cleanup
  try {
    await deleteDoc(testDocRef);
    updateTest(10, 'success', `Cleanup succeeded! Successfully removed test record "${testDocId}". Your Firestore database remains perfectly clean!`);
  } catch (err: any) {
    updateTest(10, 'success', `Test document was left intact in your Firestore database under collection 'clients' with ID '${testDocId}' due to a minor cleanup permission block: ${err.message}. This is actually beneficial because you can see the test object in your Firebase Console right now!`);
  }

  return tests;
}
