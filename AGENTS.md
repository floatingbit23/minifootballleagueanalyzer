# AGENTS.md — MiniFootballLeagueAnalyzer

## Project overview

MiniFootballLeagueAnalyzer is a two-layer project:

| Layer | Tech | Root |
|-------|------|------|
| **Backend** | Python 3.10 | `/` (repo root) |
| **Frontend** | React 19 + Vite 7 | `/frontend/` |

The backend scrapes match data from [minifootballleagues.com](https://minifootballleagues.com/), calculates ELO rankings, and writes JSON files that the frontend consumes. GitHub Actions keeps everything in sync automatically every night.

---

## Dev environment tips

### Python backend

- Always work from the **repo root** when running Python scripts.
- Install Python dependencies once into a virtual environment:
  ```bash
  python -m venv .venv
  source .venv/Scripts/activate   
  # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  ```
- The scraping step requires **Google Chrome** installed locally (Selenium uses it via ChromeDriver).
- Data files live in `jsons/`; ELO output files are written to `frontend/public/` so Vite can serve them directly.

### Frontend

- All `npm` commands must be run from the `frontend/` directory:
  ```bash
  cd frontend
  npm install      # first time only
  npm run dev      # start local dev server (Vite)
  ```
- The frontend reads JSON data from `frontend/public/*.json` at runtime; make sure those files exist before starting the dev server (run the Python pipeline or copy sample files).
- The Vite config (`frontend/vite.config.js`) sets `base: '/'`. Do **not** change this for local dev; GitHub Pages deployment relies on it.

---

## Repository structure

```
MiniFootballLeagueAnalyzer/
├── .github/
│   └── workflows/
│       ├── deploy.yml      # Builds & deploys the frontend to GitHub Pages on push to main
│       └── scraping.yml    # Runs scraping + ELO analysis daily at 02:00 UTC
├── jsons/                  # Raw match/standings data (one JSON per competition)
│   ├── prim_div_mur.json
│   ├── seg_div_murA.json
│   ├── seg_div_murB.json
│   ├── ter_div_murA.json
│   ├── ter_div_murB.json
│   └── cuar_div_mur.json
├── frontend/               # React + Vite SPA
│   ├── public/             # Static assets + generated JSON consumed by the UI
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page-level components (routes)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── league_scraping.py      # Selenium + BeautifulSoup scraper
├── elo_system.py           # ELO calculation logic
├── simulacion_final.py     # Runs ELO pipeline, writes output JSONs
├── simulacionesH2H.py      # Head-to-head match simulations
├── analisis_enfrentamiento.py  # Per-matchup statistical analysis
├── grafico_puntos.py       # Matplotlib point charts (local analysis helper)
├── requirements.txt        # Python dependencies
└── README.md
```

---

## Running the data pipeline locally

```bash
# 1. Scrape fresh data from the web
python league_scraping.py

# 2. Compute ELO rankings and write output JSONs to frontend/public/
python simulacion_final.py
```

Run these in order from the repo root. After step 2 the frontend has up-to-date data.

---

## Frontend scripts

Run all of the following from the `frontend/` directory:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local Vite dev server |
| `npm run build` | Build production bundle to `frontend/dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint (JS + JSX, React Hooks rules) |

---

## CI / GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `scraping.yml` | Daily at 02:00 UTC + manual dispatch | Installs Python & Chrome, runs scraper + ELO analysis, commits updated JSONs back to `main` |
| `deploy.yml` | Push to `main` + manual dispatch | Installs Node 20, builds the frontend, deploys `frontend/dist/` to GitHub Pages |

Both workflows use `ubuntu-latest`. The scraping job needs `contents: write` permission to push the refreshed JSONs; the deploy job needs `pages: write` and `id-token: write` for GitHub Pages OIDC auth.

---

## Testing instructions

There is currently no automated test suite. Before merging changes:

1. **Backend** — run the full pipeline manually and verify JSON output is valid:
   ```bash
   python league_scraping.py
   python simulacion_final.py
   python -c "import json; json.load(open('frontend/public/elo_rankings.json'))"
   ```
2. **Frontend** — verify the lint check passes and the app renders without console errors:
   ```bash
   cd frontend
   npm run lint
   npm run dev   # open http://localhost:5173 and verify all pages load
   ```
3. **Build** — confirm the production build succeeds before pushing to `main`:
   ```bash
   cd frontend
   npm run build
   ```

---

## PR / contribution instructions

- **Branch naming**: `feature/<short-description>` or `fix/<short-description>`.
- **Commit style**: Use the imperative mood, e.g. `Add time-decay multiplier to ELO`.
- Always run `npm run lint` and the manual verification steps above before opening a PR.
- Keep backend scripts and frontend changes in **separate commits** when possible.
- JSON files in `jsons/` and `frontend/public/` are auto-generated — do **not** hand-edit them; let the pipeline regenerate them.
- The `deploy.yml` workflow runs automatically on every push to `main`, so make sure `npm run build` is clean before merging.
