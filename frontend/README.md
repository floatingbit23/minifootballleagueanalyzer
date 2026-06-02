🇪🇸 [Español](README.md) | 🇬🇧 [English](README_EN.md)
---

# Mini Football League Analyzer - Frontend

Esta es la capa de visualización de datos de Mini Football League Analyzer.

## 🚀 Arquitectura: Astro + React (Islands Architecture)

El frontend utiliza un modelo de **Generación de Sitios Estáticos (SSG)** con **Hidratación Parcial**. Este enfoque permite que la página cargue de forma casi instantánea, a la vez que mantiene la interactividad compleja necesaria para los análisis estadísticos.

### 🛠️ Tecnologías Core
- **Framework**: [Astro 6](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)
- **Gráficos**: [Chart.js](https://www.chartjs.org/) con `react-chartjs-2`
- **Iconos**: [Lucide React](https://lucide.dev/)

### 📐 Flujo de la Aplicación

1.  **Generación de Sitios Estáticos (SSG)**:
    - Durante la compilación en producción, Astro genera el esqueleto base HTML optimizado para SEO sin depender de archivos de datos locales volátiles.

2.  **Arquitectura de Islas**:
    - Los componentes interactivos (como la clasificación, el comparador H2H o el Chatbot de IA) se hidratan en el cliente mediante la directiva `client:load`.
    - Al cargar la página, los componentes de React realizan solicitudes `fetch` de forma asíncrona directamente a la CDN de AWS CloudFront para obtener rankings y estadísticas actualizadas, evitando tiempos de carga durante la construcción y bloqueos de compilación.

3.  **Flujo de Datos Automatizado**:
    - **Backend (Python)**: Realiza el scraping semanal y procesa imágenes y estadísticas.
    - **GitHub Actions**: Ejecuta la compilación de datos y sube de forma directa y segura los archivos JSON e imágenes resultantes a **AWS S3** usando OIDC para autenticarse, e invalida la distribución de **AWS CloudFront**.
    - **Vercel**: Hospeda y despliega el código frontend estático, que lee dinámicamente de CloudFront en producción y ofrece fallback local offline para desarrollo.

## 📁 Estructura del Proyecto

```text
frontend/
├── public/              # Assets estáticos y JSONs generados por el backend
├── src/
│   ├── components/      # Islas de React (Home, Leaderboard, MatrixChart, Chatbot)
│   ├── layouts/         # Plantillas base en formato .astro
│   ├── pages/           # Rutas del sitio web (.astro)
│   └── assets/          # Imágenes y recursos procesados optimizadamente por Vite
├── astro.config.mjs     # Configuración central de Astro e integraciones
└── package.json         # Dependencias y scripts del proyecto
```

## 🛠️ Scripts Disponibles

Ejecuta los siguientes comandos siempre desde el directorio `frontend/`:

| Comando | Descripción |
| :--- | :--- |
| `npm install` | Instala todas las dependencias necesarias. |
| `npm run dev` | Arranca el servidor de desarrollo local (Astro dev). |
| `npm run build` | Construye y compila la versión estática de producción en `dist/`. |
| `npm run preview` | Previsualiza localmente el build de producción generado. |
| `npm test` | Ejecuta las pruebas unitarias y de integración con Vitest. |
| `npx playwright install --with-deps` | Instala los binarios de los navegadores para Playwright. |
| `npx playwright test` | Ejecuta los tests de extremo a extremo (E2E) con Playwright. |
| `npx playwright test --ui` | Ejecuta los tests E2E abriendo la interfaz gráfica interactiva. |

## 🌐 Despliegue

La plataforma está configurada para desplegarse automáticamente en **Vercel** tras cada integración en la rama principal (`main`). Para ello, Vercel lee las reglas definidas en el archivo `vercel.json` de la raíz del proyecto, orquestando el build específicamente para esta subcarpeta `frontend/`.
