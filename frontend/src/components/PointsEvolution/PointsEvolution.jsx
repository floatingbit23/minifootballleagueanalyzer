import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTranslation } from '../../hooks/useTranslation';
import './PointsEvolution.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PointsEvolution = ({ teamA, teamB, evolutionA = [], evolutionB = [] }) => {
  const { t, language } = useTranslation();

  // Calcular quién está en mejor forma (puntos en los últimos 4 partidos)
  const getShape = (evolution) => {
    if (evolution.length < 2) return 0;
    const lastIdx = evolution.length - 1;
    const startIdx = Math.max(0, lastIdx - 4);
    return evolution[lastIdx] - evolution[startIdx];
  };

  const shapeA = getShape(evolutionA);
  const shapeB = getShape(evolutionB);

  let bestShapeText = "";
  if (shapeA > shapeB) {
    bestShapeText = t('progression.better_shape').replace('{team}', teamA);
  } else if (shapeB > shapeA) {
    bestShapeText = t('progression.better_shape').replace('{team}', teamB);
  } else {
    bestShapeText = t('progression.equal_shape');
  }

  const maxJornadas = Math.max(evolutionA.length, evolutionB.length);
  const labels = Array.from({ length: maxJornadas }, (_, i) => `${t('progression.matchday')} ${i}`);

  const data = {
    labels,
    datasets: [
      {
        label: teamA,
        data: evolutionA,
        borderColor: '#D62828',
        backgroundColor: 'rgba(214, 40, 40, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#D62828',
      },
      {
        label: teamB,
        data: evolutionB,
        borderColor: '#1783bdff',
        backgroundColor: 'rgba(0, 48, 73, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#1783bdff',
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0',
          font: {
            family: "'Inter', sans-serif",
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        suggestedMin: 1200,
        suggestedMax: 1800,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#94a3b8',
          stepSize: 50
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8'
        }
      }
    }
  };

  return (
    <div className="progression-container">
      <div className="progression-header">
        <h3 className="progression-title">{t('progression.title')}</h3>
        <p className="progression-shape-text">{bestShapeText}</p>
      </div>

      <div className="chart-container-evolution">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default PointsEvolution;
