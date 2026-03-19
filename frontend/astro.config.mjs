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
});
