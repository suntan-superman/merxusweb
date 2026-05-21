import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { installProductionDiagnostics, markDiagnostic } from './utils/productionDiagnostics'

const VITE_PRELOAD_RETRY_KEY = 'merxus.vitePreloadRetryTriggered'
const MODULE_IMPORT_RETRY_KEY = 'merxus.moduleImportRetryTriggered'
const RETRY_WINDOW_MS = 30 * 1000

function isRecoverableModuleLoadFailure(reason) {
  const message = String(reason?.message || reason || '').toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('failed to load module script') ||
    message.includes('loading chunk') ||
    message.includes('mime type')
  )
}

function retryWithHardReload({ sessionKey, queryParam }) {
  if (typeof window === 'undefined') return
  const lastRetry = Number(window.sessionStorage.getItem(sessionKey) || 0)
  if (Number.isFinite(lastRetry) && Date.now() - lastRetry < RETRY_WINDOW_MS) return
  window.sessionStorage.setItem(sessionKey, String(Date.now()))
  const url = new URL(window.location.href)
  url.searchParams.set(queryParam, String(Date.now()))
  window.location.replace(url.toString())
}

if (typeof window !== 'undefined') {
  installProductionDiagnostics()

  window.addEventListener('vite:preloadError', (event) => {
    markDiagnostic('vite:preload-error', {
      message: String(event?.payload?.message || event?.message || 'preload error'),
    })
    event.preventDefault()
    retryWithHardReload({
      sessionKey: VITE_PRELOAD_RETRY_KEY,
      queryParam: '__vite_retry',
    })
  })

  window.addEventListener('error', (event) => {
    const message = String(event?.message || '').toLowerCase()
    const target = event?.target
    const isModuleScriptTagFailure =
      target &&
      target.tagName === 'SCRIPT' &&
      typeof target.src === 'string' &&
      target.src.includes('/assets/')

    if (message.includes('failed to load module script') || isModuleScriptTagFailure) {
      markDiagnostic('asset:module-load-failure', {
        message,
        assetUrl: target?.src || null,
      })
      event.preventDefault()
      retryWithHardReload({
        sessionKey: MODULE_IMPORT_RETRY_KEY,
        queryParam: '__module_retry',
      })
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isRecoverableModuleLoadFailure(event?.reason)) return
    markDiagnostic('asset:dynamic-import-failure', {
      reason: String(event?.reason?.message || event?.reason || 'unknown'),
    })
    event.preventDefault()
    retryWithHardReload({
      sessionKey: MODULE_IMPORT_RETRY_KEY,
      queryParam: '__module_retry',
    })
  })

  const currentUrl = new URL(window.location.href)
  if (currentUrl.searchParams.has('__vite_retry') || currentUrl.searchParams.has('__module_retry')) {
    currentUrl.searchParams.delete('__vite_retry')
    currentUrl.searchParams.delete('__module_retry')
    window.history.replaceState({}, '', currentUrl.toString())
  } else {
    window.sessionStorage.removeItem(VITE_PRELOAD_RETRY_KEY)
    window.sessionStorage.removeItem(MODULE_IMPORT_RETRY_KEY)
  }
}

// Create a client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: how long inactive data stays in cache (10 minutes)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus by default (can override per query)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

function ThemeAwareToaster() {
  const { isDark } = useTheme()

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: isDark ? '#0f172a' : '#fff',
          color: isDark ? '#e2e8f0' : '#374151',
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
          boxShadow: isDark
            ? '0 10px 15px -3px rgba(2, 6, 23, 0.5), 0 4px 6px -2px rgba(2, 6, 23, 0.35)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #10b981',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #ef4444',
          },
        },
      }}
    />
  )
}

markDiagnostic('react:render-start')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
        <ThemeAwareToaster />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

markDiagnostic('react:render-scheduled')

