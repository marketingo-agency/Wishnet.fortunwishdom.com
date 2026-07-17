/**
 * Vitest config — unit tests only (src/**\/*.test.ts[x]).
 * Node environment: the tested modules are pure logic (history routing,
 * fal spec snapping, pricing math, step registry); no DOM is required.
 */
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
