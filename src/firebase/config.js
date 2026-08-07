import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import app from './app';
import { getMerxusAppCheck } from './appCheck';

// Initialize App Check before Firebase service clients are created.
getMerxusAppCheck();

// Initialize Firebase services
export const auth = getAuth(app);

// Set persistence to local storage (keeps user logged in across sessions)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

