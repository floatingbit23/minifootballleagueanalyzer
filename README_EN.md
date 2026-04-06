🇪🇸 [Español](README.md) | 🇬🇧 [English](README_EN.md)
---

# What is MiniFootballLeagueAnalyzer?

MiniFootballLeagueAnalyzer is an advanced data analytics tool designed for the MiniFootballLeague in Spain (https://minifootballleagues.com/). 

![Main page](/images/main.png)

It extracts competition data using web scraping and provides useful infographics, allowing teams to scout their opponents and understand their own strengths and weaknesses.

These infographics are updated on a weekly basis (every Wednesday).

The website features a dropdown menu to select the desired competition. Each competition includes:

1. **Power Ranking**: Teams are ranked by their current form, rather than official points. This Power Ranking is based on an ELO system similar to the one used by FIFA.
   - **Real Comparison**: The table includes a visual comparison with the official standings.
   - 🟢: The team performs better in ELO than in the official league (Underrated).
   - 🔴: The team performs worse in ELO than in the official league (Overrated).
   - 🟰: ELO and official standings match.

![Power Ranking](/images/power_ranking.png)

2. **Odds Table**: Displays the odds for the upcoming matchday.

The following 7-a-side (F7) competitions are included:
- Primera División Murcia (1st Division)
- Segunda División A Murcia (2nd Division A)
- Segunda División B Murcia (2nd Division B)
- Tercera División A Murcia (3rd Division A)
- Tercera División B Murcia (3rd Division B)
- Cuarta División Murcia (4th Division)
- Primera División Granada (1st Division)
- Segunda División Granada (2nd Division)
- Liga Veteranos (+35) Granada (Veterans League)

3. **Tournament Venues Map**: An interactive map (via Mapbox) featuring all the match locations across Murcia and Granada, including exact addresses and direct navigation links.

![Tournament Venues Map](/images/map.png)

The platform also includes a dropdown menu to select two teams within each competition for a Head-to-Head (H2H) analysis, providing:

- **Odds Table**: Most probable outcomes, percentages, and Expected Goals (xG).

![Odds_table](/images/odds_table.png)

- **ELO Evolution**: A chart tracking the ELO progression of both teams since the beginning of the league.

![ELO_evolution](/images/elo_evolution.png)

- **Radar Chart** featuring:
  - **Offensive Power**: Brute scoring capability.
  - **Defensive Solidity**: Ability to prevent goals.
  - **Fair Play**: Discipline level (higher score for fewer cards).
  - **Goal Distribution**: If this value is high (closer to 100%), the team doesn't rely solely on one player to score.
  - **Goal Difference**: Overall competitiveness balance.

## Installation and Configuration

Follow these steps to run the project on your local machine.

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Google Chrome** (required for Selenium scraping)

### 2. Environment Configuration (.env)
This project requires several API keys and configurations to function correctly (Chatbot, Maps, Supabase).
1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```
2. Edit `.env.local` and add your own keys (Gemini, Mapbox, Supabase).

### 3. Backend (Python)
From the project root:
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/Scripts/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Frontend (Astro)
From the `frontend/` folder:
```bash
cd frontend
npm install
npm run dev
```

---

## Project Workflow

```mermaid
graph TD
    A[Minifootballleagues.com] -->|Scraping: Selenium + BS4| B(league_scraping.py)
    B -->|Raw Data| C[(jsons/*.json)]
    C --> D(simulacion_final.py)
    D -->|ELO Ranking & Stats| E[(frontend/public/*.json)]
    
    subgraph GitHub_Actions [GitHub Actions - Wed 02:00 UTC]
        B
        D
        F[Git Commit & Push]
    end
    
    E --> F
    F -->|Trigger| G[Vercel Deployment]
    G -->|Astro SSG Build| H[Web Frontend]
    H -->|Visualization| I[End User]
```

### Backend

#### Data Collection
Python along with Selenium and BeautifulSoup is used to scrape data from the official website. The collected data is stored as JSON files inside the `/jsons` directory for subsequent analysis.

#### Power Ranking
Based on the traditional ELO system, but incorporates 2 analytical multipliers:
1. **Margin of Victory**: A "blowout" multiplier. Winning by a larger margin awards more ELO points.
2. **Time-Decay**: Recent matches are given higher weight than those played early in the season.

The raw JSON files are fed into the algorithm, which outputs a global ranking in a new JSON file (`elo_rankings.json`).

![Scorers](/images/scorers.png)

### Head-to-Head (H2H)
Detailed comparison providing statistical insights to anticipate match outcomes.

### Automation
Data is updated weekly (every Wednesday) via CI/CD pipelines using GitHub Actions.

### AI Chatbot
An AI chatbot powered by the Gemini family models to query information about teams and competitions. It can be accessed via a button in the bottom right corner of the website.

![AI Chatbot](/images/chatbot.png)
