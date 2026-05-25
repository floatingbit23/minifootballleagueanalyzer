import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

// Mock de las librerías externas
vi.mock('jsonwebtoken');
vi.mock('stripe');

// Importamos el handler de checkout
import { handler } from '../../../backend/lambda/checkout/index.js';

describe('POST /checkout Lambda Handler', () => {
  const mockStripeSessionCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
    
    // Configuración del mock de Stripe
    Stripe.prototype.checkout = {
      sessions: {
        create: mockStripeSessionCreate
      }
    };
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
    vi.mocked(jwt.verify).mockImplementationOnce(() => {
      throw new Error('Token expirado');
    });

    const event = {
      headers: {
        Authorization: 'Bearer token-invalido'
      },
      body: JSON.stringify({ items: [] })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toContain('Token de autorización inválido');
  });

  it('debería retornar 200 y la URL de Stripe si el token y carrito son válidos', async () => {
    // Simulamos verificación exitosa del JWT de Supabase
    vi.mocked(jwt.verify).mockReturnValueOnce({ sub: 'user-123' });
    
    // Simulamos la creación de la sesión de Stripe
    mockStripeSessionCreate.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/pay/cs_test_123'
    });

    const event = {
      headers: {
        Authorization: 'Bearer token-valido'
      },
      body: JSON.stringify({
        items: [
          { id: 'prod_1', name: 'Camiseta Murcia', price: 2000, quantity: 1 }
        ]
      })
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    
    // Verificamos que se haya llamado a Stripe con los parámetros de merchandising físico
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
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
