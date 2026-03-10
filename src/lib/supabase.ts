import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

// Browser client (used in client components) — lazy initialized
export function getSupabase(): SupabaseClient {
    if (!browserClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            // Return a mock-like client that will fail gracefully
            throw new Error(
                'Supabase env variables not set. Copy .env.example to .env.local and fill in your credentials.'
            );
        }

        browserClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return browserClient;
}

// Server client with service role (used in API routes only)
export function createServerClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Supabase env variables not set. Copy .env.example to .env.local and fill in your credentials.'
        );
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
