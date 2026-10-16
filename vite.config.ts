import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Enterprise browsers: strict CSP in production builds (no CDNs, no eval, same-origin only).
// Not applied in dev because Vite's hot reload injects inline scripts.
// Note: frame-ancestors only works as an HTTP header, so set it on the server, not in this meta tag.
const csp = (): Plugin => ({
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (h) =>
    h.replace('</title>', `</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:">`),
});

export default defineConfig({
  plugins: [react(), csp()],
  // Same-origin websocket through the dev server: one origin = fewer proxy/firewall problems.
  // No proxy needed — the WS client connects directly to :3001.
  // If you need same-origin WS (e.g. behind a reverse proxy), add:
  // server: { proxy: { '/ws': { target: 'ws://localhost:3001', ws: true } } }
  build: {
    chunkSizeWarningLimit: 1000, // bundle budget (kB, per chunk)
    rollupOptions: {
      input: { main: 'index.html', host: 'host.html' },
      output: { manualChunks: { three: ['three', '@react-three/fiber', '@react-three/drei'] } },
    },
  },
});
