import {createClient} from '@supabase/supabase-js';

const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabaseKEY = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseURL || !supabaseKEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseURL, supabaseKEY);

export default supabase;
