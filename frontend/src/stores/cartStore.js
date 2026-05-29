import { atom } from 'nanostores';
import { userStore } from './authStore';

// Almacén global (Nanostores) para gestionar la lista de artículos del carrito
// Estructura de cada elemento: { id: string, quantity: number }
export const cartStore = atom([]);

/**
 * Helper para generar la clave de localStorage específica del usuario autenticado.
 * @param {object} user - Objeto de usuario de Supabase.
 * @returns {string|null} - Clave única para localStorage o null si no hay sesión activa.
 */
function getStorageKey(user) {
  return user ? `mfl_cart_${user.id}` : null;
}

// Me quedo escuchando cambios en el estado de autenticación (login/logout)
userStore.listen((user) => {
  // Evitar errores durante la compilación estática de Astro (SSR/SSG en Node)
  if (typeof window === 'undefined') return;
  
  if (user) {
    // Si el usuario inicia sesión, cargamos su carrito persistente desde localStorage
    const key = getStorageKey(user);
    const saved = localStorage.getItem(key);
    try {
      cartStore.set(saved ? JSON.parse(saved) : []);
    } catch (e) {
      console.error('Error al parsear el carrito desde localStorage:', e);
      cartStore.set([]);
    }
  } else {
    // Si el usuario cierra sesión (logout), limpiamos el estado del carrito en memoria
    cartStore.set([]);
  }
});

// Sincronizar automáticamente cualquier modificación del carrito en localStorage
cartStore.listen((items) => {
  if (typeof window === 'undefined') return;
  
  const user = userStore.get();
  if (user) {
    const key = getStorageKey(user);
    if (key) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  }
});

/**
 * Añade un producto al carrito de compras con cantidad inicial de 1,
 * siempre y cuando no exista ya en él.
 * @param {string} productId - ID del producto a añadir.
 */
export function addToCart(productId) {
  const current = cartStore.get();
  const exists = current.find(item => item.id === productId);
  if (!exists) {
    cartStore.set([...current, { id: productId, quantity: 1 }]);
  }
}

/**
 * Modifica la cantidad de un artículo existente en el carrito.
 * Enforce de límites estrictos: cantidad debe estar en el rango [1, 9].
 * @param {string} productId - ID del producto.
 * @param {number} quantity - Nueva cantidad solicitada.
 */
export function updateQuantity(productId, quantity) {
  // Validamos límites establecidos en las decisiones de diseño
  if (quantity < 1 || quantity > 9) return;
  
  const current = cartStore.get();
  const updated = current.map(item => {
    if (item.id === productId) {
      return { ...item, quantity };
    }
    return item;
  });
  cartStore.set(updated);
}

/**
 * Vacía completamente el carrito y borra el registro asociado en localStorage.
 */
export function clearCart() {
  cartStore.set([]);
  if (typeof window === 'undefined') return;
  
  const user = userStore.get();
  if (user) {
    const key = getStorageKey(user);
    if (key) {
      localStorage.removeItem(key);
    }
  }
}
