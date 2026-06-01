import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'jsonwebtoken': path.resolve(__dirname, './node_modules/jsonwebtoken'),
      'stripe': path.resolve(__dirname, './node_modules/stripe'),
      '@aws-sdk/client-dynamodb': path.resolve(__dirname, './node_modules/@aws-sdk/client-dynamodb'),
      '@aws-sdk/lib-dynamodb': path.resolve(__dirname, './node_modules/@aws-sdk/lib-dynamodb'),
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules', 'dist', '.astro', 'tests'],
  },
});
