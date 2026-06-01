import { createClient } from '@supabase/supabase-js'; // Importo la función 'createClient' de la librería '@supabase/supabase-js'

// Obtengo la URL de mi proyecto de Supabase desde las variables de entorno (.env.local)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
// Obtengo la clave pública (Anon Key) de mi proyecto de Supabase desde las variables de entorno (.env.local)
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Creo la instancia de Supabase que usaré en toda la aplicación.
// Si las variables de entorno no están definidas (ej. en CI/build), devuelvo null
// para evitar un crash en tiempo de importación. Los componentes deben comprobar
// que supabase !== null antes de usarlo.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
