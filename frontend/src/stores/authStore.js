import { atom } from 'nanostores';
import { supabase } from '../lib/supabase';

export const userStore = atom(null);
export const authLoadingStore = atom(true);

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  userStore.set(session?.user || null);
  authLoadingStore.set(false);

  supabase.auth.onAuthStateChange((_event, session) => {
    userStore.set(session?.user || null);
  });
}
