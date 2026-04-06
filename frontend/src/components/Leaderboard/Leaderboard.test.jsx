import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock de Nanostores antes de importar el componente para evitar efectos secundarios
vi.mock('@nanostores/react', () => ({
  useStore: vi.fn((store) => {
    // Si la función 'store.get' existe, es un store de Nanostores
    return []; // Devolver array vacío para favoritos
  }),
}));

// Mock de la tienda de favoritos directamente para evitar inicializar Supabase
vi.mock('../../stores/favoritesStore', () => ({
  favoritesStore: { get: () => [], listen: () => () => {} },
  toggleFavorite: vi.fn(),
  isFavoritesLoading: { get: () => false, listen: () => () => {} }
}));

import Leaderboard from './Leaderboard';

describe('Leaderboard Component', () => {
  it('renders an empty state when no rankings are provided', () => {
    render(<Leaderboard rankings={[]} />);
    expect(screen.getByText('leaderboard.empty')).toBeInTheDocument();
  });

  it('renders the team names from rankings', () => {
    const mockRankings = [
      { equipo: 'Real Murcia', posicion: 1, puntos: 100, posicion_real: 1, puntos_reales: 100 },
      { equipo: 'Granada B', posicion: 2, puntos: 90, posicion_real: 2, puntos_reales: 90 },
    ];
    
    render(<Leaderboard rankings={mockRankings} leagueId="murcia_1" />);
    
    expect(screen.getByText('Real Murcia')).toBeInTheDocument();
    expect(screen.getByText('Granada B')).toBeInTheDocument();
  });

  it('displays the correct scores for teams', () => {
    const mockRankings = [
      { equipo: 'Team A', posicion: 1, puntos: 2500, posicion_real: 1, puntos_reales: 15 },
    ];
    
    render(<Leaderboard rankings={mockRankings} leagueId="league_a" />);
    
    expect(screen.getByText('2500')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
