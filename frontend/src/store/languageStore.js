import { atom } from 'nanostores'; // Importo la función 'atom' de la librería 'nanostores'

// Defino mi átomo global para gestionar el idioma de toda la web
// He elegido 'es' (español) como el idioma por defecto para mis usuarios
export const languageStore = atom('es');

// Implemento esta función para que el usuario pueda alternar entre español e inglés
export function toggleLanguage() {
  const current = languageStore.get(); // Obtengo el idioma actual
  // Hago un simple "switch" entre los dos idiomas soportados (es / en)
  languageStore.set(current === 'es' ? 'en' : 'es'); // Si está actualmente en español, cambia a inglés, y viceversa
}
