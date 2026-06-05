import { describe, it, expect, beforeAll } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import Stripe from 'stripe';

// Verificamos si las claves reales de Stripe están presentes para poder ejecutar el test real de integración.
// En caso contrario (como entornos de CI/CD genéricos sin secretos), el test se omitirá de forma limpia y segura.
const hasKeys = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

describe.runIf(hasKeys)('Prueba de Integración E-Commerce Real (LocalStack + Stripe Sandbox)', () => {
  let stripe;
  let docClient;
  let checkoutHandler;
  let webhookHandler;

  beforeAll(async () => {
    // 1. Configuramos el endpoint de AWS para desviar el tráfico de DynamoDB a LocalStack
    process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
    process.env.AWS_DEFAULT_REGION = 'eu-west-1';

    // 2. Apuntamos el catálogo de productos de S3 a la URL local servida por LocalStack
    process.env.PRODUCTS_JSON_URL = 'http://localhost:4566/mfl-analyzer-data/products/products.json';

    // Evitamos problemas de firmas/credenciales falsas con LocalStack
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';

    // Establecemos las credenciales ficticias de Supabase para que el handler no falle por variables ausentes
    process.env.SUPABASE_URL = 'https://mock-supabase.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';

    // 3. Inicializamos clientes reales
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const ddbClient = new DynamoDBClient({
      region: 'eu-west-1',
      endpoint: process.env.AWS_ENDPOINT_URL,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });
    docClient = DynamoDBDocumentClient.from(ddbClient);

    // 4. Importamos dinámicamente las Lambdas una vez que las variables de entorno están correctamente inicializadas
    // Esto evita que las librerías nativas como Stripe fallen en tiempo de compilación/carga si no hay claves provistas.
    const checkoutModule = await import('../../../backend/lambda/checkout/index.mjs');
    const webhookModule = await import('../../../backend/lambda/webhook/index.mjs');
    checkoutHandler = checkoutModule.handler;
    webhookHandler = webhookModule.handler;
  });

  it('debería ejecutar el flujo completo: Checkout, creación de sesión en Stripe y almacenamiento en DynamoDB', async () => {
    // --- PASO 1: Ejecutar el Checkout Handler ---
    const checkoutEvent = {
      headers: {
        Authorization: 'Bearer fake-valid-token'
      },
      body: JSON.stringify({
        items: [
          { id: 'prod_mfl_bag', quantity: 2 }
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      })
    };

    // Mockeamos localmente solo la llamada fetch a Supabase en el test de integración
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (url.includes('supabase.co/auth/v1/user')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'user-777', email: 'comprador@ejemplo.com' })
        };
      }
      return originalFetch(url, options);
    };

    const checkoutRes = await checkoutHandler(checkoutEvent);

    globalThis.fetch = originalFetch;

    expect(checkoutRes.statusCode).toBe(200);
    const checkoutBody = JSON.parse(checkoutRes.body);
    expect(checkoutBody.url).toContain('https://checkout.stripe.com/');

    const sessionId = checkoutBody.url.split('/').pop().split('#')[0];

    // --- PASO 2: Recuperar sesión desde la Sandbox de Stripe ---
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    expect(stripeSession.amount_total).toBe(5998); // 29.99 € * 2 unidades = 59.98 €
    expect(stripeSession.metadata.user_id).toBe('user-777');

    // --- PASO 3: Simular recepción de Webhook de Stripe ---
    const webhookPayload = JSON.stringify({
      id: 'evt_test_integration',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: stripeSession
      }
    });

    const signatureHeader = stripe.webhooks.generateTestHeaderString({
      payload: webhookPayload,
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });

    const webhookEvent = {
      headers: {
        'stripe-signature': signatureHeader
      },
      body: webhookPayload
    };

    const webhookRes = await webhookHandler(webhookEvent);
    expect(webhookRes.statusCode).toBe(200);

    // --- PASO 4: Verificar la persistencia real en DynamoDB (LocalStack) ---
    const dbRes = await docClient.send(new GetCommand({
      TableName: 'orders',
      Key: {
        order_id: stripeSession.id
      }
    }));

    expect(dbRes.Item).toBeDefined();
    expect(dbRes.Item.status).toBe('PAID');
    expect(dbRes.Item.total_amount).toBe(5998);
    expect(dbRes.Item.user_id).toBe('user-777');
    expect(dbRes.Item.items).toHaveLength(1);
    expect(dbRes.Item.items[0].id).toMatch(/^prod_/);
    expect(dbRes.Item.items[0].description).toBe('Bolsa de Deporte MFL');
    expect(dbRes.Item.items[0].quantity).toBe(2);
  });
});
