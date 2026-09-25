import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Dev-only local API: mounts server/qaApi.ts at /api so the browser can ask Claude
 * for evaluations without ever seeing the API key (read from .env.local per request).
 */
function qaApi(): Plugin {
  return {
    name: 'marcom-qa-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const env = loadEnv('development', process.cwd(), '');
        const mod = (await server.ssrLoadModule('/server/qaApi.ts')) as typeof import('./server/qaApi');
        await mod.handle(req, res, env.ANTHROPIC_API_KEY?.trim() || undefined);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), qaApi()],
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // local-data (real recordings) and .env.local must never be served to the network.
    host: 'localhost',
  },
});
