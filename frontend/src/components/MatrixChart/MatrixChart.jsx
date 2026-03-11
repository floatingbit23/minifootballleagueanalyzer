import React, { useMemo } from 'react';
import './MatrixChart.css';
import { motion } from 'framer-motion';

// Función para calcular factorial (memoizada implícitamente por el tamaño pequeño)
const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

// Función para calcular la probabilidad de Poisson
const poissonProbability = (xg, k) => {
  return (Math.exp(-xg) * Math.pow(xg, k)) / factorial(k);
};

const MatrixChart = ({ equipoHome, logoHome, equipoAway, logoAway, probHome, probAway }) => {
  // Asumimos 5.0 goles por partido como media (la misma lógica que tenías en Python)
  const xgHome = 5.0 * probHome;
  const xgAway = 5.0 * probAway;
  const maxGoles = 7; // Calculamos del 0-0 al 6-6

  // Calculamos la matriz interactiva
  const matrixData = useMemo(() => {
    let homeWinProb = 0;
    let drawProb = 0;
    let awayWinProb = 0;
    const cells = [];

    for (let h = 0; h < maxGoles; h++) {
      for (let a = 0; a < maxGoles; a++) {
        const probH = poissonProbability(xgHome, h);
        const probA = poissonProbability(xgAway, a);
        const probConjunta = probH * probA * 100; // Porcentaje interactivo

        // Clasificación de la victoria
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

        // Solo mostramos celdas significativas (más del 0.1% a menos que sean resultados pequeños)
        if (probConjunta >= 0.1 || (h <= 3 && a <= 3)) {
          cells.push({ h, a, prob: probConjunta, type });
        }
      }
    }

    // Calculate total probability captured in the 7x7 grid to normalize everything to 100%
    const totalCapturedProb = homeWinProb + drawProb + awayWinProb;
    const normalizedHomeWin = (homeWinProb / totalCapturedProb) * 100;
    const normalizedDraw = (drawProb / totalCapturedProb) * 100;
    const normalizedAwayWin = (awayWinProb / totalCapturedProb) * 100;

    // Normalizamos también las celdas para que sus porcentajes reflejen la realidad sin el corte
    const normalizedCells = cells.map(cell => ({
      ...cell,
      prob: (cell.prob / totalCapturedProb) * 100
    }));

    // Find the maximum probability among the normalized cells to highlight it
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
        <h3>Probabilidad de Resultados Exactos</h3>
        <p>Distribución de Poisson basada en ELO</p>
      </div>

      <div className="matrix-content">
        {/* Renderizamos el panel izquierdo centralizado */}
        <div className="matrix-main-grid">
          {matrixData.cells.map((cell) => {
            // Highlight the cell with the highest probability dynamically
            const isGolden = cell.prob === matrixData.maxProb;

            return (
              <motion.div
                key={`${cell.h}-${cell.a}`}
                className={`matrix-cell type-${cell.type} ${isGolden ? 'golden' : ''}`}
                style={{
                  gridColumn: cell.a + 1, // X = Away goals
                  gridRow: cell.h + 1,    // Y = Home goals
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

        {/* Paneles laterales de resumen */}
        <div className="matrix-side-panels">
          <div className="panel-box panel-home">
            <span className="panel-prob">{matrixData.homeWinProb.toFixed(1)}%</span>
            <span className="panel-title">VICTORIA LOCAL</span>
            {logoHome && <img src={logoHome} alt={equipoHome} className="panel-logo" />}
            <span className="panel-team">{equipoHome?.substring(0, 15)}</span>
            <span className="panel-xg">{matrixData.xgHome.toFixed(2)} xG</span>
          </div>

          <div className="panel-box panel-draw">
            <span className="panel-prob">{matrixData.drawProb.toFixed(1)}%</span>
            <span className="panel-title">EMPATE</span>
          </div>

          <div className="panel-box panel-away">
            <span className="panel-prob">{matrixData.awayWinProb.toFixed(1)}%</span>
            <span className="panel-title">VICTORIA VISITANTE</span>
            {logoAway && <img src={logoAway} alt={equipoAway} className="panel-logo" />}
            <span className="panel-team">{equipoAway?.substring(0, 15)}</span>
            <span className="panel-xg">{matrixData.xgAway.toFixed(2)} xG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixChart;
