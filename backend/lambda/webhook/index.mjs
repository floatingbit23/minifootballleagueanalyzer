import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Inicializo el cliente de base de datos de DynamoDB fuera del handler para reutilizar conexiones (Warm Start)
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Inicializo el cliente de Stripe con la clave secreta normal para poder consultar la API
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Handler de AWS Lambda para procesar los eventos de Webhook enviados por Stripe.
 * Verifica la autenticidad de la firma del webhook y persiste las compras
 * confirmadas en la tabla orders de DynamoDB.
 */
export const handler = async (event) => {

  try {
    // 1. Obtengo la firma del webhook desde las cabeceras HTTP (stripe-signature)
    const sig = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];

    if (!sig) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Error de validación de firma: Falta la firma del webhook' })
      };
    }

    let eventObj;

    // 2. Valido criptográficamente el payload recibido usando el secreto del webhook
    try {
      eventObj = Stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      // Si la firma es inválida, retorno 400 inmediatamente
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Error de validación de firma: ' + err.message })
      };
    }

    // 3. Filtro el tipo de evento: Solo nos interesa el pago completado (checkout.session.completed)
    // Para otros eventos (ej. payment_intent.created), retornamos 200 para evitar que Stripe asuma un fallo
    if (eventObj.type !== 'checkout.session.completed') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ received: true })
      };
    }

    // 4. Extraigo la sesión de pago completada
    const session = eventObj.data.object;

    // Formateo y estructuro la dirección física de envío recuperada de Stripe
    // Nota: En las API modernas de Stripe (2025+), shipping_details se mueve dentro de collected_information
    const shippingDetails = session.collected_information?.shipping_details || session.shipping_details;

    const shippingAddress = shippingDetails ? {
      name: shippingDetails.name,
      line1: shippingDetails.address?.line1 || null,
      line2: shippingDetails.address?.line2 || null,
      city: shippingDetails.address?.city || null,
      postal_code: shippingDetails.address?.postal_code || null,
      country: shippingDetails.address?.country || null
    } : null;

    // 5. Recupero los artículos (line_items) que componen esta sesión desde la API de Stripe
    const lineItemsData = await stripe.checkout.sessions.listLineItems(session.id);
    const purchasedItems = lineItemsData.data.map(item => ({
      id: item.price?.product || 'unknown',
      description: item.description,
      amount_total: item.amount_total,
      quantity: item.quantity
    }));

    // 6. Construyo el objeto del pedido mapeando el UUID de Supabase y el ID de sesión de Stripe
    const newOrder = {
      order_id: session.id, // ID de sesión como Clave de Partición (Primary Key)
      user_id: session.metadata?.user_id, // ID de usuario Supabase (para Índice Secundario Global GSI)
      customer_email: session.customer_details?.email,
      total_amount: session.amount_total, // Importe en céntimos
      status: 'PAID', // Estado de pago confirmado
      shipping_address: shippingAddress,
      items: purchasedItems,
      created_at: Math.floor(Date.now() / 1000) // Marca de tiempo en formato UNIX (Sort Key de GSI)
    };

    // 6. Intento insertar la orden en la tabla 'orders' de DynamoDB
    try {

      await docClient.send(new PutCommand({
        TableName: 'orders',
        Item: newOrder,
        ConditionExpression: 'attribute_not_exists(order_id)' // Asegura idempotencia evitando sobrescrituras
      }));

    } catch (dbError) {

      // Si la orden ya existe, DynamoDB lanza esta excepción. 
      // Retornamos 200 a Stripe para confirmar recepción y evitar procesarla de nuevo.
      if (dbError.name === 'ConditionalCheckFailedException') {
        console.warn(`Intento de procesar webhook duplicado para la orden: ${session.id}`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ received: true, message: 'La orden ya fue procesada anteriormente.' })
        };
      }

      console.error('Error insertando en DynamoDB:', dbError);

      // RETORNO HTTP 500 (Internal Server Error) deliberadamente si falla la persistencia por otra razón.
      // Esto hace que Stripe reciba un error y reintente el envío del webhook más tarde (Exponential Backoff).
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Fallo en la base de datos al guardar la orden: ' + dbError.message })
      };
    }

    // 7. Retorno éxito HTTP 200 (OK) a Stripe si el procesamiento y almacenamiento fueron exitosos
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ received: true, status: 'PAID' })
    };

  } catch (error) {

    // Manejo de errores globales internos
    console.error('Error en webhook handler:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Error interno del servidor: ' + error.message })
    };
  }

};
