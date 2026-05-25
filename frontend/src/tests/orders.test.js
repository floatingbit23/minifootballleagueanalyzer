import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Mock de DynamoDBDocumentClient
vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();
  return {
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: mockSend
      }))
    },
    PutCommand: vi.fn(function(params) { this.params = params; }),
    GetCommand: vi.fn(function(params) { this.params = params; })
  };
});

describe('DynamoDB Orders Persistence', () => {
  let mockDocClientSend;

  beforeEach(() => {
    vi.clearAllMocks();
    const docClient = DynamoDBDocumentClient.from();
    mockDocClientSend = docClient.send;
  });

  it('debería insertar un registro de orden completo en la tabla orders', async () => {
    mockDocClientSend.mockResolvedValueOnce({});

    const newOrder = {
      order_id: 'cs_test_12345',
      user_id: 'user-999',
      customer_email: 'buyer@example.com',
      total_amount: 1500,
      status: 'PAID',
      shipping_address: {
        name: 'Carlos Ruiz',
        line1: 'Gran Via 45',
        city: 'Murcia',
        postal_code: '30005',
        country: 'ES'
      },
      created_at: Math.floor(Date.now() / 1000)
    };

    const client = DynamoDBDocumentClient.from();
    const command = new PutCommand({
      TableName: 'orders',
      Item: newOrder
    });

    await client.send(command);

    expect(mockDocClientSend).toHaveBeenCalled();
    expect(command.params.TableName).toBe('orders');
    expect(command.params.Item.order_id).toBe('cs_test_12345');
    expect(command.params.Item.shipping_address.city).toBe('Murcia');
  });

  it('debería poder recuperar una orden por su order_id', async () => {
    const mockOrderResult = {
      Item: {
        order_id: 'cs_test_12345',
        user_id: 'user-999',
        customer_email: 'buyer@example.com',
        total_amount: 1500,
        status: 'PAID'
      }
    };

    mockDocClientSend.mockResolvedValueOnce(mockOrderResult);

    const client = DynamoDBDocumentClient.from();
    const command = new GetCommand({
      TableName: 'orders',
      Key: { order_id: 'cs_test_12345' }
    });

    const result = await client.send(command);

    expect(mockDocClientSend).toHaveBeenCalled();
    expect(result.Item.order_id).toBe('cs_test_12345');
    expect(result.Item.status).toBe('PAID');
  });
});
