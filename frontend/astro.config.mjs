import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Esta es la configuración central de mi sitio web con Astro
// https://astro.build/config
export default defineConfig({
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
    build: {
      // Uso el minificador más agresivo disponible
      minify: 'esbuild',
      // Activo la minificación del CSS
      cssMinify: true,
      rollupOptions: {
        output: {
          // Separo las dependencias grandes en chunks independientes para mejorar el caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'framer': ['framer-motion'],
            'charts': ['chart.js', 'react-chartjs-2'],
            'supabase': ['@supabase/supabase-js'],
            'map-vendor': ['mapbox-gl', 'react-map-gl'],
          },
        },
      },
    },
  },
});
