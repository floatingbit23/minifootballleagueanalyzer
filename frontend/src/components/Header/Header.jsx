import React from 'react';
import './Header.css';
import { Instagram, Youtube } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { toggleLanguage } from '../../store/languageStore';
import AuthWidget from '../Auth/AuthWidget';
import FavoritesDashboard from '../FavoritesDashboard/FavoritesDashboard';

import logoImage from '../../assets/main_logo.jpg';

// Este componente es la parte superior de mi web, donde gestiono la marca y la navegación
const Header = () => {
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
        {/* Enlaces a las redes sociales oficiales del torneo */}
        <div className="social-icons">
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
    </header>
  );
};

export default Header;
