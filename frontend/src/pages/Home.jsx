import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Home.css';
import { ChevronDown } from 'lucide-react';
import murciaFlag from '../assets/murcia_flag.jpeg';
import Leaderboard from '../components/Leaderboard/Leaderboard';
import MatrixChart from '../components/MatrixChart/MatrixChart';

const LEAGUES = [
  { id: 'prim_div_mur', name: 'Primera División Murcia', flag: murciaFlag },
  { id: 'seg_div_murA', name: 'Segunda División A Murcia', flag: murciaFlag },
  { id: 'seg_div_murB', name: 'Segunda División B Murcia', flag: murciaFlag },
  { id: 'ter_div_murA', name: 'Tercera División A Murcia', flag: murciaFlag },
  { id: 'ter_div_murB', name: 'Tercera División B Murcia', flag: murciaFlag },
  { id: 'cuar_div_mur', name: 'Cuarta División Murcia', flag: murciaFlag }
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
  const displayValue = selectedOption ? (
    <div className="select-value-with-icon">
      {selectedOption.flag && <img src={selectedOption.flag} alt="" className="select-flag" />}
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
                {opt.flag && <img src={opt.flag} alt="" className="select-flag" />}
                <span>{opt.name}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Home = () => {
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [rankingsData, setRankingsData] = useState({});

  useEffect(() => {
    fetch('/elo_rankings.json')
      .then((res) => res.json())
      .then((data) => setRankingsData(data))
      .catch((err) => console.error('Error cargando elo_rankings.json:', err));
  }, []);

  // Teams to populate the H2H dropdown based on selected league
  const leagueTeams = useMemo(() => {
    if (!selectedLeague || !rankingsData[selectedLeague]) return [];
    
    return rankingsData[selectedLeague].map(team => ({
      id: team.equipo,
      name: team.equipo,
      puntos: team.puntos,
      logo: team.logo
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
      probAway
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
        <h2 className="section-title">Análisis de Competición</h2>
        <div className="league-selector-wrapper">
          <CustomSelect 
            label="Selecciona una Competición"
            options={LEAGUES}
            value={selectedLeague}
            onChange={setSelectedLeague}
            placeholder="Elige una liga..."
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
              <h3 className="subsection-title">Comparativa de Equipos (H2H)</h3>
              <div className="teams-grid">
                <CustomSelect 
                  label="Equipo Local"
                  options={leagueTeams}
                  value={selectedTeamA}
                  onChange={setSelectedTeamA}
                  placeholder="Selecciona el 1º equipo..."
                />
                <div className="vs-badge">VS</div>
                <CustomSelect 
                  label="Equipo Visitante"
                  options={leagueTeams}
                  value={selectedTeamB}
                  onChange={setSelectedTeamB}
                  placeholder="Selecciona el 2º equipo..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedLeague && rankingsData[selectedLeague] && (
          <motion.div 
            className="analysis-dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Leaderboard rankings={rankingsData[selectedLeague]} />
          </motion.div>
        )}
      </AnimatePresence>
      
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
              />
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
