import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import app from './config';

let appCheckInstance = null;
let initializationAttempted = false;

export function getMerxusAppCheck() {
  if (initializationAttempted) return appCheckInstance;
  initializationAttempted = true;

  const siteKey = String(import.meta.env?.VITE_FIREBASE_APPCHECK_SITE_KEY || '').trim();
  if (!siteKey) return null;

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheckInstance;
}

export async function getMerxusAppCheckToken() {
  const appCheck = getMerxusAppCheck();
  if (!appCheck) return null;
  const result = await getToken(appCheck, false);
  return result?.token || null;
}
