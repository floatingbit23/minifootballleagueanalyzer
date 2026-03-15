# Mini Football League Analyzer - Frontend

Esta es la capa de visualización de datos de la Mini Football League.

## 🚀 Arquitectura: Astro + React (Islands Architecture)

El frontend utiliza un modelo de **Generación de Sitios Estáticos (SSG)** con **Hidratación Parcial**. Esto permite que la página cargue de forma casi instantánea mientras mantiene la interactividad compleja necesaria para los análisis estadísticos.

### 🛠️ Tecnologías Core
- **Framework**: [Astro 5](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)
- **Gráficos**: [Chart.js](https://www.chartjs.org/) con `react-chartjs-2`
- **Iconos**: [Lucide React](https://lucide.dev/)

### 📐 Mapa de la Aplicación

1.  **Renderizado en Tiempo de Build (SSG)**:
    - Durante el proceso de construcción (`npm run build`), Astro ejecuta el código en `src/pages/index.astro`.
    - Se realiza un `fetch` a los datos procesados en `elo_rankings.json` (alojados en GitHub).
    - Se genera un archivo HTML estático que ya contiene los datos del ranking impresos, mejorando el SEO y eliminando estados de "Loading".

2.  **Arquitectura de Islas**:
    - Los componentes que requieren interactividad (como el Dashboard de comparativa H2H o el Chatbot) se cargan como "islas" independientes.
    - Utilizamos la directiva `client:load` para que Astro solo descargue el JavaScript de React necesario para esos componentes específicos, manteniendo el resto de la página como HTML ligero.

3.  **Flujo de Datos**:
    - **Backend (Python)**: Realiza el scraping nocturno y genera el JSON de rankings.
    - **GitHub Actions**: Sube el JSON al repositorio.
    - **Vercel Build**: Detecta el cambio, lanza el build de Astro, consume el JSON actualizado y genera la nueva versión estática de la web.

## 📁 Estructura del Proyecto

```text
frontend/
├── public/              # Assets estáticos y JSONs generados
├── src/
│   ├── components/      # Islas de React (Home, Leaderboard, MatrixChart, etc.)
│   ├── layouts/         # Templates base en .astro
│   ├── pages/           # Rutas del sitio (.astro)
│   └── assets/          # Imágenes y recursos procesados por Vite
├── astro.config.mjs     # Configuración de Astro y React integration
└── package.json         # Dependencias y scripts
```

## 🛠️ Scripts Disponibles

Desde el directorio `frontend/`:

| Comando | Descripción |
| :--- | :--- |
| `npm install` | Instala todas las dependencias. |
| `npm run dev` | Arranca el servidor de desarrollo local (Astro). |
| `npm run build` | Genera la versión estática de producción en `dist/`. |
| `npm run preview` | Previsualiza el build de producción localmente. |

## 🌐 Despliegue

La web está configurada para desplegarse automáticamente en **Vercel** tras cada push a la rama principal. Vercel utiliza los ajustes definidos en el `vercel.json` de la raíz del repositorio para coordinar el build de la subcarpeta `frontend/`.
