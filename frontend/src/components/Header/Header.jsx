import React from 'react';
import './Header.css';
import { Instagram, Youtube, MapPin, ShoppingBag } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { toggleLanguage } from '../../store/languageStore';
import AuthWidget from '../Auth/AuthWidget';
import FavoritesDashboard from '../FavoritesDashboard/FavoritesDashboard';
import VenuesModal from '../VenuesMap/VenuesModal';

import logoImage from '../../assets/main_logo.jpg';

// Este componente es la parte superior de mi web, donde gestiono la marca y la navegación
const Header = () => {
  const [isVenuesOpen, setIsVenuesOpen] = React.useState(false);

  // Manejo el logo central de la liga, asegurándome de sacar la URL correcta del objeto de Astro
  const logoSrc = typeof logoImage === 'object' ? logoImage.src : logoImage;
  // Traigo mis herramientas de traducción y el idioma actual (es/en)
  const { t, language } = useTranslation();

  return (
    <header className="header">
      <div className="header-left">
        {/* Contenedor para el logo principal de la Mini Football Leagues */}
        <div className="logo-container">
          <img src={logoSrc} alt="MFL Logo" className="main-logo" />
        </div>
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

        {/* Muestro el widget de Login / Perfil de usuario para gestionar la cuenta de Supabase */}
        <AuthWidget />
      </div>

      {/* Modal flotante del mapa de sedes */}
      <VenuesModal isOpen={isVenuesOpen} onClose={() => setIsVenuesOpen(false)} />
    </header>
  );
};

export default Header;
