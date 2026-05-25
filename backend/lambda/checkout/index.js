import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

/**
 * Handler de AWS Lambda para iniciar el proceso de checkout con Stripe.
 * Realiza la validación del token de usuario (emitido por Supabase Auth)
 * y genera una sesión de pago segura redirigible en Stripe.
 */
export const handler = async (event) => {
  try {
    // 1. Obtengo y compruebo la presencia de la cabecera Authorization (insensible a mayúsculas/minúsculas)
    const authHeader = event.headers?.['authorization'] || event.headers?.['Authorization'];
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Falta la cabecera Authorization en los headers.' })
      };
    }

    // 2. Extraigo el token JWT omitiendo el prefijo "Bearer "
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let decoded;
    try {
      // Valido la firma del token localmente usando la clave de firma de Supabase (SUPABASE_JWT_SECRET)
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch (err) {
      // Retorno 401 en caso de firma inválida o token expirado
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Token de autorización inválido: ' + err.message })
      };
    }

    // 3. Extraigo el identificador único del usuario (UUID) desde el campo 'sub' del JWT
    const userId = decoded.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Token de autorización inválido: sub no encontrado.' })
      };
    }

    // 4. Parseo el cuerpo del evento HTTP POST para extraer los productos del carrito
    const body = JSON.parse(event.body || '{}');
    const items = body.items || [];

    // Compruebo que el carrito contenga al menos un artículo
    if (!items || items.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'El carrito está vacío.' })
      };
    }

    // 5. Inicializo el cliente de Stripe con la clave secreta de la API
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Mapeo los ítems del carrito local a la estructura de línea de compra requerida por Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
        },
        unit_amount: item.price, // Stripe requiere el importe en céntimos (ej: 2000 equivale a 20.00 EUR)
      },
      quantity: item.quantity,
    }));

    // 6. Creo la sesión de Stripe Checkout configurando opciones de envío y metadatos
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      // Fuerza a que Stripe recopile una dirección física únicamente en España (ES)
      shipping_address_collection: {
        allowed_countries: ['ES']
      },
      // Adjunto el UUID de Supabase en los metadatos para recuperarlo en el webhook posterior
      metadata: {
        user_id: userId
      },
      // URLs de redirección al finalizar o cancelar el pago
      success_url: body.success_url || process.env.SUCCESS_URL || 'https://example.com/success',
      cancel_url: body.cancel_url || process.env.CANCEL_URL || 'https://example.com/cancel',
    });

    // 7. Retorno la URL de sesión creada para redirigir al usuario al formulario de pago de Stripe
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    // Captura cualquier error crítico no controlado
    console.error('Error en checkout handler:', error);
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
