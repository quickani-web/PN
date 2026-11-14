import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function publicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

let browserClient: SupabaseClient | null = null;

/** Short ISR cache for catalogue reads — faster deploys without sticky empties. */
const serverFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    next: { revalidate: 60 },
  });

export function getSupabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  if (typeof window === "undefined") {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: serverFetch },
    });
  }

  if (!browserClient) {
    browserClient = createClient(url, key);
  }
  return browserClient;
}

export function getSupabaseService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: serverFetch },
  });
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publicKey());
}
