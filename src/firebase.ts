import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Support both environment variables (for Vercel/production) and the local JSON config fallback
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson?.appId,
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
let cachedAccessToken: string | null = null;

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we don't have token but user is signed in, we might need a re-auth
        // or wait for active sign-in. Let's make sure token exists.
        if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
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
    
    if (!token) {
      throw new Error('Failed to retrieve Google Drive OAuth access token.');
    }
    
    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
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
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
