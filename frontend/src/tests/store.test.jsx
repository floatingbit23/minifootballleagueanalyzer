import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { userStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { clearCart, cartStore } from '../stores/cartStore';
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
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    userStore.set(null); // Reiniciamos el estado del usuario como no autenticado por defecto
    clearCart();
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

  it('debería realizar el POST a API Gateway y redirigir a Stripe si el usuario está autenticado y hace checkout del carrito', async () => {
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

    // Añadir al carrito
    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    // Hacer click en proceder al pago
    const checkoutButton = screen.getByRole('button', { name: /Proceder al Pago/i });
    fireEvent.click(checkoutButton);

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
          body: JSON.stringify({
            items: [{ id: 'prod_mfl_bag', quantity: 1 }],
            success_url: 'http://localhost:3000/checkout/success',
            cancel_url: 'http://localhost:3000/checkout/cancel'
          })
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

    // Añadir al carrito
    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    // Hacer click en proceder al pago
    const checkoutButton = screen.getByRole('button', { name: /Proceder al Pago/i });
    fireEvent.click(checkoutButton);

    // Debería mostrar un mensaje de error en la UI
    expect(await screen.findByText(/Error al procesar el pago. Inténtalo de nuevo./i)).toBeInTheDocument();
  });

  it('debería transformar el botón "Comprar" a un selector de cantidad al añadir un producto', async () => {
    userStore.set({ email: 'test@example.com', id: 'user-123' });
    render(<StoreWidget products={mockProducts} />);

    // Antes de añadir, el botón de "Comprar" existe para el primer producto
    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    expect(buyButtons[0]).toBeInTheDocument();

    // Añadimos el primer producto al carrito
    fireEvent.click(buyButtons[0]);

    // El botón de "Comprar" del primer producto ya no debe estar, y en su lugar debe estar el selector
    expect(screen.queryAllByRole('button', { name: /Comprar/i }).length).toBe(mockProducts.length - 1);
    expect(screen.getByText('1', { selector: '.quantity-value' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();
  });

  it('debería deshabilitar los botones de cantidad en los límites 1 y 9', async () => {
    userStore.set({ email: 'test@example.com', id: 'user-123' });
    render(<StoreWidget products={mockProducts} />);

    // Añadimos al carrito
    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    const minusButton = screen.getByRole('button', { name: '-' });
    const plusButton = screen.getByRole('button', { name: '+' });

    // En cantidad 1, el botón '-' debe estar deshabilitado
    expect(screen.getByText('1', { selector: '.quantity-value' })).toBeInTheDocument();
    expect(minusButton).toBeDisabled();
    expect(plusButton).not.toBeDisabled();

    // Incrementamos la cantidad a 9
    for (let i = 1; i < 9; i++) {
      fireEvent.click(plusButton);
    }

    // En cantidad 9, el botón '+' debe estar deshabilitado, y '-' habilitado
    expect(screen.getByText('9', { selector: '.quantity-value' })).toBeInTheDocument();
    expect(plusButton).toBeDisabled();
    expect(minusButton).not.toBeDisabled();
  });

  it('debería limpiar el carrito de compras al hacer logout', async () => {
    userStore.set({ email: 'test@example.com', id: 'user-123' });
    render(<StoreWidget products={mockProducts} />);

    // Añadimos al carrito
    const buyButtons = screen.getAllByRole('button', { name: /Comprar/i });
    fireEvent.click(buyButtons[0]);

    // Verificamos que hay artículos en el carrito
    expect(cartStore.get().length).toBe(1);

    // Hacemos logout simulado
    act(() => {
      userStore.set(null);
    });

    // El carrito debería haberse limpiado
    expect(cartStore.get().length).toBe(0);
  });
});
