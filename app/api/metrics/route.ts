import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getLatestMetrics, getRecentDocuments } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  try {
    const [metrics, docs] = await Promise.all([
      getLatestMetrics(),
      getRecentDocuments(8),
    ]);

    // Agrupar métricas por indicador
    const grouped: Record<string, {
      indicador: string;
      categoria: string;
      ultimas24hs: number | null;
      semanal: number | null;
      mensual: number | null;
      anual: number | null;
      filename: string;
      fecha: string;
    }> = {};

    for (const m of metrics) {
      const key = `${m.categoria}__${m.indicador}`;
      if (!grouped[key]) {
        grouped[key] = {
          indicador: m.indicador,
          categoria: m.categoria,
          ultimas24hs: null,
          semanal: null,
          mensual: null,
          anual: null,
          filename: m.filename,
          fecha: m.fecha_reporte,
        };
      }
      const periodo = (m.periodo || "").toLowerCase();
      if (periodo.includes("24")) grouped[key].ultimas24hs = m.valor;
      else if (periodo.includes("semanal") || periodo.includes("semana")) grouped[key].semanal = m.valor;
      else if (periodo.includes("mensual") || periodo.includes("mes")) grouped[key].mensual = m.valor;
      else if (periodo.includes("anual") || periodo.includes("año") || periodo.includes("anio")) grouped[key].anual = m.valor;
    }

    const recentDocs = docs.map((d) => ({
      filename: d.metadata?.filename || "Sin nombre",
      source: d.metadata?.source || "general",
      id: d.id,
    }));

    return Response.json({
      metrics: Object.values(grouped),
      recentDocuments: recentDocs,
      totalDocuments: metrics.length,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Error al obtener métricas" }, { status: 500 });
  }
}
