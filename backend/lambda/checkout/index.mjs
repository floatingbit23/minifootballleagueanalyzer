import Stripe from 'stripe';
import crypto from 'node:crypto';

let cachedProducts = null;
let lastFetchTime = 0;
const CACHE_TTL = 300000; // 5 minutos de caché en memoria para el catálogo

async function fetchProducts() {
  const now = Date.now();
  if (cachedProducts && (now - lastFetchTime < CACHE_TTL)) {
    return cachedProducts;
  }
  const url = process.env.PRODUCTS_JSON_URL || 'https://mfl-analyzer-data.s3.eu-west-1.amazonaws.com/products/products.json';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch products catalogue: HTTP ${response.status}`);
  }
  cachedProducts = await response.json();
  lastFetchTime = now;
  return cachedProducts;
}

/**
 * Handler de AWS Lambda para iniciar el proceso de checkout con Stripe.
 * Realiza la validación del token de usuario (emitido por Supabase Auth) y genera una sesión de pago segura redirigible en Stripe.
 */

export const handler = async (event) => {

  try {

    // 1. Obtengo y compruebo la presencia de la cabecera Authorization (insensible a mayúsculas/minúsculas)
    const authHeader = event.headers?.['authorization'] || event.headers?.['Authorization']; // Optional chaining (?.)

    // Si no existe la cabecera, lanzo un error HTTP 401: Unauthorized
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

    let userId;
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY no configuradas en AWS Lambda.');
      }

      // Valido la autenticación llamando al endpoint /auth/v1/user de Supabase
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey
        }
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.msg || errorData.error || `HTTP error ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      userId = userData.id;

    } catch (err) {
      // Retorno 401 en caso de token inválido, expirado o error de comunicación
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Token de autorización inválido o expirado: ' + err.message })
      };
    }

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

    // Compruebo que el carrito contenga al menos un artículo y sea un array válido, 
    // en caso contrario, lanzo un error HTTP 400: Bad Request
    if (!Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'El carrito está vacío.' })
      };
    }

    // 5. Descargar catálogo de productos desde S3 para validar precios oficiales
    let productsList;
    try {
      productsList = await fetchProducts();
    } catch (err) {
      console.error('Error al obtener catálogo de productos:', err);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'No se pudo cargar el catálogo de productos para validación.' })
      };
    }

    // Validar cada ítem del carrito y obtener los datos seguros del backend/catálogo
    const lineItems = [];
    for (const item of items) {
      if (!item.id) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Cada artículo en el carrito debe tener un ID válido.' })
        };
      }

      // Validar cantidad (entero positivo mayor que 0 y menor que 10)
      const q = item.quantity;
      if (typeof q !== 'number' || !Number.isInteger(q) || q <= 0 || q >= 10) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: `La cantidad solicitada para el producto ${item.id} debe ser un entero positivo menor que 10.` })
        };
      }

      // Buscar producto en el catálogo oficial de S3
      const matchedProduct = productsList.find(p => p.id === item.id);
      if (!matchedProduct) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: `El producto con ID ${item.id} no existe en nuestro catálogo.` })
        };
      }

      // Agregar a lineItems con el precio oficial multiplicado por 100 (céntimos)
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: matchedProduct.name,
          },
          unit_amount: Math.round(matchedProduct.price * 100),
        },
        quantity: q,
      });
    }

    // Ordenamos el carrito para asegurar que el hash sea el mismo sin importar el orden en que se enviaron los items
    const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const cartRepresentation = sortedItems.map(item => `${item.id}:${item.quantity}`).join(',');

    // Generamos un hash SHA-256 único basado en el ID del usuario y el contenido del carrito
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${userId}:${cartRepresentation}`)
      .digest('hex');

    // 6. Inicializo el cliente de Stripe con la clave secreta de la API
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 6. Creo la sesión de Stripe Checkout configurando opciones de envío y metadatos
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      // Fuerza a que Stripe recopile una dirección física únicamente en España (ES)
      shipping_address_collection: {
        allowed_countries: ['ES']
      },
      // Adjunto el UUID (Unique Universal Identifier) de Supabase en los metadatos para recuperarlo en el webhook posterior
      metadata: {
        user_id: userId
      },
      // URLs de redirección al finalizar o cancelar el pago (1 fallback URL)
      success_url: body.success_url || process.env.SUCCESS_URL || 'https://example.com/success',
      cancel_url: body.cancel_url || process.env.CANCEL_URL || 'https://example.com/cancel',
    }, {
      idempotencyKey: idempotencyKey // Evita duplicación de cobros/sesiones
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
      statusCode: 500, // HTTP 500: Internal Server Error
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Error interno del servidor: ' + error.message })
    };

  }

};
