import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, Vite forwards /api to Nest so the browser only ever talks to one
    // origin. That matches production, where Nest serves the built React app,
    // and means the auth cookie works the same way in both.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
