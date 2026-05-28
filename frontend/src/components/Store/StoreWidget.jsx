import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { userStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { ShoppingBag, AlertCircle, Loader } from 'lucide-react';
import './StoreWidget.css';

const StoreWidget = ({ products = [] }) => {
  const user = useStore(userStore);
  const [error, setError] = useState(null);
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);

  const handleBuy = async (product) => {
    setError(null);
    setWarningMessage(null);

    // D-04: Impedir que usuarios no autenticados inicien checkout
    if (!user) {
      setWarningMessage('Debes iniciar sesión para comprar. Por favor, usa el botón de login arriba a la derecha.');
      return;
    }

    setLoadingProductId(product.id);

    try {
      // Obtener la sesión activa de Supabase para conseguir el token JWT actualizado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('No se pudo verificar la sesión activa de Supabase.');
      }

      const apiGatewayUrl = import.meta.env.PUBLIC_API_GATEWAY_URL;
      if (!apiGatewayUrl) {
        throw new Error('La URL del API Gateway no está configurada.');
      }

      // Realizar la llamada POST al endpoint /checkout de API Gateway
      const response = await fetch(`${apiGatewayUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          items: [
            {
              id: product.id,
              quantity: 1
            }
          ],
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: `${window.location.origin}/checkout/cancel`
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

      // Redirigir al portal seguro de Stripe Checkout
      window.location.assign(data.url);

    } catch (err) {
      console.error('Error al iniciar checkout:', err);
      setError('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoadingProductId(null);
    }
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
          const isLoading = loadingProductId === product.id;
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
                  <button
                    onClick={() => handleBuy(product)}
                    className="buy-button"
                    disabled={loadingProductId !== null}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="spinner" size={16} />
                        Procesando...
                      </>
                    ) : (
                      'Comprar'
                    )}
                  </button>
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
