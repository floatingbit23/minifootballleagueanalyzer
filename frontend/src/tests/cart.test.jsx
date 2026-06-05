import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { userStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { clearCart, cartStore, isCartOpen, addToCart } from '../stores/cartStore';
import Header from '../components/Header/Header';

// Mock de Supabase
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    }
  };
});

// Mock de window.location
const mockAssign = vi.fn();
Object.defineProperty(globalThis, 'location', {
  value: {
    assign: mockAssign,
    origin: 'http://localhost:3000'
  },
  writable: true
});

const mockProducts = [
  {
    id: 'prod_mfl_bag',
    name: 'Bolsa de Deporte MFL',
    price: 29.99,
    description: 'Bolsa deportiva oficial.',
    image: 'https://mfl-analyzer-data.s3.eu-west-1.amazonaws.com/products/bag.png'
  },
  {
    id: 'prod_mfl_ball',
    name: 'Balón Oficial MFL',
    price: 24.99,
    description: 'Balón de fútbol talla 5.',
    image: 'https://mfl-analyzer-data.s3.eu-west-1.amazonaws.com/products/ball.png'
  }
];

// Mock de fetch global con soporte para catálogo S3 y Checkout
const mockFetch = vi.fn().mockImplementation((url) => {
  if (url.includes('amazonaws.com') || url.includes('/products.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => mockProducts
    });
  }
  if (url.includes('/checkout')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://checkout.stripe.com/pay/cs_test_abc123' })
    });
  }
  return Promise.reject(new Error(`Fetch no mockeado para: ${url}`));
});
globalThis.fetch = mockFetch;

// Configurar URL de API Gateway para el entorno de test
import.meta.env.PUBLIC_API_GATEWAY_URL = 'https://api-gateway-test.com';

describe('Integración de CartDrawer y Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    userStore.set(null);
    clearCart();
    isCartOpen.set(false);
  });

  it('debería mostrar el badge de cantidad en el Header solo si hay elementos en el carrito', () => {
    render(<Header />);

    // Por defecto el badge no debe existir
    expect(screen.queryByText('1', { selector: '.header-cart-badge' })).not.toBeInTheDocument();

    // Añadir producto al carrito
    act(() => {
      addToCart('prod_mfl_bag');
    });

    // Ahora el badge con '1' debe aparecer
    expect(screen.getByText('1', { selector: '.header-cart-badge' })).toBeInTheDocument();
  });

  it('debería abrir y cerrar el CartDrawer correctamente mediante botones del Header y Drawer', async () => {
    render(<Header />);

    // El drawer no debe estar en la UI inicialmente
    expect(screen.queryByRole('dialog', { name: /Carrito de compras/i })).not.toBeInTheDocument();

    // Hacer clic en el icono del carrito del Header
    const cartBtn = screen.getByRole('button', { name: /Ver carrito/i });
    act(() => {
      fireEvent.click(cartBtn);
    });

    // El drawer debería estar visible
    const drawer = screen.getByRole('dialog', { name: /Carrito de compras/i });
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText('Tu Carrito')).toBeInTheDocument();

    // Hacer clic en el botón de cerrar 'X'
    const closeBtn = screen.getByRole('button', { name: /Cerrar carrito/i });
    act(() => {
      fireEvent.click(closeBtn);
    });

    // El drawer debería desaparecer de la UI
    expect(screen.queryByRole('dialog', { name: /Carrito de compras/i })).not.toBeInTheDocument();
  });

  it('debería cerrar el CartDrawer al hacer clic en el backdrop overlay o presionar Escape', async () => {
    render(<Header />);

    // Abrir drawer
    const cartBtn = screen.getByRole('button', { name: /Ver carrito/i });
    act(() => {
      fireEvent.click(cartBtn);
    });
    expect(screen.getByRole('dialog', { name: /Carrito de compras/i })).toBeInTheDocument();

    // Presionar la tecla Escape
    act(() => {
      fireEvent.keyDown(globalThis, { key: 'Escape', code: 'Escape' });
    });
    expect(screen.queryByRole('dialog', { name: /Carrito de compras/i })).not.toBeInTheDocument();

    // Abrir de nuevo
    act(() => {
      fireEvent.click(cartBtn);
    });
    expect(screen.getByRole('dialog', { name: /Carrito de compras/i })).toBeInTheDocument();

    // Hacer clic en el backdrop overlay
    const overlay = document.querySelector('.cart-drawer-overlay');
    act(() => {
      fireEvent.click(overlay);
    });
    expect(screen.queryByRole('dialog', { name: /Carrito de compras/i })).not.toBeInTheDocument();
  });

  it('debería renderizar la lista de productos agregados, cargándolos desde S3', async () => {
    act(() => {
      addToCart('prod_mfl_bag');
    });

    render(<Header />);

    // Abrir drawer
    const cartBtn = screen.getByRole('button', { name: /Ver carrito/i });
    act(() => {
      fireEvent.click(cartBtn);
    });

    // Esperar a que el fetch de S3 termine y renderice el nombre del producto
    await waitFor(() => {
      expect(screen.getByText('Bolsa de Deporte MFL')).toBeInTheDocument();
    });

    // Verificar subtotal de 29.99 €
    expect(screen.getAllByText(/29,99/)).toHaveLength(3); // Precio unitario, subtotal y total
  });

  it('debería permitir cambiar cantidades y eliminar productos en el CartDrawer', async () => {
    act(() => {
      addToCart('prod_mfl_bag');
    });

    render(<Header />);

    // Abrir drawer
    const cartBtn = screen.getByRole('button', { name: /Ver carrito/i });
    act(() => {
      fireEvent.click(cartBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Bolsa de Deporte MFL')).toBeInTheDocument();
    });

    // Verificar valor de cantidad inicial = 1
    const qtyValue = screen.getByText('1', { selector: '.qty-value' });
    expect(qtyValue).toBeInTheDocument();

    // Incrementar cantidad
    const plusBtn = screen.getByRole('button', { name: /Aumentar cantidad/i });
    act(() => {
      fireEvent.click(plusBtn);
    });

    // Cantidad debe actualizarse a 2 en la UI y en el store
    expect(screen.getByText('2', { selector: '.qty-value' })).toBeInTheDocument();
    expect(cartStore.get()[0].quantity).toBe(2);

    // Decrementar cantidad
    const minusBtn = screen.getByRole('button', { name: /Disminuir cantidad/i });
    act(() => {
      fireEvent.click(minusBtn);
    });
    expect(screen.getByText('1', { selector: '.qty-value' })).toBeInTheDocument();

    // Eliminar producto
    const removeBtn = screen.getByRole('button', { name: /Eliminar producto/i });
    act(() => {
      fireEvent.click(removeBtn);
    });

    // El producto ya no debe estar en el drawer y el carrito debe mostrar "vacío"
    expect(screen.queryByText('Bolsa de Deporte MFL')).not.toBeInTheDocument();
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(cartStore.get().length).toBe(0);
  });

  it('debería mostrar advertencia si usuario no autenticado intenta hacer checkout', async () => {
    act(() => {
      addToCart('prod_mfl_bag');
    });

    render(<Header />);

    const cartBtn = screen.getByRole('button', { name: /Ver carrito/i });
    act(() => {
      fireEvent.click(cartBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Bolsa de Deporte MFL')).toBeInTheDocument();
    });

    // Hacer clic en Proceder al Pago
    const checkoutBtn = screen.getByRole('button', { name: 'Proceder al Pago' });
    act(() => {
      fireEvent.click(checkoutBtn);
    });

    // Debe mostrar advertencia de login
    expect(await screen.findByText(/Debes iniciar sesión para comprar/i)).toBeInTheDocument();
  });

  it('debería llamar a API /checkout y redirigir a Stripe si el usuario está autenticado', async () => {
    userStore.set({ email: 'test@example.com', id: 'user-123' });

    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'fake-jwt-token-drawer',
          user: { email: 'test@example.com', id: 'user-123' }
        }
      },
      error: null
    });

    act(() => {
      addToCart('prod_mfl_bag');
    });

    render(<Header />);

    const cartBtn = screen.getByRole('button', { name: /Ver carrito/i });
    act(() => {
      fireEvent.click(cartBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Bolsa de Deporte MFL')).toBeInTheDocument();
    });

    // Checkout
    const checkoutBtn = screen.getByRole('button', { name: 'Proceder al Pago' });
    act(() => {
      fireEvent.click(checkoutBtn);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/checkout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-jwt-token-drawer'
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
});
