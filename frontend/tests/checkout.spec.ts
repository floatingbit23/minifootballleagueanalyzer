import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

// Solo ejecutamos el test E2E real de Stripe si las claves están provistas en el entorno
const hasKeys = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

test.describe('E2E Checkout & Stripe Flow', () => {
  let originalFetch: typeof global.fetch;
  let dynamicUserId: string;

  test.beforeEach(async ({ page }) => {
    dynamicUserId = `user-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // 1. Establecemos las variables de entorno para que el Handler de Lambda importado se comporte correctamente
    process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
    process.env.AWS_DEFAULT_REGION = 'eu-west-1';
    process.env.PRODUCTS_JSON_URL = 'http://localhost:4566/mfl-analyzer-data/products/products.json';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.SUPABASE_URL = 'https://mock-supabase.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';

    // Mockeamos global.fetch en el proceso Node.js del test (para las Lambdas que se ejecutan aquí)
    originalFetch = global.fetch;
    global.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : url.url);
      
      if (urlStr.includes('supabase.co/auth/v1/user')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: dynamicUserId, email: 'comprador@ejemplo.com' })
        } as any;
      }
      
      if (urlStr.includes('products.json') || urlStr.includes('mfl-analyzer-data')) {
        const productsJsonPath = path.resolve('../localstack-init/products.json');
        const productsJson = await fs.readFile(productsJsonPath, 'utf-8');
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(productsJson)
        } as any;
      }
      
      return originalFetch(url, options);
    }) as any;

    // 2. Interceptamos llamadas de Supabase Auth para mockear la autenticación sin depender del servidor real
    await page.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-jwt-token-777',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token',
          user: {
            id: dynamicUserId,
            email: 'buyer@example.com',
            role: 'authenticated',
            aud: 'authenticated'
          }
        })
      });
    });

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: dynamicUserId,
          email: 'buyer@example.com',
          role: 'authenticated',
          aud: 'authenticated'
        })
      });
    });

    // 2b. Interceptamos las llamadas de base de datos de Supabase para evitar errores de JWT inválido en consola
    await page.route('**/rest/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]) // Devolvemos un array vacío (por ejemplo, sin favoritos)
      });
    });

    // 3. Interceptamos el catálogo de productos de S3 y devolvemos la versión local
    await page.route('**/s3-cdn/products/products.json', async (route) => {
      const productsJsonPath = path.resolve('../localstack-init/products.json');
      const productsJson = await fs.readFile(productsJsonPath, 'utf-8');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: productsJson
      });
    });

    // 4. Interceptamos las peticiones al API Gateway /checkout y las dirigimos a la Lambda local
    await page.route('**/checkout-api/checkout', async (route) => {
      try {
        const postData = JSON.parse(route.request().postData() || '{}');
        const authorization = route.request().headers()['authorization'] || 'Bearer fake-token';

        const event = {
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData)
        };

        // Importamos dinámicamente el handler de checkout
        const { handler } = await import('../../backend/lambda/checkout/index.mjs');
        const res = await handler(event);

        await route.fulfill({
          status: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: res.body
        });
      } catch (err) {
        console.error('Error in mock checkout handler:', err);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: err.message })
        });
      }
    });
  });

  test.afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    }
  });

  test('debería autenticar al usuario, añadir un artículo al carrito y completar el checkout de Stripe', async ({ page }) => {
    // Si no tenemos las claves de Stripe cargadas localmente, omitimos el test real de redirección a Stripe
    test.skip(!hasKeys, 'Se omiten los tests reales de Stripe E2E si no están configuradas las claves.');

    // Aumentamos el timeout del test debido a las llamadas de red externas de Stripe Sandbox
    test.setTimeout(90000);

    // 1. Visitamos la tienda oficial
    await page.goto('/store');

    // 2. Realizamos el flujo de login
    // Hacemos click en el botón de login
    await page.locator('.login-btn').click();
    
    // Rellenamos el formulario de login (los valores son capturados por el mock de Supabase)
    await page.locator('#auth-email').fill('buyer@example.com');
    await page.locator('#auth-password').fill('password123');
    
    // Hacemos submit del formulario
    await page.locator('.auth-modal .submit-btn').click();

    // Verificamos que el login haya sido exitoso (debería mostrar el email abreviado en el menú)
    await expect(page.locator('.email-text')).toHaveText('buyer');

    // 3. Añadimos el primer producto al carrito ("Bolsa de Deporte MFL" o similar)
    const firstBuyBtn = page.locator('.buy-button').first();
    await expect(firstBuyBtn).toBeVisible();
    await firstBuyBtn.click();

    // 4. Al comprar, el drawer del carrito se abre automáticamente.
    // Verificamos que el botón para proceder al pago esté visible en el drawer
    const checkoutBtn = page.locator('.cart-drawer-checkout-btn');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 5. Esperamos la redirección automática al dominio checkout.stripe.com
    await page.waitForURL(/checkout.stripe.com/);
    await expect(page).toHaveURL(/checkout.stripe.com/);

    // 6. Rellenamos el formulario de Stripe Sandbox
    await page.locator('input[name="email"]').fill('buyer@example.com');
    
    // Rellenamos el número de tarjeta (4242...)
    const cardInput = page.locator('#cardNumber');
    await cardInput.fill('4242');
    await cardInput.pressSequentially('424242424242'); // Completar la tarjeta

    // Fecha de expiración y CVC
    await page.locator('#cardExpiry').fill('12');
    await page.locator('#cardExpiry').pressSequentially('28');
    await page.locator('#cardCvc').fill('123');
    
    // Rellenamos la dirección de envío (obligatoria en checkout.stripe.com si se recopila dirección de envío)
    const shippingName = page.locator('#shippingName');
    if (await shippingName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shippingName.fill('Carlos Ruiz');
      
      const line1 = page.locator('#shippingAddressLine1, input[autocomplete="shipping address-line1"]').first();
      await line1.fill('Gran Via 45');
      
      const city = page.locator('#shippingLocality, #shippingCity, input[autocomplete="shipping address-level2"]').first();
      await city.fill('Madrid');
      
       const postalCode = page.locator('#shippingPostalCode, input[autocomplete="shipping postal-code"]').first();
      await postalCode.fill('28013');

      const province = page.locator('#shippingAdministrativeArea, select[autocomplete="shipping address-level1"]').first();
      if (await province.isVisible({ timeout: 2000 }).catch(() => false)) {
        await province.selectOption('Madrid');
      }
    }

    // Nombre en la tarjeta / Facturación (si está visible e independiente)
    const nameLocator = page.locator('#billingName, input[autocomplete="cc-name"], input[name="cardholderName"]').first();
    if (await nameLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameLocator.fill('Carlos Ruiz');
    }

    // Dirección de facturación (si está visible e independiente)
    const billingAddress = page.locator('#billingAddressLine1, input[autocomplete="billing address-line1"]').first();
    if (await billingAddress.isVisible({ timeout: 2000 }).catch(() => false)) {
      await billingAddress.fill('Gran Via 45');
      
      const billingCity = page.locator('#billingLocality, #billingCity, input[autocomplete="billing address-level2"]').first();
      await billingCity.fill('Madrid');
      
      const billingPostalCode = page.locator('#billingPostalCode, input[autocomplete="billing postal-code"]').first();
      await billingPostalCode.fill('28013');

      const billingProvince = page.locator('#billingAdministrativeArea, select[autocomplete="billing address-level1"]').first();
      if (await billingProvince.isVisible({ timeout: 2000 }).catch(() => false)) {
        await billingProvince.selectOption('Madrid');
      }
    }

    // Procedemos a hacer clic en Pagar
    const payBtn = page.locator('button[type="submit"], button.SubmitButton, button[data-testid="submit-button"]').first();
    await expect(payBtn).toBeEnabled();
    await payBtn.click();

    // 7. Esperamos a ser redirigidos de vuelta a nuestra ruta de éxito (/checkout/success)
    await page.waitForURL(/checkout\/success/, { timeout: 20000 });
    await expect(page).toHaveURL(/checkout\/success/);

    // Confirmamos que se muestre el texto de éxito en la pantalla
    await expect(page.locator('h1.outcome-title')).toContainText(/¡Compra Completada!|Gracias/i);
  });
});
