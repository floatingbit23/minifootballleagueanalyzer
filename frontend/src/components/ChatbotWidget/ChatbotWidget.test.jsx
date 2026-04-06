import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatbotWidget from './ChatbotWidget';

// Mock de fetch global
global.fetch = vi.fn();

describe('ChatbotWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in collapsed state', () => {
    render(<ChatbotWidget />);
    // El fab button con el balón debe estar presente
    expect(screen.getByLabelText('Abrir chatbot')).toBeInTheDocument();
  });

  it('opens and closes the chat window', () => {
    const { container } = render(<ChatbotWidget />);
    const fabButton = screen.getByLabelText('Abrir chatbot');
    
    // Abrir
    fireEvent.click(fabButton);
    expect(screen.getByText('Analista MFL')).toBeInTheDocument();
    
    // Cerrar vía botón X del header (primero que encontramos con esa clase)
    const closeBtn = container.querySelector('.chatbot-header__btn[title="Cerrar"]');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Analista MFL')).not.toHaveClass('chatbot-window--open');
  });

  it('displays preset questions', () => {
    render(<ChatbotWidget />);
    fireEvent.click(screen.getByLabelText('Abrir chatbot'));
    
    expect(screen.getByText('¿Qué es el ranking ELO?')).toBeInTheDocument();
    expect(screen.getByText('¿Qué es el xG?')).toBeInTheDocument();
  });

  it('sends a question and displays the response', async () => {
    // Mock de respuesta exitosa
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'El xG son los Goles Esperados.' }),
    });

    const { container } = render(<ChatbotWidget />);
    fireEvent.click(screen.getByLabelText('Abrir chatbot'));
    
    const questionBtn = screen.getByText('¿Qué es el xG?');
    fireEvent.click(questionBtn);

    // Verificar que el mensaje del usuario aparece en una burbuja
    const bubbles = container.querySelectorAll('.chatbot-bubble--user');
    expect(bubbles[0].textContent).toBe('¿Qué es el xG?');

    // Esperar a que llegue la respuesta del asistente en una burbuja
    await waitFor(() => {
      const assistantBubbles = container.querySelectorAll('.chatbot-bubble--assistant');
      expect(Array.from(assistantBubbles).some(b => b.textContent === 'El xG son los Goles Esperados.')).toBe(true);
    });
  });

  it('handles error in API response gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatbotWidget />);
    fireEvent.click(screen.getByLabelText('Abrir chatbot'));
    
    const questionBtn = screen.getByText('¿Qué es el xG?');
    fireEvent.click(questionBtn);

    await waitFor(() => {
      expect(screen.getByText('Error de conexión. Inténtalo de nuevo.')).toBeInTheDocument();
    });
  });
});
