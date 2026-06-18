import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import Sitemap from 'vite-plugin-sitemap'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://www.kottravai.in',
      dynamicRoutes: [
        '/shop',
        '/about',
        '/b2b',
        '/contact',
        '/faqs',
        '/alliance',
        '/camps',
        '/blog',
        '/shipping-policy',
        '/refund-policy',
        '/terms-of-service',
        '/privacy-policy'
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts'; // Keeps heavy recharts bundle completely out of the critical path
            }
            if (id.includes('framer-motion')) {
              return 'framer'; // Separates animation library
            }
            if (id.includes('lucide-react')) {
              return 'icons'; // Separates icon library
            }
            return 'vendor'; // React and core libraries
          }
        }
      }
    },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
