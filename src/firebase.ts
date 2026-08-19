import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Support both Vite standard uppercase environment variables (VITE_FIREBASE_API_KEY),
// raw names (apiKey, authDomain, projectId), and local firebase-applet-config.json
const getEnv = (keys: string[]): string | undefined => {
  for (const k of keys) {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[k]) {
      return import.meta.env[k];
    }
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv(['VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY', 'VITE_API_KEY', 'apiKey', 'API_KEY']) || firebaseConfigJson?.apiKey,
  authDomain: getEnv(['VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'VITE_AUTH_DOMAIN', 'authDomain', 'AUTH_DOMAIN']) || firebaseConfigJson?.authDomain,
  projectId: getEnv(['VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'VITE_PROJECT_ID', 'projectId', 'PROJECT_ID']) || firebaseConfigJson?.projectId,
  storageBucket: getEnv(['VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'VITE_STORAGE_BUCKET', 'storageBucket', 'STORAGE_BUCKET']) || firebaseConfigJson?.storageBucket,
  messagingSenderId: getEnv(['VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', 'VITE_MESSAGING_SENDER_ID', 'messagingSenderId', 'MESSAGING_SENDER_ID']) || firebaseConfigJson?.messagingSenderId,
  appId: getEnv(['VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID', 'VITE_APP_ID', 'appId', 'APP_ID']) || firebaseConfigJson?.appId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Use Google Auth Provider
export const provider = new GoogleAuthProvider();

// Google Drive & Gmail Scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/gmail.send');

// Select account always for ease of testing or switching
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache variables
let isSigningIn = false;
let cachedAccessToken: string | null = (typeof window !== 'undefined') ? localStorage.getItem('painter_crm_drive_token') : null;

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const activeToken = cachedAccessToken || localStorage.getItem('painter_crm_drive_token') || '';
      if (onAuthSuccess) onAuthSuccess(user, activeToken);
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') localStorage.removeItem('painter_crm_drive_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in flow triggered by user
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    if (token) {
      cachedAccessToken = token;
      if (typeof window !== 'undefined') localStorage.setItem('painter_crm_drive_token', token);
    }
    
    return { user: result.user, accessToken: token || '' };
  } catch (error: any) {
    const isPopupClosed = error?.message?.includes('popup-closed-by-user') || error?.code?.includes('popup-closed-by-user') || String(error).includes('popup-closed-by-user') ||
                          error?.message?.includes('cancelled-popup-request') || error?.code?.includes('cancelled-popup-request') || String(error).includes('cancelled-popup-request');
    if (isPopupClosed) {
      console.warn('Google Sign-In Popup was closed or blocked by user/browser environment.');
    } else {
      console.error('Google Sign-In Error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('painter_crm_drive_token') : null);
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('painter_crm_drive_token', token);
    else localStorage.removeItem('painter_crm_drive_token');
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') localStorage.removeItem('painter_crm_drive_token');
};
