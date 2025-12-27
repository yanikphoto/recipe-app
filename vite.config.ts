
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      // This tells Vite not to bundle these libraries, as they are provided 
      // via the <script type="importmap"> in index.html
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        '@google/genai',
        'buffer',
        'docx'
      ]
    }
  }
});
