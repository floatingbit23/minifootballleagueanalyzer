🇪🇸 [Español](README.md) | 🇬🇧 [English](README_EN.md)
---

# Mini Football League Analyzer - Frontend

This is the data visualization layer for the Mini Football League Analyzer.

## 🚀 Architecture: Astro + React (Islands Architecture)

The frontend uses a **Static Site Generation (SSG)** model with **Partial Hydration**. This architecture allows the page to load almost instantly while maintaining the complex interactivity required for statistical analysis.

### 🛠️ Core Technologies
- **Framework**: [Astro 6](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Chart.js](https://www.chartjs.org/) with `react-chartjs-2`
- **Icons**: [Lucide React](https://lucide.dev/)

### 📐 Application Workflow

1. **Static Site Generation (SSG)**:
   - During production compilation, Astro generates the base SEO-optimized HTML skeleton without depending on volatile local data files.

2. **Islands Architecture**:
   - Interactive components (such as the leaderboard, H2H comparison, or AI Chatbot) are hydrated on the client using the `client:load` directive.
   - Upon page load, the React components perform asynchronous `fetch` requests directly to the AWS CloudFront CDN to obtain the latest rankings and statistics, avoiding build-time delays or compilation blockers.

3. **Automated Data Flow**:
   - **Backend (Python)**: Executes weekly scraping and processes images and statistics.
   - **GitHub Actions**: Runs the data compilation, then directly and securely uploads the resulting JSON files and images to **AWS S3** using OIDC authentication, and invalidates the **AWS CloudFront** distribution.
   - **Vercel**: Hosts and deploys the static frontend code, which dynamically reads from CloudFront in production and offers local offline fallback for development.

## 📁 Project Structure

```text
frontend/
├── public/              # Static assets and backend-generated JSONs
├── src/
│   ├── components/      # React Islands (Home, Leaderboard, MatrixChart, etc.)
│   ├── layouts/         # Base layout templates (.astro)
│   ├── pages/           # Site routes (.astro)
│   └── assets/          # Vite-processed images and resources
├── astro.config.mjs     # Astro and React integration configuration
└── package.json         # Dependencies and NPM scripts
```

## 🛠️ Available Scripts

From the `frontend/` directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm install` | Installs all project dependencies. |
| `npm run dev` | Starts the local development server (Astro). |
| `npm run build` | Builds the static production site into `dist/`. |
| `npm run preview` | Previews the production build locally. |
| `npm test` | Runs unit and integration tests using Vitest. |
| `npx playwright install --with-deps` | Installs browser binaries required for Playwright. |
| `npx playwright test` | Runs all end-to-end (E2E) tests with Playwright in headless mode. |
| `npx playwright test --ui` | Runs E2E tests opening the interactive visual runner. |

## 🌐 Deployment

The website is set up to deploy automatically on **Vercel** after every push to the main branch. Vercel reads the settings defined in the `vercel.json` file located at the repository's root to correctly orchestrate the build of the `frontend/` sub-folder.
