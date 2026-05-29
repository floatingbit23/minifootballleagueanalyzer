import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { userStore } from '../../stores/authStore';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { cartStore, addToCart, updateQuantity, isCartOpen } from '../../stores/cartStore';
import './StoreWidget.css';

const StoreWidget = ({ products = [] }) => {
  const user = useStore(userStore);
  const cartItems = useStore(cartStore);
  const [error, setError] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);

  const handleBuy = (product) => {
    setError(null);
    setWarningMessage(null);

    // D-04: Impedir que usuarios no autenticados inicien checkout
    if (!user) {
      setWarningMessage('Debes iniciar sesión para comprar. Por favor, usa el botón de login arriba a la derecha.');
      return;
    }

    addToCart(product.id);
    // OPCIONAL: Abrir el carrito inmediatamente después de añadir un producto
    isCartOpen.set(true);
  };

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

  const handleOpenCart = () => {
    isCartOpen.set(true);
  };

  return (
    <div className="store-container">
      <div className="store-header">
        <h1 className="store-title">
          <ShoppingBag className="store-title-icon" size={32} />
          Tienda Oficial de MFL
        </h1>
        <p className="store-subtitle">
          Apoya a tu equipo vistiendo el equipamiento oficial de la liga. Todos los envíos se procesan de manera segura con Stripe.
        </p>
      </div>

      {cartItems.length > 0 && (
        <div className="cart-summary-bar">
          <div className="cart-summary-info">
            <span className="cart-summary-count">
              Tienes <strong>{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</strong> artículos en tu carrito
            </span>
          </div>
          <button
            onClick={handleOpenCart}
            className="checkout-button"
          >
            Ver Carrito / Pagar
          </button>
        </div>
      )}

      {warningMessage && (
        <div className="store-alert warning-alert">
          <AlertCircle size={20} />
          <span>{warningMessage}</span>
        </div>
      )}

      {error && (
        <div className="store-alert error-alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="products-grid">
        {products.map((product) => {
          const cartItem = cartItems.find(item => item.id === product.id);
          return (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                  loading="lazy"
                />
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">
                    {product.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                  {cartItem ? (
                    <div className="quantity-selector">
                      <button
                        onClick={() => handleDecrement(product.id, cartItem.quantity)}
                        className="quantity-btn decrement-btn"
                        disabled={cartItem.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="quantity-value">{cartItem.quantity}</span>
                      <button
                        onClick={() => handleIncrement(product.id, cartItem.quantity)}
                        className="quantity-btn increment-btn"
                        disabled={cartItem.quantity >= 9}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(product)}
                      className="buy-button"
                    >
                      Comprar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoreWidget;
