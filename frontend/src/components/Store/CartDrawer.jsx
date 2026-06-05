import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingBag, X, Trash2, Loader, AlertCircle } from 'lucide-react';
import { cartStore, isCartOpen, updateQuantity, removeFromCart } from '../../stores/cartStore';
import { userStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import './CartDrawer.css';

const CartDrawer = () => {
  const isOpen = useStore(isCartOpen);
  const cartItems = useStore(cartStore);
  const user = useStore(userStore);

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const drawerRef = useRef(null);

  // Cargar catálogo de productos de S3 en cliente para mapear detalles de items
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const isLocal = !import.meta.env.SSR && (
          globalThis.location.hostname === 'localhost' ||
          globalThis.location.hostname === '127.0.0.1'
        );
        const cdnUrl = (import.meta.env.DEV || isLocal) ? '/s3-cdn' : import.meta.env.PUBLIC_CLOUDFRONT_URL;
        if (!cdnUrl && !import.meta.env.DEV && !isLocal) {
          throw new Error('PUBLIC_CLOUDFRONT_URL is not set');
        }
        const s3Url = `${cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl}/products/products.json`;
        const response = await fetch(s3Url);
        if (response.ok) {
          const data = await response.json();
          setCatalog(data);
        } else if (import.meta.env.DEV) {
          console.error(`Error loading S3 catalogue: HTTP ${response.status}`);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Error fetching products from S3:', err);
        }
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, []);

  // Escuchar tecla Escape para cerrar el drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        isCartOpen.set(false);
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Bloquear el scroll de la página principal al abrir el drawer
  useEffect(() => {
    if (!import.meta.env.SSR) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (!import.meta.env.SSR) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  // Si el drawer no está abierto, no renderizamos nada (para evitar overlays invisibles tapando la UI)
  if (!isOpen) return null;

  // Mapear elementos del carrito con los detalles del catálogo
  const detailedCartItems = cartItems.map(item => {
    const product = catalog.find(p => p.id === item.id);
    return {
      ...item,
      // Si el catálogo aún no cargó o no existe el producto, usamos valores por defecto
      name: product ? product.name : `Producto (${item.id})`,
      price: product ? product.price : 0,
      image: product ? product.image : '',
      description: product ? product.description : ''
    };
  });

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = detailedCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleIncrement = (productId, currentQty) => {
    if (currentQty < 9) {
      updateQuantity(productId, currentQty + 1);
    }
  };

  const handleDecrement = (productId, currentQty) => {
    if (currentQty > 1) {
      updateQuantity(productId, currentQty - 1);
    }
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
  };

  const handleCheckout = async () => {
    setError(null);
    setWarningMessage(null);

    if (!user) {
      setWarningMessage('Debes iniciar sesión para comprar. Por favor, usa el botón de login arriba a la derecha.');
      return;
    }

    if (cartItems.length === 0) {
      setError('El carrito está vacío.');
      return;
    }

    setLoadingCheckout(true);

    try {
      // Obtener sesión activa para conseguir el token JWT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No se pudo verificar la sesión activa de Supabase.');
      }

      const isLocal = !import.meta.env.SSR && (
        globalThis.location.hostname === 'localhost' ||
        globalThis.location.hostname === '127.0.0.1'
      );
      const apiGatewayUrl = (import.meta.env.DEV || isLocal) ? '/checkout-api' : import.meta.env.PUBLIC_API_GATEWAY_URL;
      if (!apiGatewayUrl) {
        throw new Error('La URL del API Gateway no está configurada.');
      }

      const response = await fetch(`${apiGatewayUrl.endsWith('/') ? apiGatewayUrl.slice(0, -1) : apiGatewayUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({ id: item.id, quantity: item.quantity })),
          success_url: `${globalThis.location.origin}/checkout/success`,
          cancel_url: `${globalThis.location.origin}/checkout/cancel`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('La respuesta del servidor no contiene la URL de Stripe Checkout.');
      }

      // Redirigir al checkout de Stripe
      globalThis.location.assign(data.url);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error al iniciar checkout desde el Drawer:', err);
      }
      setError('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  let drawerContent;
  if (loadingCatalog && detailedCartItems.length === 0) {
    drawerContent = (
      <div className="cart-drawer-loading">
        <Loader className="spinner" size={32} />
        <p>Cargando productos...</p>
      </div>
    );
  } else if (detailedCartItems.length === 0) {
    drawerContent = (
      <div className="cart-drawer-empty">
        <ShoppingBag size={48} className="empty-icon" />
        <p>Tu carrito está vacío</p>
        <button
          className="continue-shopping-btn"
          onClick={() => isCartOpen.set(false)}
        >
          Continuar comprando
        </button>
      </div>
    );
  } else {
    drawerContent = (
      <div className="cart-drawer-items-list">
        {detailedCartItems.map((item) => (
          <div key={item.id} className="cart-drawer-item">
            <div className="cart-drawer-item-image-wrapper">
              {item.image ? (
                <img src={item.image} alt={item.name} className="cart-drawer-item-image" loading="lazy" width={64} height={64} />
              ) : (
                <div className="cart-drawer-item-image-placeholder">
                  <ShoppingBag size={20} />
                </div>
              )}
            </div>
            <div className="cart-drawer-item-details">
              <h4 className="cart-drawer-item-name">{item.name}</h4>
              <p className="cart-drawer-item-price">
                {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </p>
              <div className="cart-drawer-item-actions">
                <div className="cart-drawer-qty-selector">
                  <button
                    onClick={() => handleDecrement(item.id, item.quantity)}
                    className="qty-btn"
                    disabled={item.quantity <= 1 || loadingCheckout}
                    aria-label="Disminuir cantidad"
                  >
                    -
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    onClick={() => handleIncrement(item.id, item.quantity)}
                    className="qty-btn"
                    disabled={item.quantity >= 9 || loadingCheckout}
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="cart-drawer-remove-btn"
                  disabled={loadingCheckout}
                  aria-label="Eliminar producto"
                  title="Eliminar del carrito"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cart-drawer-wrapper">
      <button
        className="cart-drawer-overlay"
        onClick={() => isCartOpen.set(false)}
        aria-label="Cerrar al hacer clic fuera"
      />
      <dialog
        className="cart-drawer"
        ref={drawerRef}
        open
        aria-label="Carrito de compras"
      >
        <div className="cart-drawer-header">
          <div className="cart-drawer-title-container">
            <ShoppingBag size={24} className="cart-drawer-icon" />
            <h2>Tu Carrito</h2>
            {totalQuantity > 0 && <span className="cart-drawer-badge">{totalQuantity}</span>}
          </div>
          <button
            className="cart-drawer-close-btn"
            onClick={() => isCartOpen.set(false)}
            aria-label="Cerrar carrito"
          >
            <X size={24} />
          </button>
        </div>

        <div className="cart-drawer-body">
          {warningMessage && (
            <div className="cart-drawer-alert warning-alert">
              <AlertCircle size={18} />
              <span>{warningMessage}</span>
            </div>
          )}

          {error && (
            <div className="cart-drawer-alert error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {drawerContent}
        </div>

        {detailedCartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="total-row main-total">
                <span>Total</span>
                <span>{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>

            <button
              className="cart-drawer-checkout-btn"
              onClick={handleCheckout}
              disabled={loadingCheckout}
            >
              {loadingCheckout ? (
                <>
                  <Loader className="spinner" size={18} />
                  Procesando pago...
                </>
              ) : (
                'Proceder al Pago'
              )}
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
};

export default CartDrawer;
