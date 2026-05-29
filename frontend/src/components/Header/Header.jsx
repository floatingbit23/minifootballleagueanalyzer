import React from 'react';
import './Header.css';
import { Instagram, Youtube, MapPin, ShoppingBag } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { useTranslation } from '../../hooks/useTranslation';
import { toggleLanguage } from '../../store/languageStore';
import { cartStore, isCartOpen } from '../../stores/cartStore';
import AuthWidget from '../Auth/AuthWidget';
import FavoritesDashboard from '../FavoritesDashboard/FavoritesDashboard';
import VenuesModal from '../VenuesMap/VenuesModal';
import CartDrawer from '../Store/CartDrawer';

// Este componente es la parte superior de mi web, donde gestiono la marca y la navegación
const Header = () => {
  const [isVenuesOpen, setIsVenuesOpen] = React.useState(false);
  const logoSrc = '/main_logo.jpg';
  // Traigo mis herramientas de traducción y el idioma actual (es/en)
  const { t, language } = useTranslation();

  // Suscribirse al almacén de carrito para calcular la cantidad de productos
  const cartItems = useStore(cartStore);
  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="header">
      <div className="header-left">
        {/* Contenedor para el logo principal de la Mini Football Leagues */}
        <a href="/" className="logo-link" title="Volver a la página principal">
          <div className="logo-container">
            <img src={logoSrc} alt="MFL Logo" className="main-logo" />
          </div>
        </a>
        <div className="header-titles">
          <h1 className="title-main">MINI FOOTBALL LEAGUES</h1>
          {/* Muestro el subtítulo dinámico según el idioma seleccionado */}
          <p className="title-sub">{t('header.subtitle')}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Enlaces a las redes sociales oficiales del torneo y utilidades */}
        <div className="social-icons">
          {/* Enlace a la Tienda Oficial */}
          <a
            href="/store"
            className="store-nav-btn"
            title="Ir a la tienda oficial"
          >
            <ShoppingBag size={18} strokeWidth={2.5} />
            <span>{t('header.store')}</span>
          </a>

          {/* Botón de Sedes a la izquierda del botón de Instagram */}
          <button
            className="venues-open-btn"
            onClick={() => setIsVenuesOpen(true)}
            title="Ver sedes"
          >
            <MapPin size={18} strokeWidth={2.5} />
            <span>Sedes</span>
          </button>

          <a href="https://www.instagram.com/minifootballleagues_espana" className="social-icon" aria-label="Instagram">
            <Instagram size={24} strokeWidth={2} />
          </a>
          <a href="https://www.youtube.com/channel/UCztHwYFe0WIDNA84WGJOWMg#" className="social-icon" aria-label="Youtube">
            <Youtube size={26} strokeWidth={2} />
          </a>
        </div>

        {/* Botón para cambiar el idioma de toda la web al instante */}
        <button
          className="lang-selector"
          onClick={toggleLanguage}
        >
          {language === 'es' ? 'ES' : 'EN'}
        </button>

        {/* Muestro el acceso a mis equipos favoritos (panel lateral) */}
        <FavoritesDashboard />

        {/* Botón del carrito con badge circular brillante */}
        <button
          className="header-cart-btn"
          onClick={() => isCartOpen.set(true)}
          title="Ver carrito de compras"
          aria-label="Ver carrito"
        >
          <ShoppingBag size={20} strokeWidth={2.5} />
          {totalCartItems > 0 && (
            <span className="header-cart-badge">{totalCartItems}</span>
          )}
        </button>

        {/* Muestro el widget de Login / Perfil de usuario para gestionar la cuenta de Supabase */}
        <AuthWidget />
      </div>

      {/* Modal flotante del mapa de sedes */}
      <VenuesModal isOpen={isVenuesOpen} onClose={() => setIsVenuesOpen(false)} />

      {/* Drawer lateral del carrito */}
      <CartDrawer />
    </header>
  );
};

export default Header;
