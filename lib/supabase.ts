import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | undefined;
let _supabase: SupabaseClient | undefined;

// Server-side client (full access) — created lazily so importing this module
// doesn't throw during build-time page data collection when env vars aren't
// yet available (e.g. Vercel preview deploys without Preview-scoped env vars).
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

// Client-side client
export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

export async function searchRAG(query: string, topK = 8) {
  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const embedding = embeddingRes.data[0].embedding;

  const { data, error } = await getSupabaseAdmin().rpc("match_documents", {
    query_embedding: embedding,
    match_count: topK,
    filter: {},
  });

  if (error) throw error;
  return data as { content: string; metadata: Record<string, string>; similarity: number }[];
}

export async function getLatestMetrics() {
  const { data } = await getSupabaseAdmin()
    .from("indicadores_reportes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return data || [];
}

export async function getRecentDocuments(limit = 10) {
  const { data } = await getSupabaseAdmin()
    .from("documents")
    .select("metadata, id")
    .order("id", { ascending: false })
    .limit(limit);
  return data || [];
}
