import React, { useMemo } from 'react';
import './MatrixChart.css';
import { motion } from 'framer-motion';
import murciaFlag from '../../assets/murcia_flag.jpeg';
import granadaFlag from '../../assets/granada_flag.png';
import { useTranslation } from '../../hooks/useTranslation';

// IMPLEMENTO mi propia función para calcular factoriales (necesaria para la fórmula de Poisson)
const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

// IMPLEMENTO la fórmula de probabilidad de Poisson para predecir la probabilidad de que ocurran 'k' goles
const poissonProbability = (xg, k) => {
  return (Math.exp(-xg) * Math.pow(xg, k)) / factorial(k);
};

const MatrixChart = ({ equipoHome, logoHome, equipoAway, logoAway, probHome, probAway, leagueId = '' }) => {
  const { t } = useTranslation();
  // Configuro la bandera por defecto según la zona de la liga (Murcia o Granada)
  const defaultFlag = leagueId.includes('_gra') || leagueId.includes('veteranos_gra') ? granadaFlag : murciaFlag;
  const flagSrc = typeof defaultFlag === 'object' ? defaultFlag.src : defaultFlag;

  // Calculo los Goles Esperados (xG) multiplicando la probabilidad de victoria por la media de 5 goles
  // Esta es la misma lógica que utilizaba en mis simulaciones de Python
  const xgHome = 5.0 * probHome;
  const xgAway = 5.0 * probAway;
  const maxGoles = 7; // Genero una matriz de resultados posibles desde el 0-0 hasta el 6-6

  // Calculo toda la matriz de probabilidades conjuntas y la normalizo para que sume 100%
  const matrixData = useMemo(() => {
    let homeWinProb = 0;
    let drawProb = 0;
    let awayWinProb = 0;
    const cells = [];

    // Recorro todas las combinaciones posibles de goles (h = local, a = visitante)
    for (let h = 0; h < maxGoles; h++) {
      for (let a = 0; a < maxGoles; a++) {
        // Calculo la probabilidad de que el local marque 'h' y el visitante marque 'a'
        const probH = poissonProbability(xgHome, h);
        const probA = poissonProbability(xgAway, a);
        const probConjunta = probH * probA * 100;

        // Clasifico el resultado para el resumen de los paneles laterales
        let type = 'draw';
        if (h > a) {
          homeWinProb += probConjunta;
          type = 'home';
        } else if (a > h) {
          awayWinProb += probConjunta;
          type = 'away';
        } else {
          drawProb += probConjunta;
        }

        // Solo guardo para mostrar las celdas con una probabilidad mayor al 0.1% o marcadores básicos
        if (probConjunta >= 0.1 || (h <= 3 && a <= 3)) {
          cells.push({ h, a, prob: probConjunta, type });
        }
      }
    }

    // Normalizo los resultados globales para que el total capturado en el 7x7 sea el 100% visual
    const totalCapturedProb = homeWinProb + drawProb + awayWinProb;
    const normalizedHomeWin = (homeWinProb / totalCapturedProb) * 100;
    const normalizedDraw = (drawProb / totalCapturedProb) * 100;
    const normalizedAwayWin = (awayWinProb / totalCapturedProb) * 100;

    // Ajusto cada celda individualmente con la escala normalizada
    const normalizedCells = cells.map(cell => ({
      ...cell,
      prob: (cell.prob / totalCapturedProb) * 100
    }));

    // Identifico cuál es el resultado más probable de todos para destacarlo en la tabla
    const maxProb = normalizedCells.reduce((max, cell) => Math.max(max, cell.prob), 0);

    return {
      cells: normalizedCells,
      homeWinProb: normalizedHomeWin,
      drawProb: normalizedDraw,
      awayWinProb: normalizedAwayWin,
      xgHome,
      xgAway,
      maxProb
    };
  }, [xgHome, xgAway, probHome, probAway]);

  return (
    <div className="matrix-chart-wrapper">
      <div className="matrix-header">
        <h3>{t('matrix.title')}</h3>
      </div>

      <div className="matrix-content">
        {/* Renderizo la cuadrícula principal de resultados exactos */}
        <div className="matrix-main-grid">
          {matrixData.cells.map((cell) => {
            // Marco como 'golden' la celda que tiene la probabilidad más alta
            const isGolden = cell.prob === matrixData.maxProb;

            return (
              <motion.div
                key={`${cell.h}-${cell.a}`}
                className={`matrix-cell type-${cell.type} ${isGolden ? 'golden' : ''}`}
                style={{
                  gridColumn: cell.a + 1, // El eje X representa los goles del Visitante
                  gridRow: cell.h + 1,    // El eje Y representa los goles del Local
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: (cell.h + cell.a) * 0.05 }}
              >
                <span className="cell-score">{cell.h} - {cell.a}</span>
                <span className="cell-prob">{cell.prob < 0.1 ? '<0.1%' : `${cell.prob.toFixed(1)}%`}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Muestro los paneles laterales con las probabilidades globales de 1, X y 2 */}
        <div className="matrix-side-panels">
          <div className="panel-box panel-home">
            <span className="panel-prob">{matrixData.homeWinProb.toFixed(1)}%</span>
            <span className="panel-title">{t('matrix.win_home')}</span>
            {logoHome && <img src={logoHome} alt={equipoHome} className="panel-logo" onError={(e) => { e.target.src = flagSrc; }} />}
            <span className="panel-team">{equipoHome?.substring(0, 15)}</span>
            <span className="panel-xg">{matrixData.xgHome.toFixed(2)} xG</span>
          </div>

          <div className="panel-box panel-draw">
            <span className="panel-prob">{matrixData.drawProb.toFixed(1)}%</span>
            <span className="panel-title">{t('matrix.draw')}</span>
          </div>

          <div className="panel-box panel-away">
            <span className="panel-prob">{matrixData.awayWinProb.toFixed(1)}%</span>
            <span className="panel-title">{t('matrix.win_away')}</span>
            {logoAway && <img src={logoAway} alt={equipoAway} className="panel-logo" onError={(e) => { e.target.src = flagSrc; }} />}
            <span className="panel-team">{equipoAway?.substring(0, 15)}</span>
            <span className="panel-xg">{matrixData.xgAway.toFixed(2)} xG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixChart;
