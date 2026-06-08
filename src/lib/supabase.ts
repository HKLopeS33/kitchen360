import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL e Anon Key são obrigatórios. Configure o arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'client' | 'restaurant_owner' | 'admin';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  address: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  available: boolean;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  category: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  open_time: string;
  close_time: string;
  is_open_today: boolean;
  free_shipping: boolean;
  promo_text: string | null;
  delivery_time_min: number;
  delivery_time_max: number;
  image_url: string | null;
  mp_access_token: string | null;
  subscription_status: 'trial' | 'active' | 'past_due' | 'suspended';
  trial_ends_at: string;
  subscription_active_until: string | null;
  accepted_terms_at: string | null;
  created_at: string;
}
