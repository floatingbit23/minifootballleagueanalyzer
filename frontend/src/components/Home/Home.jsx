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

// Defino mi lista oficial de ligas con sus IDs correspondientes a mis archivos JSON y sus banderas
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


// Método estático que devuelve una pieza de interfaz (HTML)

// Componente CustomSelect para seleccionar una liga o un equipo (mejor que un select estándar)

const CustomSelect = ({ label, options, value, onChange, placeholder }) => {

  const [isOpen, setIsOpen] = useState(false); // Estado para controlar si el desplegable está abierto o cerrado

  // Busco cuál es la opción que el usuario tiene seleccionada actualmente
  const selectedOption = options.find((opt) => opt.id === value);

  // Función auxiliar para manejar si el asset es un objeto (object) de Astro o una URL directa (string)
  const getAssetSrc = (asset) => typeof asset === 'object' ? asset.src : asset; // si es un objeto de Astro, cojo el 'src', si no, cojo el asset directamente

  // Preparo el contenido visual de lo que se ve en la caja del selector
  // Uso un operador ternario para mostrar la bandera y el nombre de la opción seleccionada, o el placeholder si no hay ninguna opción seleccionada

  const displayValue = selectedOption ? ( // Si hay una opción seleccionada, muestro su bandera y su nombre
    <div className="select-value-with-icon">
      {selectedOption.flag && <img src={getAssetSrc(selectedOption.flag)} alt="" className="select-flag" />}
      {selectedOption.logo && <img src={getAssetSrc(selectedOption.logo)} alt="" className="select-logo" />}
      <span>{selectedOption.name}</span>
    </div>
  ) : (
    <span>{placeholder}</span> // Si no hay ninguna opción seleccionada, muestro el placeholder
  );

  return ( // Devuelvo la estructura HTML del componente

    <div className="custom-select-container">
      <label className="select-label">{label}</label>
      <div className="custom-select-box" onClick={() => setIsOpen(!isOpen)}>
        {/* Muestro el valor seleccionado (bandera + nombre) o el placeholder si no hay nada seleccionado */}
        {displayValue}

        {/* Uso Framer Motion para animar la flechita cuando el selector se abre o cierra */}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} className="chevron-icon" />
        </motion.div>
      </div>

      {/* Uso AnimatePresence para manejar la entrada y salida del desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="select-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.map((opt) => ( // Mapeo cada opción para crear un div con su bandera y nombre

              <div
                key={opt.id} // Clave única para cada opción
                className={`select-option ${value === opt.id ? 'selected' : ''}`} // Clase para marcar la opción seleccionada

                onClick={() => { // Función que se ejecuta cuando el usuario hace clic en una opción
                  onChange(opt.id); // Actualizo el valor seleccionado
                  setIsOpen(false); // Cierro el desplegable
                }}
              >

                {opt.flag && <img src={getAssetSrc(opt.flag)} alt="" className="select-flag" />} {/* Muestro la bandera si existe */}
                {opt.logo && <img src={getAssetSrc(opt.logo)} alt="" className="select-logo" />} {/* Muestro el logo si existe */}
                <span>{opt.name}</span> {/* Muestro el nombre de la opción */}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Este es mi componente principal que orquesta toda la lógica de la página de inicio
const Home = ({ rankingsData: initialRankingsData }) => {
  const { t } = useTranslation();
  // Gestiono los estados para saber qué liga y qué equipos están seleccionados para el H2H
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [rankingsData, setRankingsData] = useState(initialRankingsData || {});
  const [statsData, setStatsData] = useState([]);

  // Sincronizo los datos iniciales que vienen desde Astro (servidor) con mi estado de React
  useEffect(() => {
    if (initialRankingsData) {
      setRankingsData(initialRankingsData);
    }
  }, [initialRankingsData]);

  // Lanzo una petición fetch cada vez que el usuario cambia de liga para traer los goleadores (Pichichi)
  useEffect(() => {
    if (!selectedLeague) {
      setStatsData([]);
      return;
    }

    const fetchStats = async () => {
      try {
        const statsFile = `${selectedLeague}_stats.json`;

        // Busco el archivo en la carpeta pública del servidor
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
    // Reseteo los equipos seleccionados al cambiar de liga para evitar errores
    setSelectedTeamA('');
    setSelectedTeamB('');
  }, [selectedLeague]);

  // Filtro y preparo la lista de equipos de la liga seleccionada para rellenar los desplegables
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

  // Calculo las probabilidades de victoria basadas en ELO (Head-to-Head) de forma instantánea
  const matchData = useMemo(() => {
    if (!selectedTeamA || !selectedTeamB || !leagueTeams.length) return null;

    const teamA = leagueTeams.find(t => t.id === selectedTeamA);
    const teamB = leagueTeams.find(t => t.id === selectedTeamB);

    if (!teamA || !teamB) return null;

    // Implemento la misma fórmula ELO que usaba en Python: 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
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
          {/* Renderizo mi selector de liga personalizado */}
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
                {/* Elijo el equipo Local (filtrando para que no sea igual al Visitante) */}
                <CustomSelect
                  label={t('home.team_home')}
                  options={leagueTeams.filter(team => team.id !== selectedTeamB)}
                  value={selectedTeamA}
                  onChange={setSelectedTeamA}
                  placeholder={t('home.select_team_1')}
                />
                <div className="vs-badge">VS</div>
                {/* Elijo el equipo Visitante (filtrando para que no sea igual al Local) */}
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

      <AnimatePresence>
        {matchData && (
          <motion.div
            className="analysis-dashboard-matrix"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginTop: '2rem' }}
          >
            {/* Renderizo la Matriz de Poisson (Cuotas) solo si hay dos equipos seleccionados */}
            <MatrixChart
              equipoHome={matchData.equipoHome}
              logoHome={matchData.logoHome}
              equipoAway={matchData.equipoAway}
              logoAway={matchData.logoAway}
              probHome={matchData.probHome}
              probAway={matchData.probAway}
              leagueId={selectedLeague}
            />

            {/* Renderizo la tabla de Goleadores solo si hay dos equipos seleccionados */}
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
              {/* Comparo los goleadores de ambos equipos cara a cara */}
              <TeamScorers teamName={matchData.equipoHome} scorersData={statsData} />
              <TeamScorers teamName={matchData.equipoAway} scorersData={statsData} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {/* Muestro la gráfica comparativa de evolución de puntos Elo */}
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
            {/* Finalmente, renderizo el Leaderboard (Clasificación ELO) de la liga seleccionada */}
            <Leaderboard rankings={rankingsData[selectedLeague]} leagueId={selectedLeague} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
