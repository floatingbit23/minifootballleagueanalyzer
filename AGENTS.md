# AGENTS.md — MiniFootballLeagueAnalyzer

## Project Overview

MiniFootballLeagueAnalyzer is an automated data pipeline and visualization platform for Spanish amateur football:

| Layer | Tech Stack | Location |
|-------|------------|----------|
| **Backend** | Python 3.10 | `/` (repo root) |
| **Frontend** | Astro 5 + React 19 | `/frontend/` |
| **Services** | Supabase (Auth/Favorites) | Cloud |

The backend scrapes match data from [minifootballleagues.com](https://minifootballleagues.com/), calculates ELO rankings based on form and goal margin, and exports JSON files that the frontend consumes using Static Site Generation (SSG).

---

## Technical Context

### Data Pipeline
1. **Scraping**: Uses Selenium + BeautifulSoup4 to extract raw data.
2. **Analysis**: Python scripts process raw JSONs into ELO rankings with "Time-Decay" (recent matches weigh more) and goal margin multipliers.
3. **Storage**: Raw data in `jsons/`, processed results in `frontend/public/` for Astro build consumption.

### Frontend Architecture
- **Framework**: Astro 5 (Islands Architecture).
- **Interactivity**: React 19 components (H2H comparisons, Leaderboards).
- **Intelligence**: Integrated Gemini AI Chatbot for querying league stats.
- **Multilingual**: Documentation follows a bilingual structure (`README.md` for Spanish, `README_EN.md` for English).

---

## Dev Environment Setup

### 1. Python Backend
- Always run scripts from the **repo root**.
- **Environment Setup**:
  ```bash
  cp .env.example .env.local
  # Edit .env.local with your keys
  ```
- **Virtual Environment**:
  ```bash
  python -m venv .venv
  source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  ```
- **Requirements**: Google Chrome must be installed for Selenium (Headless mode).

### 2. Astro Frontend
- All commands must be run from the `frontend/` directory:
  ```bash
  cd frontend
  npm install
  npm run dev      # Start dev server
  ```
- **Local Data**: The frontend uses JSON files in `frontend/public/` for local development.

---

## Repository Structure

```text
MiniFootballLeagueAnalyzer/
├── .github/workflows/
│   └── scraping.yml       # Daily scraper (02:00 UTC)
├── jsons/                 # Raw data (Inputs)
├── frontend/              # Web application
│   ├── public/            # Processed JSONs (Outputs)
│   ├── src/               # React Islands & Astro pages
│   ├── vercel.json        # Vercel deployment config
│   ├── README.md          # Frontend docs (Spanish)
│   └── README_EN.md       # Frontend docs (English)
├── league_scraping.py     # Scraper logic
├── elo_system.py          # ELO algorithm
├── simulacion_final.py    # Main execution script
├── requirements.txt       # Python dependencies
├── README.md              # Main docs (Spanish)
└── README_EN.md           # Main docs (English)
```

---

## CI / CD Details

| Tool | Event | Responsibility |
|------|-------|----------------|
| **GitHub Actions** | Daily (02:00 UTC) | Runs scraping, updates ELO, and pushes commits. |
| **Vercel** | Push to `main` | Re-builds the static site with the latest data. |

> [!IMPORTANT]
> **GitHub Secrets**: The automated workflow requires a Personal Access Token (`GH_PAT`) in secrets to bypass the default GitHub Actions restrictions. This ensures that automated commits trigger the Vercel deployment and other checkmarks.

---

## Useful Commands

### Local Data Refresh
```bash
# From root directory
python league_scraping.py
python simulacion_final.py
```

### Frontend Build
```bash
# From frontend directory
npm run build     # Generate static dist/
npm run preview   # Preview production build
```

---

