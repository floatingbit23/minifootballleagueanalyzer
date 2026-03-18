import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Home.css';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import murciaFlag from '../../assets/murcia_flag.jpeg';
import granadaFlag from '../../assets/granada_flag.png';
import Leaderboard from '../Leaderboard/Leaderboard';
import MatrixChart from '../MatrixChart/MatrixChart';
import TeamScorers from '../TeamScorers/TeamScorers';
import PointsEvolution from '../PointsEvolution/PointsEvolution';

const LEAGUES = [
  { id: 'prim_div_mur', name: 'Primera División Murcia', flag: murciaFlag },
  { id: 'seg_div_murA', name: 'Segunda División A Murcia', flag: murciaFlag },
  { id: 'seg_div_murB', name: 'Segunda División B Murcia', flag: murciaFlag },
  { id: 'ter_div_murA', name: 'Tercera División A Murcia', flag: murciaFlag },
  { id: 'ter_div_murB', name: 'Tercera División B Murcia', flag: murciaFlag },
  { id: 'cuar_div_mur', name: 'Cuarta División Murcia', flag: murciaFlag },
  { id: 'prim_div_gra', name: 'Primera División Granada', flag: granadaFlag },
  { id: 'seg_div_gra', name: 'Segunda División Granada', flag: granadaFlag },
  { id: 'veteranos_gra', name: 'Liga Veteranos (+35) Granada', flag: granadaFlag },
];

// Equipos mock para la interacción inicial (luego vendrán del JSON)
const MOCK_TEAMS = [
  { id: 'team1', name: 'Atlético Murcia' },
  { id: 'team2', name: 'Real Murcia F7' },
  { id: 'team3', name: 'Sporting de Murcia' },
  { id: 'team4', name: 'Los Pimentoneros FC' },
];

const CustomSelect = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determinar la opción seleccionada o el placeholder
  const selectedOption = options.find((opt) => opt.id === value);
  const getAssetSrc = (asset) => typeof asset === 'object' ? asset.src : asset;

  const displayValue = selectedOption ? (
    <div className="select-value-with-icon">
      {selectedOption.flag && <img src={getAssetSrc(selectedOption.flag)} alt="" className="select-flag" />}
      {selectedOption.logo && <img src={getAssetSrc(selectedOption.logo)} alt="" className="select-logo" />}
      <span>{selectedOption.name}</span>
    </div>
  ) : (
    <span>{placeholder}</span>
  );

  return (
    <div className="custom-select-container">
      <label className="select-label">{label}</label>
      <div className="custom-select-box" onClick={() => setIsOpen(!isOpen)}>
        {displayValue}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} className="chevron-icon" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="select-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.map((opt) => (
              <div 
                key={opt.id} 
                className={`select-option ${value === opt.id ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
              >
                {opt.flag && <img src={getAssetSrc(opt.flag)} alt="" className="select-flag" />}
                {opt.logo && <img src={getAssetSrc(opt.logo)} alt="" className="select-logo" />}
                <span>{opt.name}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Home = ({ rankingsData: initialRankingsData }) => {
  const { t } = useTranslation();
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [rankingsData, setRankingsData] = useState(initialRankingsData || {});
  const [statsData, setStatsData] = useState([]);

  useEffect(() => {
    if (initialRankingsData) {
      setRankingsData(initialRankingsData);
    }
  }, [initialRankingsData]);

  // Fetch stats when league changes
  useEffect(() => {
    if (!selectedLeague) {
      setStatsData([]);
      return;
    }

    const fetchStats = async () => {
      try {
        const statsFile = selectedLeague.endsWith('_mur') || selectedLeague.endsWith('_gra') || selectedLeague.includes('_div_mur') || selectedLeague.includes('_div_gra')
          ? `${selectedLeague}_stats.json`
          : `${selectedLeague}_stats.json`;
        
        // Use the relative path to public folder
        const response = await fetch(`/stats/${statsFile}`);
        if (response.ok) {
          const data = await response.json();
          setStatsData(data);
        } else {
          setStatsData([]);
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
        setStatsData([]);
      }
    };

    fetchStats();
  }, [selectedLeague]);

  // Teams to populate the H2H dropdown based on selected league
  const leagueTeams = useMemo(() => {
    if (!selectedLeague || !rankingsData[selectedLeague]) return [];
    
    return rankingsData[selectedLeague].map(team => ({
      id: team.equipo,
      name: team.equipo,
      puntos: team.puntos,
      logo: team.logo,
      evolucion: team.evolucion || []
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedLeague, rankingsData]);

  // Base ELO Probabilities Calculation for MatrixChart
  const matchData = useMemo(() => {
    if (!selectedTeamA || !selectedTeamB || !leagueTeams.length) return null;
    
    const teamA = leagueTeams.find(t => t.id === selectedTeamA);
    const teamB = leagueTeams.find(t => t.id === selectedTeamB);
    
    if (!teamA || !teamB) return null;

    // ELO Math: 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
    const probHome = 1 / (1 + Math.pow(10, ((teamB.puntos - teamA.puntos) / 400)));
    const probAway = 1 / (1 + Math.pow(10, ((teamA.puntos - teamB.puntos) / 400)));

    return {
      equipoHome: teamA.name,
      logoHome: teamA.logo,
      equipoAway: teamB.name,
      logoAway: teamB.logo,
      probHome,
      probAway,
      evolucionHome: teamA.evolucion,
      evolucionAway: teamB.evolucion
    };
  }, [selectedTeamA, selectedTeamB, leagueTeams]);

  return (
    <motion.div 
      className="home-container"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
    >
      <div className="filters-section">
        <h1 className="section-title">{t('home.title')}</h1>
        <div className="league-selector-wrapper">
          <CustomSelect 
            label={t('home.select_league')}
            options={LEAGUES}
            value={selectedLeague}
            onChange={setSelectedLeague}
            placeholder={t('home.choose_league')}
          />
        </div>

        <AnimatePresence>
          {selectedLeague && (
            <motion.div 
              className="teams-selector-wrapper"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="subsection-title">{t('home.h2h_title')}</h3>
              <div className="teams-grid">
                <CustomSelect 
                  label={t('home.team_home')}
                  options={leagueTeams.filter(team => team.id !== selectedTeamB)}
                  value={selectedTeamA}
                  onChange={setSelectedTeamA}
                  placeholder={t('home.select_team_1')}
                />
                <div className="vs-badge">VS</div>
                <CustomSelect 
                  label={t('home.team_away')}
                  options={leagueTeams.filter(team => team.id !== selectedTeamA)}
                  value={selectedTeamB}
                  onChange={setSelectedTeamB}
                  placeholder={t('home.select_team_2')}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Poisson Matrix Chart rendered when both teams are selected */}
      <AnimatePresence>
        {matchData && (
            <motion.div 
              className="analysis-dashboard-matrix"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginTop: '2rem' }}
            >
              <MatrixChart 
                equipoHome={matchData.equipoHome}
                logoHome={matchData.logoHome}
                equipoAway={matchData.equipoAway}
                logoAway={matchData.logoAway}
                probHome={matchData.probHome}
                probAway={matchData.probAway}
                leagueId={selectedLeague}
              />
              
              <motion.div 
                className="scorers-comparison-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '2rem',
                  marginTop: '2rem'
                }}
              >
                <TeamScorers teamName={matchData.equipoHome} scorersData={statsData} />
                <TeamScorers teamName={matchData.equipoAway} scorersData={statsData} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <PointsEvolution 
                  teamA={matchData.equipoHome} 
                  teamB={matchData.equipoAway} 
                  evolutionA={matchData.evolucionHome}
                  evolutionB={matchData.evolucionAway}
                />
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLeague && rankingsData[selectedLeague] && (
          <motion.div 
            className="analysis-dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Leaderboard rankings={rankingsData[selectedLeague]} leagueId={selectedLeague} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
