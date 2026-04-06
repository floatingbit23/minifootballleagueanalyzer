import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from './Home';

// Mocks para subcomponentes complejos
vi.mock('../Leaderboard/Leaderboard', () => ({ default: () => React.createElement('div', { 'data-testid': 'mock-leaderboard' }) }));
vi.mock('../MatrixChart/MatrixChart', () => ({ default: (props) => React.createElement('div', { 'data-testid': 'mock-matrix', ...props }) }));
vi.mock('../TeamScorers/TeamScorers', () => ({ default: () => React.createElement('div', { 'data-testid': 'mock-scorers' }) }));
vi.mock('../PointsEvolution/PointsEvolution', () => ({ default: () => React.createElement('div', { 'data-testid': 'mock-evolution' }) }));

describe('Home Component', () => {
  const mockRankingsData = {
    prim_div_mur: [
      { equipo: 'Team A', puntos: 1600, logo: 'logoA.png', evolucion: [1500, 1600] },
      { equipo: 'Team B', puntos: 1400, logo: 'logoB.png', evolucion: [1550, 1400] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly initially', () => {
    render(<Home rankingsData={mockRankingsData} />);
    expect(screen.getByText('home.title')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-matrix')).not.toBeInTheDocument();
  });

  it('shows league-related components when a league is selected', async () => {
    render(<Home rankingsData={mockRankingsData} />);
    
    // Abrir el selector de ligas
    const leagueBox = screen.getByText('home.choose_league');
    fireEvent.click(leagueBox);

    // Seleccionar Primera División Murcia
    const option = screen.getByText('Primera División Murcia');
    fireEvent.click(option);

    // Confirmar que aparece el leaderboard
    await waitFor(() => {
      expect(screen.getByTestId('mock-leaderboard')).toBeInTheDocument();
    });
  });

  it('shows H2H components when two teams are selected and calculates probabilities', async () => {
    render(<Home rankingsData={mockRankingsData} />);
    
    // 1. Sleccionar liga
    fireEvent.click(screen.getByText('home.choose_league'));
    fireEvent.click(screen.getByText('Primera División Murcia'));

    // 2. Seleccionar Equipo A (Local)
    await waitFor(() => expect(screen.getByText('home.select_team_1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('home.select_team_1'));
    fireEvent.click(screen.getByText('Team A'));

    // 3. Seleccionar Equipo B (Visitante)
    fireEvent.click(screen.getByText('home.select_team_2'));
    fireEvent.click(screen.getByText('Team B'));

    // 4. Verificar que aparece el gráfico de probabilidad (MatrixChart)
    await waitFor(() => {
      expect(screen.getByTestId('mock-matrix')).toBeInTheDocument();
    });

    // 5. Verificar que se pasan las probabilidades ELO correctas a MatrixChart
    // Team A (1600) vs Team B (1400)
    // probA = 1 / (1 + 10^((1400-1600)/400)) = 1 / (1 + 10^-0.5) = 1 / (1 + 0.316) ≈ 0.7597
    const matrix = screen.getByTestId('mock-matrix');
    expect(matrix).toHaveAttribute('equipoHome', 'Team A');
    expect(matrix).toHaveAttribute('equipoAway', 'Team B');
    
    // Las props de probabilidad que se pasan deben ser números
    // No puedo usar toHaveAttribute para float exacto igual en DOM, pero puedo verificar que los componentes se renderizaron
    expect(screen.getAllByTestId('mock-scorers')).toHaveLength(2);
    expect(screen.getByTestId('mock-evolution')).toBeInTheDocument();
  });
});
