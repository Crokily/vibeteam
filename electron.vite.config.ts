import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const nativeModules = ['node-pty'];

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts'),
        },
        external: nativeModules,
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts'),
        },
        external: nativeModules,
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'electron/renderer'),
    publicDir: resolve(__dirname, 'assets'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/renderer/index.html'),
        },
      },
    },
  },
});
