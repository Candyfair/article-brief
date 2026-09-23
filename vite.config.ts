import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Server listens on 0.0.0.0 so the app is reachable over Tailscale, not just localhost (SPEC.md §5).
// Port is pinned (strictPort: true, no silent fallback) because the remote Ollama host's
// OLLAMA_ORIGINS allowlist depends on the exact origin, port included (SPEC.md §5).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
});
