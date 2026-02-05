import path from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
const betterSqlite3NodeTargets = [
  path.resolve(__dirname, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node'),
  path.resolve(__dirname, 'node_modules/better-sqlite3/build/better_sqlite3.node'),
];

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['better-sqlite3'],
    },
    commonjsOptions: {
      dynamicRequireTargets: betterSqlite3NodeTargets,
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
});
