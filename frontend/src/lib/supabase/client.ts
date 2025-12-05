import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing. Auth will not work.");
}

// Singleton instance to prevent multiple client warnings
let supabaseInstance: SupabaseClient | undefined;

export const supabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return undefined;
  }
  
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Create new instance only once
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};
