import React from 'react';
import './Leaderboard.css';
import murciaFlag from '../../assets/murcia_flag.jpeg';
import granadaFlag from '../../assets/granada_flag.png';
import { useTranslation } from '../../hooks/useTranslation';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite, isFavoritesLoading } from '../../stores/favoritesStore';
import { Star } from 'lucide-react';

// Este componente se encarga de mostrar la tabla clasificatoria de la liga seleccionada
const Leaderboard = ({ rankings = [], leagueId = '' }) => {
  const { t } = useTranslation();
  // Uso Nanostores para acceder al estado de mis equipos favoritos de forma global y reactiva
  const favorites = useStore(favoritesStore);
  const isLoading = useStore(isFavoritesLoading);
  
  // Determino qué bandera usar como imagen por defecto si el equipo no tiene logo propio
  const defaultFlag = leagueId.includes('_gra') || leagueId.includes('veteranos_gra') ? granadaFlag : murciaFlag;
  const flagSrc = typeof defaultFlag === 'object' ? defaultFlag.src : defaultFlag;

  // Función rápida para comprobar si un equipo ya está en mi lista de favoritos
  const isFav = (teamName) => favorites.some(f => f.team_name === teamName && f.league_id === leagueId);

  // Si no hay datos, muestro un mensaje amigable al usuario
  if (!rankings || rankings.length === 0) {
    return (
      <div className="leaderboard-empty">
        <p>{t('leaderboard.empty')}</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">{t('leaderboard.title')}</h2>
      
      {/* Cabecera de la tabla con las columnas principales */}
      <div className="leaderboard-header">
        <span className="header-col-rank">{t('leaderboard.col_rank')}</span>
        <span className="header-col-team">{t('leaderboard.col_team')}</span>
        <span className="header-col-pts">{t('leaderboard.col_pts')}</span>
      </div>

      <div className="leaderboard-body">
        {rankings.map((team, index) => (
          <div key={team.equipo} className="leaderboard-row">
            {/* Columna de Posición con medallas visuales para el Top 3 */}
            <div className="col-rank">
              <div className={`rank-badge ${index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : index === 2 ? 'rank-third' : ''}`}>
                #{team.posicion}
              </div>
            </div>

            {/* Columna de Equipo con nombre, logo y botón de favoritos */}
            <div className="col-team">
              <span 
                className={`favorite-star ${isFav(team.equipo) ? 'active' : ''}`}
                // Al hacer clic, guardo o quito el equipo de mis favoritos (Supabase + Nanostores)
                onClick={() => !isLoading && toggleFavorite(team.equipo, leagueId)}
                title={isFav(team.equipo) ? "Quitar de Mis favoritos" : "Añadir a Mis favoritos"}
              >
                <Star 
                  size={18} 
                  fill={isFav(team.equipo) ? "#000" : "transparent"} 
                  stroke={isFav(team.equipo) ? "#eab308" : "#9ca3af"} 
                  strokeWidth={2}
                />
              </span>
              <img
                // Si el equipo no tiene logo, "pinto" la bandera de su provincia por defecto
                src={team.logo || flagSrc}
                alt={team.equipo}
                className="team-logo-image"
                onError={(e) => { e.target.src = flagSrc; }}
              />
              <span className="team-name">{team.equipo}</span>
            </div>

            {/* Columna de Puntos ELO: el valor que calcula mi sistema en Python */}
            <div className="col-pts">
              <span className="pts-value">{team.puntos}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
