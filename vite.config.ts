/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base: './' damit das Spiel auch aus einem Unterordner (z. B. GitHub Pages) läuft
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Tests: nur tests/*.test.ts (tests/browser.mjs läuft getrennt); Coverage über den gesamten Quelltext
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: { include: ['src/**/*.ts'], exclude: ['src/env.d.ts', 'src/game/types.ts'], reporter: ['text', 'html'] },
  },
});
