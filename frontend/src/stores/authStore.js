import { atom } from 'nanostores'; // Importo la función 'atom' de la librería 'nanostores'
import { supabase } from '../lib/supabase'; // Importo la instancia de Supabase que ya configuré en lib/supabase.js

// Defino mis átomos para gestionar la identidad del usuario y el estado de carga:
export const userStore = atom(null); // Aquí guardo el objeto 'user' de Supabase
export const authLoadingStore = atom(true); // Controla si la web está todavía comprobando la sesión

// Implemento esta función para arrancar el sistema de autenticación al cargar la web
export async function initAuth() {

  // Primero, compruebo si ya existe una sesión guardada en las cookies/localstorage
  const { data: { session } } = await supabase.auth.getSession(); // Uso la desestructuración de objetos para extraer solo la propiedad 'session' del objeto 'data'

  // Si hay sesión, guardo el usuario; si no, lo dejo como null
  userStore.set(session?.user || null); // Uso el operador '?.', que significa "solo si existe 'session', accede a 'user'", y si no existe, devuelve 'null'

  // Indico que la comprobación inicial ha terminado
  authLoadingStore.set(false); // Establezco el estado de carga en 'false', indicando que ya hemos terminado de comprobar la sesión

  // Me suscribo a cualquier cambio futuro en el estado (login, logout, token refresh):
  supabase.auth.onAuthStateChange((_event, session) => { // Recibo el evento y la sesión como parámetros

    // Mantengo mi userStore siempre sincronizado con lo que me diga Supabase
    userStore.set(session?.user || null); // De nuevo, si hay sesión, guardo el usuario; si no, lo dejo como null
  });

} 
