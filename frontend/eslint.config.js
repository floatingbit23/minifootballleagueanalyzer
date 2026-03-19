import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Configuro las reglas de estilo y buenas prácticas de mi código (Linter)

// Esto me ayuda a evitar errores tontos antes de que la web vuele a producción
export default defineConfig([
  // Ignoro la carpeta dist/ porque es código autogenerado que no necesito revisar
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'], // Reviso todos los archivos JS y JSX
    extends: [ // Cargo las configuraciones recomendadas para JavaScript y React
      js.configs.recommended, // Configuración base de JavaScript
      reactHooks.configs.flat.recommended, // Configuración base de React Hooks
      reactRefresh.configs.vite, // Configuración de React Refresh para Vite
    ],
    languageOptions: { // Configuración del lenguaje
      ecmaVersion: 2020, // Uso JavaScript moderno (ES2020)
      globals: globals.browser, // Defino que el entorno es el navegador
      parserOptions: { // Configuración del parser
        ecmaVersion: 'latest', // Uso la última versión de ECMAScript
        ecmaFeatures: { jsx: true }, // Permito JSX
        sourceType: 'module', // Permito módulos
      },
    },
    rules: { // Personalizo las reglas: permito variables no usadas si empiezan por mayúscula (como Componentes o constantes)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }], // No muestro errores de variables no usadas si empiezan por mayúscula
    },
  },
])
