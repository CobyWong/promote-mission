import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseMobileConfig, mobileConfig } from "./config";

export { hasSupabaseMobileConfig };

export const supabase = createClient(mobileConfig.supabaseUrl, mobileConfig.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
