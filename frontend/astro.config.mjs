import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Esta es la configuración central de mi sitio web con Astro
// https://astro.build/config
export default defineConfig({
  // Fuerza a Astro a usar la interfaz IPv4 en local
  server: {
    host: '127.0.0.1',
    port: 4321
  },
  // Integro React para poder usar mis componentes interactivos de alto rendimiento
  integrations: [react()],
  // Defino la ruta base en la raíz del dominio
  base: '/',
  // Establezco adónde quiero que se envíen los archivos generados tras la construcción final (frontend/dist/)
  outDir: './dist',
  // OPTIMIZACIÓN: Activo la compresión del HTML generado para reducir el tamaño del payload enviado al navegador
  compressHTML: true,
  // OPTIMIZACIÓN: Configuro Vite para minificación y code splitting óptimos
  vite: {
    server: {
      proxy: {
        '/s3-cdn': {
          target: 'https://d2j5qbs4vf6bj9.cloudfront.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/s3-cdn/, '')
        },
        '/checkout-api': {
          target: 'https://7ipt0cwr2h.execute-api.eu-west-1.amazonaws.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/checkout-api/, '')
        }
      }
    },
    preview: {
      allowedHosts: true
    },
    build: {
      // Uso el minificador más agresivo disponible
      minify: 'esbuild',
      // Activo la minificación del CSS
      cssMinify: true,
      rollupOptions: {
      },
    },
  },
});
