import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock de las librerías
vi.mock('stripe', () => {
  const mockConstructEvent = vi.fn();
  const mockListLineItems = vi.fn();

  const StripeMock = vi.fn(() => ({
    checkout: {
      sessions: {
        listLineItems: mockListLineItems
      }
    }
  }));

  StripeMock.webhooks = { constructEvent: mockConstructEvent };
  StripeMock.mockConstructEvent = mockConstructEvent;
  StripeMock.mockListLineItems = mockListLineItems;

  return { default: StripeMock };
});
vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();
  return {
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: mockSend
      }))
    },
    PutCommand: vi.fn(function(params) {
      this.params = params;
    })
  };
});

// Importamos el handler del webhook
import { handler } from '../../../backend/lambda/webhook/index.mjs';

describe('POST /webhook Lambda Handler', () => {
  const mockConstructEvent = Stripe.mockConstructEvent;
  const mockListLineItems = Stripe.mockListLineItems;
  let mockDocClientSend;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test';

    // Obtener la referencia de la función mockeada de send
    const docClient = DynamoDBDocumentClient.from();
    mockDocClientSend = docClient.send;
  });

  it('debería retornar 400 si la firma de Stripe es inválida', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Firma inválida');
    });

    const event = {
      headers: {
        'stripe-signature': 'firma-invalida'
      },
      body: '{"id": "evt_123"}'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('Error de validación de firma');
  });

  it('debería retornar 200 e ignorar eventos que no sean checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'payment_intent.created',
      data: {
        object: {}
      }
    });

    const event = {
      headers: {
        'stripe-signature': 'firma-valida'
      },
      body: '{"id": "evt_123"}'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).received).toBe(true);
    expect(mockDocClientSend).not.toHaveBeenCalled();
  });

  it('debería procesar checkout.session.completed y guardar el pedido en DynamoDB', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_999',
          customer_details: { email: 'comprador@test.com' },
          amount_total: 2999,
          metadata: { user_id: 'user-777' },
          shipping_details: {
            name: 'Javi Pérez',
            address: {
              line1: 'Calle Falsa, 123',
              city: 'Granada',
              postal_code: '18001',
              country: 'ES'
            }
          }
        }
      }
    });

    mockListLineItems.mockResolvedValueOnce({
      data: [
        { price: { product: 'prod_mfl_ball' }, description: 'Balón MFL', amount_total: 2499, quantity: 1 }
      ]
    });

    mockDocClientSend.mockResolvedValueOnce({}); // Éxito de DynamoDB

    const event = {
      headers: {
        'stripe-signature': 'firma-valida'
      },
      body: '{"id": "evt_999"}'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).status).toBe('PAID');
    
    // Verificamos que se haya ejecutado el comando Put en DynamoDB
    expect(mockDocClientSend).toHaveBeenCalled();
    const putParams = mockDocClientSend.mock.calls[0][0].params;
    expect(putParams.Item.items).toBeDefined();
    expect(putParams.Item.items[0].id).toBe('prod_mfl_ball');
  });

  it('debería retornar 500 si la base de datos (DynamoDB) falla para forzar reintentos de Stripe', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_999',
          customer_details: { email: 'comprador@test.com' },
          amount_total: 2999,
          metadata: { user_id: 'user-777' }
        }
      }
    });

    mockListLineItems.mockResolvedValueOnce({ data: [] });

    mockDocClientSend.mockRejectedValueOnce(new Error('Fallo de conexión en DB')); // Error en DynamoDB

    const event = {
      headers: {
        'stripe-signature': 'firma-valida'
      },
      body: '{"id": "evt_999"}'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toContain('Fallo en la base de datos');
  });
});
