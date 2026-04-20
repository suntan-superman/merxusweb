import { registerLicense } from '@syncfusion/ej2-base';

const SYNCFUSION_RUNTIME_KEY = '__merxus_syncfusion_runtime_ready__';

if (typeof window !== 'undefined' && !window[SYNCFUSION_RUNTIME_KEY]) {
  const syncfusionKey = import.meta.env.VITE_SYNCFUSION_KEY;
  if (syncfusionKey) {
    registerLicense(syncfusionKey);
  } else if (import.meta.env.DEV) {
    console.warn('Syncfusion license key is not set');
  }
  window[SYNCFUSION_RUNTIME_KEY] = true;
}
