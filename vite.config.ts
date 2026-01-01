
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// FIX: Define __dirname for ES modules environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    {
      // Custom plugin to force specific imports to be treated as external
      // This bypasses the node resolution algorithm which fails if the package isn't installed
      name: 'force-external-resolution',
      resolveId(id) {
        const externals = ['docx', '@google/genai', 'buffer'];
        if (externals.includes(id)) {
          return { id, external: true };
        }
      }
    }
  ],
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
