import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { searchRAG } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sos Alfredo, asistente de análisis de información de la Secretaría de Gestión Institucional del Ministerio de Justicia y Seguridad de Santa Fe.

Tenés acceso a todos los documentos, reportes e indicadores de la Secretaría cargados en la base de conocimiento.

CÓMO RESPONDÉS:
- Directo y preciso, como un analista senior
- Siempre citás la fuente: "Según [nombre del archivo/reporte]..."
- Para datos numéricos, usá tablas o listas cuando aclaren
- Si encontrás datos de múltiples períodos, hacé la comparativa
- Si no tenés el dato en el contexto, decís: "No encontré esa información en los documentos disponibles"
- NUNCA inventés datos o cifras

ESTRUCTURA DE LA BASE:
- A1.1 Homicidios, A1.2 Operatividad, A1.3 Estadísticas PDI, A1.4 Población Carcelaria
- A1.6 Salidas Uso Público, A2 Comunicación, A3 Vocería/Prensa
- B1 Agenda Legislativa, B2 Programas (Brigadier, Vínculos, 911, Violencia no Juega)
- B4 Infraestructura, B5 LINCE, B6 Delitos Económicos
- C1 Presupuesto, C2 Estructura institucional

Respondés en español argentino, tono profesional pero sin burocracia.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("No autorizado", { status: 401 });

  const { messages, query } = await req.json();

  // Buscar contexto en el RAG
  let context = "";
  let sources: string[] = [];
  try {
    const results = await searchRAG(query || messages[messages.length - 1].content, 8);
    if (results.length > 0) {
      context = results
        .map((r, i) => {
          const filename = r.metadata?.filename || r.metadata?.source || "documento";
          sources.push(filename);
          return `[Fuente ${i + 1}: ${filename}]\n${r.content}`;
        })
        .join("\n\n---\n\n");
    }
  } catch (e) {
    console.error("RAG error:", e);
  }

  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\n=== DOCUMENTOS RELEVANTES ENCONTRADOS ===\n${context}\n=== FIN DOCUMENTOS ===\n\nUsá esta información para responder. Citá las fuentes por nombre de archivo.`
    : `${SYSTEM_PROMPT}\n\nNo se encontraron documentos específicos para esta consulta. Indicalo al usuario.`;

  // Streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send sources first
        if (sources.length > 0) {
          const uniqueSources = Array.from(new Set(sources));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "sources", sources: uniqueSources })}\n\n`)
          );
        }

        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: systemWithContext,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", text: chunk.delta.text })}\n\n`
              )
            );
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(e) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
