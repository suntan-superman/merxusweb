import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/@syncfusion/ej2-react-schedule') ||
            id.includes('node_modules/@syncfusion/ej2-schedule')
          ) {
            return 'syncfusion-schedule';
          }
          if (
            id.includes('node_modules/@syncfusion/ej2-react-grids') ||
            id.includes('node_modules/@syncfusion/ej2-grids')
          ) {
            return 'syncfusion-grid';
          }
          if (id.includes('node_modules/@syncfusion')) {
            return 'syncfusion-core';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'query-vendor';
          }
          return undefined;
        },
      },
    },
  },
})

