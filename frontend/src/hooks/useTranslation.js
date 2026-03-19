import { useStore } from '@nanostores/react'; // Importo 'useStore' de la librería '@nanostores/react', que me permite conectar mis componentes de React con mis stores de Nanostores
import { languageStore } from '../store/languageStore'; // Importo 'languageStore' de '../store/languageStore', que es el store que contiene el idioma actual
import { ui } from '../i18n/traducciones'; // Importo 'ui' de '../i18n/traducciones', que es el diccionario de traducciones

// Este hook personalizado permite traducir textos en mis componentes de forma sencilla

export function useTranslation() {

  // Me suscribo al store de idioma para que, si cambia, el componente se renderice de nuevo
  const language = useStore(languageStore);

  // Defino la función 'translate', que es la que usaré en el HTML o JS
  // Recibo la clave como parámetro (key)
  const translate = (key) => {

    // Busco la clave en mi diccionario 'ui' según el idioma actual (es/en)
    // Si la clave no existe por algún motivo, devuelvo la propia clave para no dejar un vacío
    return ui[language][key] || key; // Devuelvo la traducción
  };

  // Devuelvo la función de traducción y el idioma activo por si el componente lo necesita
  return { translate, language };
}
