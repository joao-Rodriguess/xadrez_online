import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import apiRoomsHandler from './api/rooms.js';

function loadLocalEnvFile() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore missing local env
  }
}

loadLocalEnvFile();

export default defineConfig({
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-vendor';
          if (id.includes('node_modules/chess.js')) return 'chess-vendor';
          if (id.includes('learningBase.js')) return 'academy-data';
        },
      },
    },
  },
  plugins: [
    {
      name: 'chess3d-local-api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/rooms', (req, res) => {
          apiRoomsHandler(req, res);
        });
      },
    },
  ],
});
