import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { externalizeDeps } from 'vite-plugin-externalize-deps';
import { resolve } from 'path';

export default () =>
  defineConfig({
    plugins: [dts({ rollupTypes: true }), externalizeDeps()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, './src/index.ts'),
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format}.js`,
      },
    },
  });
