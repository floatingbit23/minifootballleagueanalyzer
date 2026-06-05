import React from 'react';
import PropTypes from 'prop-types';
import './Leaderboard.css';
import murciaFlag from '../../assets/murcia_flag.jpeg';
import granadaFlag from '../../assets/granada_flag.png';
import { useTranslation } from '../../hooks/useTranslation';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite, isFavoritesLoading } from '../../stores/favoritesStore';
import { Star, ChevronUp, ChevronDown } from 'lucide-react';

// Este componente se encarga de mostrar la tabla clasificatoria de la liga seleccionada
// Ahora también recibe los equipos seleccionados en el H2H para filtrarlos y resaltarlos
const Leaderboard = ({ rankings = [], leagueId = '', selectedTeamA = '', selectedTeamB = '' }) => {
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

      {/* Contenedor con scroll horizontal para móviles */}
      <div className="leaderboard-scroll-area">
        <div className="leaderboard-content">
          <div className="leaderboard-header">
            <span className="header-col-rank">{t('leaderboard.col_rank')}</span>
            <span className="header-col-team">{t('leaderboard.col_team')}</span>
            <span className="header-col-pts">{t('leaderboard.col_pts')}</span>
            <span className="header-col-pts">{t('leaderboard.col_real_pts')}</span>
          </div>

          <div className="leaderboard-body">
            {rankings.map((team, index) => {
              // Compruebo si este equipo es uno de los elegidos para el H2H
              // Solo lo resalto si AMBOS están seleccionados para que tenga sentido visualmente
              const isH2H = (team.equipo === selectedTeamA || team.equipo === selectedTeamB) && selectedTeamA && selectedTeamB;

              // Obtener la clase de medalla según la posición en la tabla
              let rankClass = '';
              if (index === 0) {
                rankClass = 'rank-first';
              } else if (index === 1) {
                rankClass = 'rank-second';
              } else if (index === 2) {
                rankClass = 'rank-third';
              }

              return (
                <div
                  key={team.equipo}
                  className={`leaderboard-row ${isH2H ? 'h2h-highlight' : ''}`}
                >
                  {/* Columna de Posición con medallas visuales para el Top 3 */}
                  <div className="col-rank">
                    <div className={`rank-badge ${rankClass}`}>
                      #{team.posicion}
                    </div>
                  </div>

                  {/* Columna de Equipo con nombre, logo y botón de favoritos */}
                  <div className="col-team">
                    <button
                      type="button"
                      className={`favorite-star ${isFav(team.equipo) ? 'active' : ''}`}
                      // Al hacer clic, guardo o quito el equipo de mis favoritos (Supabase + Nanostores)
                      onClick={() => !isLoading && toggleFavorite(team.equipo, leagueId)}
                      title={isFav(team.equipo) ? "Quitar de Mis favoritos" : "Añadir a Mis favoritos"}
                      aria-label={isFav(team.equipo) ? "Quitar de Mis favoritos" : "Añadir a Mis favoritos"}
                    >
                      <Star
                        size={18}
                        fill={isFav(team.equipo) ? "#000" : "transparent"}
                        stroke={isFav(team.equipo) ? "#eab308" : "#9ca3af"}
                        strokeWidth={2}
                      />
                    </button>
                    <img
                      // Si el equipo no tiene logo, "pinto" la bandera de su provincia por defecto
                      src={team.logo || flagSrc}
                      alt={team.equipo}
                      className="team-logo-image"
                      // Lazy Loading para no descargar logos fuera de la pantalla visible
                      loading="lazy"
                      // Dimensiones explícitas para evitar layout shift (CLS)
                      width={32}
                      height={32}
                      onError={(e) => { e.target.src = flagSrc; }}
                    />
                    <span className="team-name">
                      {team.equipo}
                      {/* Comparo mi Power Ranking (ELO) con la clasificación real */}
                      {team.posicion < team.posicion_real && (
                        <ChevronUp
                          size={18}
                          className="rank-icon better"
                          title={`Mejor en ELO que en liga: #${team.posicion_real} real`}
                        />
                      )}
                      {team.posicion > team.posicion_real && (
                        <ChevronDown
                          size={18}
                          className="rank-icon worse"
                          title={`Peor en ELO que en liga: #${team.posicion_real} real`}
                        />
                      )}
                      {team.posicion === team.posicion_real && (
                        <span
                          className="rank-icon equal"
                          title="Misma posición en ELO y liga"
                        >
                          🟰
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Columna de Puntos ELO: el valor que calcula mi sistema en Python */}
                  <div className="col-pts">
                    <span className="pts-value">{team.puntos}</span>
                  </div>

                  {/* Columna de Puntos Reales de la Clasificación */}
                  <div className="col-pts col-real-pts">
                    <span className="real-pts-value">{team.puntos_reales}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="leaderboard-legend">
            <div className="legend-item">
              <ChevronUp size={14} className="rank-icon better" />
              <span>{t('leaderboard.legend_over')}</span>
            </div>
            <div className="legend-item">
              <ChevronDown size={14} className="rank-icon worse" />
              <span>{t('leaderboard.legend_under')}</span>
            </div>
            <div className="legend-item">
              <span className="rank-icon equal">🟰</span>
              <span>{t('leaderboard.legend_equal')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Leaderboard.propTypes = {
  rankings: PropTypes.array,
  leagueId: PropTypes.string,
  selectedTeamA: PropTypes.string,
  selectedTeamB: PropTypes.string,
};

export default Leaderboard;
