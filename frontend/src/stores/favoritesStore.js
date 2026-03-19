import { atom } from 'nanostores';
import { supabase } from '../lib/supabase';
import { userStore } from './authStore';

// Defino mi "almacén" global de favoritos usando un átomo de Nanostores
// Guardaré un array de objetos con la estructura { team_name, league_id }
export const favoritesStore = atom([]);
// También controlo si el sistema está cargando datos de la base de datos
export const isFavoritesLoading = atom(false);

// Función para traer todos los favoritos que tengo guardados en Supabase
export const fetchFavorites = async () => {
  const user = userStore.get();
  // Si no hay usuario logueado, limpio la lista de favoritos
  if (!user) {
    favoritesStore.set([]);
    return;
  }

  isFavoritesLoading.set(true);
  try {
    // Consulto la tabla 'user_favorites' filtrando automáticamente por el usuario actual
    const { data, error } = await supabase
      .from('user_favorites')
      .select('team_name, league_id');
      
    if (error) throw error;
    // Actualizo mi store local con los datos reales de la nube
    favoritesStore.set(data || []);
  } catch (error) {
    console.error('Error fetching favorites:', error);
  } finally {
    isFavoritesLoading.set(false);
  }
};

// Me quedo "escuchando" cambios en el estado de autenticación
// Si alguien inicia sesión, traigo sus favoritos de inmediato
userStore.listen((user) => {
  if (user) {
    fetchFavorites();
  } else {
    favoritesStore.set([]);
  }
});

// Función auxiliar para saber rápidamente si un equipo concreto es ya favorito
export const isFavorite = (team_name, league_id) => {
  const favorites = favoritesStore.get();
  return favorites.some(fav => fav.team_name === team_name && fav.league_id === league_id);
};

// Esta es la función principal para añadir o quitar favoritos (Toggle)
export const toggleFavorite = async (team_name, league_id) => {
  const user = userStore.get();
  // Si el usuario no está logueado, le aviso de que necesita una cuenta
  if (!user) {
    alert("Debes iniciar sesión para marcar equipos como favoritos.");
    return;
  }

  const currentlyFavorite = isFavorite(team_name, league_id);
  const currentFavorites = favoritesStore.get();

  // IMPLEMENTO UNA ACTUALIZACIÓN OPTIMISTA:
  // Actualizo la interfaz de inmediato para que el usuario no sienta retardo (lag)
  if (currentlyFavorite) {
    favoritesStore.set(currentFavorites.filter(fav => !(fav.team_name === team_name && fav.league_id === league_id)));
  } else {
    favoritesStore.set([...currentFavorites, { team_name, league_id }]);
  }

  try {
    if (currentlyFavorite) {
      // Si ya era favorito, lo BORRO de la base de datos de Supabase
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .match({ user_id: user.id, team_name, league_id });
        
      if (error) throw error;
    } else {
      // Si no lo era, lo INSERTO en la base de datos vinculándolo a mi ID de usuario
      const { error } = await supabase
        .from('user_favorites')
        .insert([{ user_id: user.id, team_name, league_id }]);
        
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    // Si algo falla en la red, revierto el cambio optimista recargando los datos reales
    fetchFavorites();
  }
};
