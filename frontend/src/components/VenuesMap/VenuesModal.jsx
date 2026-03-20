import React, { useState, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, MapPin, Layers, Moon } from 'lucide-react';
import { venues } from '../../data/venues';
import './VenuesModal.css';

const VenuesModal = ({ isOpen, onClose }) => {
  const mapRef = useRef();
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');

  if (!isOpen) return null;

  const handleVenueClick = (venue) => {
    setSelectedVenue(venue);
    if (mapRef.current) {
      mapRef.current.easeTo({
        center: [venue.lng, venue.lat],
        zoom: 15,
        duration: 2000,
        pitch: 45
      });
    }
  };

  // Agrupar sedes por provincia para la lista
  const murciaVenues = venues.filter(v => v.id.startsWith('murcia'));
  const granadaVenues = venues.filter(v => v.id.startsWith('granada'));

  return (
    <div className="venues-modal-overlay" onClick={onClose}>
      <div
        className="venues-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="venues-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="venues-modal-title">Sedes del Torneo</h2>

        <div className="venues-layout">
          {/* Panel Lateral con Lista de Sedes */}
          <div className="venues-sidebar">
            <div className="sidebar-section">
              <h4>Murcia</h4>
              {murciaVenues.map(venue => (
                <button
                  key={venue.id}
                  className={`venue-item ${selectedVenue?.id === venue.id ? 'active' : ''}`}
                  onClick={() => handleVenueClick(venue)}
                >
                  <MapPin size={16} />
                  <div className="venue-item-info">
                    <span className="venue-item-name">{venue.name}</span>
                    <span className="venue-item-addr">{venue.address.split(',')[0]}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="sidebar-section">
              <h4>Granada</h4>
              {granadaVenues.map(venue => (
                <button
                  key={venue.id}
                  className={`venue-item ${selectedVenue?.id === venue.id ? 'active' : ''}`}
                  onClick={() => handleVenueClick(venue)}
                >
                  <MapPin size={16} />
                  <div className="venue-item-info">
                    <span className="venue-item-name">{venue.name}</span>
                    <span className="venue-item-addr">{venue.address.split(',')[0]}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="venues-map-container">
            <Map
              ref={mapRef}
              mapboxAccessToken={import.meta.env.PUBLIC_MAPBOX_TOKEN}
              initialViewState={{
                longitude: -2.3, // Centered between Murcia and Granada roughly
                latitude: 37.6,
                zoom: 6.5
              }}
              mapStyle={mapStyle}
              attributionControl={false}
            >
              <NavigationControl position="top-right" />

              {venues.map((venue) => (
                <Marker
                  key={venue.id}
                  longitude={venue.lng}
                  latitude={venue.lat}
                  anchor="bottom"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    setSelectedVenue(venue);
                  }}
                >
                  <div className="venue-marker-pin">
                    <MapPin size={32} color="#10b981" fill="#064e3b" />
                  </div>
                </Marker>
              ))}

              {selectedVenue && (
                <Popup
                  longitude={selectedVenue.lng}
                  latitude={selectedVenue.lat}
                  anchor="top"
                  closeOnClick={false}
                  onClose={() => setSelectedVenue(null)}
                  className="venue-popup-dark"
                >
                  <div className="venue-popup-content">
                    <h3>{selectedVenue.name}</h3>
                    <p>{selectedVenue.address}</p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.lat},${selectedVenue.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="venue-directions-link"
                    >
                      <span>Cómo llegar</span>
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7"></line>
                        <polyline points="7 7 17 7 17 17"></polyline>
                      </svg>
                    </a>
                  </div>
                </Popup>
              )}
            </Map>

            <button
              className="map-style-toggle"
              onClick={() => setMapStyle(prev => prev.includes('dark') ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/dark-v11')}
              title="Cambiar vista del mapa"
            >
              {mapStyle.includes('dark') ? <Layers size={18} /> : <Moon size={18} />}
              <span>{mapStyle.includes('dark') ? 'Satélite' : 'Mapa'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenuesModal;
