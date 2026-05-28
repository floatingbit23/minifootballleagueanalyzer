import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import StoreWidget from '../components/Store/StoreWidget';

// Mock de Supabase
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn()
      }
    }
  };
});

// Mock de window.location
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    assign: mockAssign,
    origin: 'http://localhost:3000'
  },
  writable: true
});

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Configurar URL de API Gateway para el entorno de test
import.meta.env.PUBLIC_API_GATEWAY_URL = 'https://api-gateway-test.com';

const mockProducts = [
  {
    id: 'prod_mfl_bag',
    name: 'Bolsa de Deporte MFL',
    price: 29.99,
    description: 'Bolsa deportiva oficial con compartimento ventilado para botas y correa acolchada para el hombro.',
    image: 'https://mfl-analyzer-data.s3.eu-west-1.amazonaws.com/products/bag.png'
  },
  {
    id: 'prod_mfl_ball',
    name: 'Balón Oficial MFL',
    price: 24.99,
    description: 'Balón de fútbol talla 5 de alta resistencia con costuras reforzadas.',
    image: 'https://mfl-analyzer-data.s3.eu-west-1.amazonaws.com/products/ball.png'
  },
  {
    id: 'prod_mfl_boots',
    name: 'Botas de Fútbol MFL Pro',
    price: 69.99,
    description: 'Botas de fútbol para césped artificial.',
    image: 'https://mfl-analyzer-data.s3.eu-west-1.amazonaws.com/products/boots.png'
  }
];

describe('Componente StoreWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userStore.set(null); // Reiniciamos el estado del usuario como no autenticado por defecto
  });

  it('debería renderizar la rejilla de productos correctamente', () => {
    render(<StoreWidget products={mockProducts} />);
    
    // Comprobar que algunos de los productos clave del JSON de datos se renderizan
    expect(screen.getByText('Bolsa de Deporte MFL')).toBeInTheDocument();
    expect(screen.getByText('Balón Oficial MFL')).toBeInTheDocument();
    expect(screen.getByText('Botas de Fútbol MFL Pro')).toBeInTheDocument();
  });

  it('debería mostrar un mensaje de error/advertencia si un usuario no autenticado intenta comprar', async () => {
    render(<StoreWidget products={mockProducts} />);
    
    // Hacemos clic en el botón de comprar de la "Bolsa de Deporte MFL"
    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    // Debería mostrar un mensaje indicando que debe iniciar sesión
    expect(await screen.findByText(/Debes iniciar sesión para comprar/i)).toBeInTheDocument();
  });

  it('debería realizar el POST a API Gateway y redirigir a Stripe si el usuario está autenticado', async () => {
    // Simulamos un usuario autenticado en la Store
    userStore.set({ email: 'test@example.com', id: 'user-123' });
    
    // Simulamos que supabase.auth.getSession() devuelve un token JWT válido
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'fake-jwt-token-123'
        }
      },
      error: null
    });

    // Simulamos la respuesta exitosa de API Gateway con la URL de redirección de Stripe
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/pay/cs_test_abc123' })
    });

    render(<StoreWidget products={mockProducts} />);

    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    // Esperamos a que se llame a fetch y se redirija al usuario
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/checkout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-jwt-token-123'
          }),
          body: expect.any(String)
        })
      );
    });

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_abc123');
    });
  });

  it('debería manejar errores en la llamada a la API Gateway de forma amigable', async () => {
    userStore.set({ email: 'test@example.com', id: 'user-123' });
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'fake-jwt-token-123'
        }
      },
      error: null
    });

    // Simulamos un error del servidor (500)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Error interno de Stripe' })
    });

    render(<StoreWidget products={mockProducts} />);

    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    // Debería mostrar un mensaje de error en la UI
    expect(await screen.findByText(/Error al procesar el pago. Inténtalo de nuevo./i)).toBeInTheDocument();
  });
});
