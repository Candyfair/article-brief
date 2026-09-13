import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Server listens on 0.0.0.0 so the app is reachable over Tailscale, not just localhost (SPEC.md §5).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
  },
});
