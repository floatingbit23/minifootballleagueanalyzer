import React from 'react';
import './TeamScorers.css';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import defaultTeamLogo from '../../assets/default_team_logo.png';

const TeamScorers = ({ teamName, scorersData = [] }) => {
  const { t } = useTranslation();
  
  // Extraemos la ruta optimizada (Astro/Vite) del logo por defecto
  const defaultLogoSrc = typeof defaultTeamLogo === 'object' ? defaultTeamLogo.src : defaultTeamLogo;

  // Filter scorers for this team and take top 5
  const topScorers = scorersData
    .filter(player => player.equipo.toLowerCase() === teamName.toLowerCase())
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 5);

  return (
    <div className="team-scorers-container">
      <h3 className="team-scorers-title">{t('scorers.title')}: {teamName}</h3>

      <div className="scorers-list">
        {topScorers.length > 0 ? (
          topScorers.map((player, index) => (
            <motion.div
              key={`${player.nombre}-${index}`}
              className="scorer-row"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="scorer-info">
                <img
                  src={player.avatar || defaultLogoSrc}
                  alt={player.nombre}
                  className="scorer-avatar"
                  onError={(e) => { e.target.src = defaultLogoSrc; }}
                />
                <span className="scorer-name" title={player.nombre}>{player.nombre}</span>
              </div>

              <div className="scorer-goals-badge">
                <span className="goals-count">{player.goles}</span>
                <span className="goals-label">{t('scorers.goals')}</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="empty-scorers">
            {t('scorers.empty')}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamScorers;
