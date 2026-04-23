import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, useTheme } from './context/ThemeContext'

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

