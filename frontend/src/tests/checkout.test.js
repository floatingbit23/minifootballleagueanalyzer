import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock de las librerías externas
vi.mock('stripe');

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Importamos el handler de checkout
import { handler } from '../../../backend/lambda/checkout/index.mjs';

describe('POST /checkout Lambda Handler', () => {
  const mockStripeSessionCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://supabase-test.com';
    process.env.SUPABASE_ANON_KEY = 'anon-key-test';
    
    // Configuración del mock de Stripe
    Stripe.prototype.checkout = {
      sessions: {
        create: mockStripeSessionCreate
      }
    };

    // Implementación por defecto para fetch (auth de Supabase y catálogo de S3)
    mockFetch.mockImplementation(async (url) => {
      if (url.includes('/auth/v1/user')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'user-123', email: 'test@example.com' })
        };
      }
      if (url.includes('products.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 'prod_mfl_bag', name: 'Bolsa de Deporte MFL', price: 29.99 },
            { id: 'prod_mfl_ball', name: 'Balón Oficial MFL', price: 24.99 }
          ]
        };
      }
      return { ok: false, status: 404 };
    });
  });

  it('debería retornar 401 si falta la cabecera Authorization', async () => {
    const event = {
      headers: {},
      body: JSON.stringify({ items: [] })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toContain('Falta la cabecera Authorization');
  });

  it('debería retornar 401 si el token JWT es inválido o expira', async () => {
    // Sobrescribimos el primer fetch (el de Supabase) para simular error de token
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ msg: 'Token expirado' })
    });

    const event = {
      headers: {
        Authorization: 'Bearer token-invalido'
      },
      body: JSON.stringify({ items: [] })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toContain('Token de autorización inválido o expirado: Token expirado');
  });

  it('debería retornar 400 si el carrito está vacío', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer token-valido'
      },
      body: JSON.stringify({
        items: []
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('El carrito está vacío.');
  });

  it('debería retornar 400 si el producto no existe en el catálogo', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer token-valido'
      },
      body: JSON.stringify({
        items: [
          { id: 'producto_inexistente', quantity: 1 }
        ]
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('no existe en nuestro catálogo');
  });

  it('debería retornar 400 si la cantidad es menor o igual a 0', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer token-valido'
      },
      body: JSON.stringify({
        items: [
          { id: 'prod_mfl_bag', quantity: 0 }
        ]
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('debe ser un entero positivo menor que 10');
  });

  it('debería retornar 400 si la cantidad es mayor o igual a 10', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer token-valido'
      },
      body: JSON.stringify({
        items: [
          { id: 'prod_mfl_bag', quantity: 10 }
        ]
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('debe ser un entero positivo menor que 10');
  });

  it('debería retornar 200 y la URL de Stripe si el token y carrito son válidos', async () => {
    mockStripeSessionCreate.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/pay/cs_test_123'
    });

    const event = {
      headers: {
        Authorization: 'Bearer token-valido'
      },
      body: JSON.stringify({
        items: [
          { id: 'prod_mfl_bag', quantity: 2 }
        ]
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    
    // Verificamos que se haya llamado a Stripe con los parámetros oficiales (29.99 * 100 = 2999 céntimos)
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Bolsa de Deporte MFL'
              },
              unit_amount: 2999
            },
            quantity: 2
          }
        ],
        shipping_address_collection: {
          allowed_countries: ['ES']
        },
        metadata: {
          user_id: 'user-123'
        }
      })
    );
  });
});
