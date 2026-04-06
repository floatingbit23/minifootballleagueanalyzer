import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MatrixChart from './MatrixChart';

describe('MatrixChart Component (Poisson)', () => {
  const defaultProps = {
    equipoHome: 'Local FC',
    equipoAway: 'Visitante CF',
    probHome: 0.5, // 50% prob
    probAway: 0.5, // 50% prob
    leagueId: 'murcia_1',
  };

  it('renders the component title', () => {
    render(<MatrixChart {...defaultProps} />);
    expect(screen.getByText('matrix.title')).toBeInTheDocument();
  });

  it('calculates and displays symmetric xG for equal probabilities', () => {
    render(<MatrixChart {...defaultProps} />);
    // xG = 5.0 * 0.5 = 2.50
    const xgElements = screen.getAllByText(/2.50 xG/);
    expect(xgElements).toHaveLength(2);
  });

  it('displays higher xG for the favorite team', () => {
    render(<MatrixChart {...defaultProps} probHome={0.8} probAway={0.2} />);
    // xG Home = 5 * 0.8 = 4.00
    // xG Away = 5 * 0.2 = 1.00
    expect(screen.getByText('4.00 xG')).toBeInTheDocument();
    expect(screen.getByText('1.00 xG')).toBeInTheDocument();
  });

  it('renders the result cells', () => {
    render(<MatrixChart {...defaultProps} />);
    // Debería haber celdas como 0 - 0, 1 - 0, 0 - 1
    expect(screen.getByText('0 - 0')).toBeInTheDocument();
    expect(screen.getByText('1 - 1')).toBeInTheDocument();
    expect(screen.getByText('2 - 1')).toBeInTheDocument();
  });

  it('highlights the most probable result (golden class)', () => {
    const { container } = render(<MatrixChart {...defaultProps} />);
    // Con 50/50 y xG=2.5, el resultado más probable suele ser 2-2 o similar
    const goldenCell = container.querySelector('.golden');
    expect(goldenCell).toBeInTheDocument();
    expect(goldenCell).toHaveClass('matrix-cell');
  });

  it('calculates global win/draw/loss percentages that sum ~100%', () => {
    const { container } = render(<MatrixChart {...defaultProps} />);
    
    // Buscar los porcentajes en los paneles laterales (panel-prob)
    const panelProbs = Array.from(container.querySelectorAll('.panel-prob'))
      .map(el => parseFloat(el.textContent.replace('%', '')));
    
    // Debe haber exactamente 3 (1, X, 2)
    expect(panelProbs).toHaveLength(3);
    const sum = panelProbs.reduce((a, b) => a + b, 0);
    
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });
});
