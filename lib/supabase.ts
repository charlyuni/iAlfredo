import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client (full access)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client-side client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function searchRAG(query: string, topK = 8) {
  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const embedding = embeddingRes.data[0].embedding;

  const { data, error } = await supabaseAdmin.rpc("match_documents", {
    query_embedding: embedding,
    match_count: topK,
    filter: {},
  });

  if (error) throw error;
  return data as { content: string; metadata: Record<string, string>; similarity: number }[];
}

export async function getLatestMetrics() {
  const { data } = await supabaseAdmin
    .from("indicadores_reportes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return data || [];
}

export async function getRecentDocuments(limit = 10) {
  const { data } = await supabaseAdmin
    .from("documents")
    .select("metadata, id")
    .order("id", { ascending: false })
    .limit(limit);
  return data || [];
}
