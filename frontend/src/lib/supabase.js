import { createClient } from '@supabase/supabase-js'; // Importo la función 'createClient' de la librería '@supabase/supabase-js'

// Obtengo la URL de mi proyecto de Supabase desde las variables de entorno (.env.local)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
// Obtengo la clave pública (Anon Key) de mi proyecto de Supabase desde las variables de entorno (.env.local)
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Creo la instancia de Supabase que usaré en toda la aplicación
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
