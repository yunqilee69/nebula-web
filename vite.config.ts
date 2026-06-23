import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import svgr from 'vite-plugin-svgr';
import { devServerProxy } from './src/dev-server-config';

export default defineConfig({
  plugins: [
    react(),
    svgr({ svgrOptions: { icon: true } }),
    dts({
      insertTypesEntry: true,
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**', 'src/index.tsx', 'vitest.config.ts'],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: devServerProxy,
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'NebulaWeb',
      fileName: 'nebula-web',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'antd',
        '@ant-design/icons',
        'react-router-dom',
        'zustand',
        'zustand/middleware',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          antd: 'antd',
          '@ant-design/icons': 'icons',
          'react-router-dom': 'ReactRouterDOM',
          zustand: 'zustand',
          'zustand/middleware': 'zustandMiddleware',
        },
      },
    },
  },
});
