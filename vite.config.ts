import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './tools/sw-plugin.ts';

export default defineConfig({
  // Caminhos relativos: o app funciona em qualquer subpasta (GitHub Pages, pen drive)
  // e dentro de um app nativo (Capacitor), sem depender de estar na raiz do servidor.
  base: './',
  plugins: [serviceWorkerPlugin()],
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
