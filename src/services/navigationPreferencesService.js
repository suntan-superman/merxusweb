import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
export {
  DEFAULT_COLLAPSED_GROUPS,
  NAVIGATION_PREFERENCES_SCHEMA_VERSION,
  buildDefaultNavigationPreferences,
  mergeNavigationPreferences,
  sanitizeQuickStartIds,
} from './navigationPreferencesModel';
import { NAVIGATION_PREFERENCES_SCHEMA_VERSION } from './navigationPreferencesModel';

export async function getNavigationPreferences(userId) {
  if (!userId) return null;
  const snapshot = await getDoc(doc(db, 'users', userId, 'preferences', 'navigation'));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveNavigationPreferences(userId, prefs) {
  if (!userId) return;
  await setDoc(doc(db, 'users', userId, 'preferences', 'navigation'), {
    ...prefs,
    schemaVersion: NAVIGATION_PREFERENCES_SCHEMA_VERSION,
    lastUpdatedAt: serverTimestamp(),
  }, { merge: true });
}
