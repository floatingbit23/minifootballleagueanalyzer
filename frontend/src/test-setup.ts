import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Fix para scrollIntoView (no existe en jsdom)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mocks globales para el entorno de test
// Por ejemplo, para nanostores u otras librerías que dependan de APIs específicas del navegador
vi.mock('lucide-react', () => ({
  Star: () => 'StarIcon',
  ChevronUp: () => 'ChevronUpIcon',
  ChevronDown: () => 'ChevronDownIcon',
}));

// Mock para las traducciones si usas un hook personalizado
vi.mock('./hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

// Mock para framer-motion (para evitar errores con animaciones en jsdom)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => React.createElement('div', props, children),
    h1: ({ children, ...props }) => React.createElement('h1', props, children),
    h2: ({ children, ...props }) => React.createElement('h2', props, children),
    span: ({ children, ...props }) => React.createElement('span', props, children),
  },
  AnimatePresence: ({ children }) => children,
}));
