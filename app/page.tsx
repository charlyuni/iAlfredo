"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";

interface Metric {
  indicador: string;
  categoria: string;
  ultimas24hs: number | null;
  semanal: number | null;
  mensual: number | null;
  anual: number | null;
  filename: string;
}

interface RecentDoc {
  filename: string;
  source: string;
  id: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const SOURCE_LABELS: Record<string, string> = {
  dinamica: "A - Dinámica",
  semidin: "B - Semidinámica",
  estatica: "C - Estática",
  whatsapp_grupo: "Grupo WhatsApp",
  estrategia: "Estrategia",
  redes_oficiales: "Redes",
  documentos_generales: "Drive General",
  noticias_externas: "Noticias",
};

function fmt(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("es-AR");
}

function MetricCard({ metric }: { metric: Metric }) {
  const isAlert =
    metric.indicador.toLowerCase().includes("homicidio") ||
    metric.indicador.toLowerCase().includes("herido");

  return (
    <div className="metric-card rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{metric.categoria}</p>
          <p className="text-sm font-medium text-white mt-0.5">{metric.indicador}</p>
        </div>
        {isAlert && (
          <span className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-slate-500">24hs</p>
          <p className={`text-xl font-mono font-bold ${isAlert ? "text-red-400" : "text-electric-400"}`}>
            {fmt(metric.ultimas24hs)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Semanal</p>
          <p className="text-xl font-mono font-bold text-white">{fmt(metric.semanal)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Mensual</p>
          <p className="text-sm font-mono text-slate-300">{fmt(metric.mensual)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Anual</p>
          <p className="text-sm font-mono text-slate-300">{fmt(metric.anual)}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"metrics" | "docs">("metrics");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d.metrics || []);
        setRecentDocs(d.recentDocuments || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "", sources: [] };
    setMessages([...newMessages, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          query: input,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              assistantMessage.content += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            } else if (data.type === "sources") {
              assistantMessage.sources = data.sources;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#060d1a" }}>
      {/* Top bar */}
      <header className="border-b border-navy-800 px-6 py-3 flex items-center justify-between bg-navy-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-electric-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-electric-400 uppercase tracking-widest">
              Sistema activo
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-sm font-semibold text-white">Alfredo</span>
          <span className="text-xs text-slate-500">
            Secretaría de Gestión Institucional · MJyS Santa Fe
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">{session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — metrics */}
        <aside className="w-80 border-r border-navy-800 flex flex-col bg-navy-900 overflow-hidden">
          <div className="flex border-b border-navy-800">
            <button
              onClick={() => setActiveTab("metrics")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "metrics"
                  ? "text-electric-400 border-b-2 border-electric-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              INDICADORES
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "docs"
                  ? "text-electric-400 border-b-2 border-electric-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              DOCUMENTOS
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeTab === "metrics" && (
              <>
                {metrics.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <p>Sin datos de indicadores.</p>
                    <p className="text-xs mt-1">Subí reportes PDF al Drive.</p>
                  </div>
                ) : (
                  metrics.map((m, i) => <MetricCard key={i} metric={m} />)
                )}
              </>
            )}
            {activeTab === "docs" && (
              <div className="space-y-2">
                {recentDocs.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">
                    Sin documentos recientes
                  </p>
                ) : (
                  recentDocs.map((d, i) => (
                    <div key={i} className="metric-card rounded p-3">
                      <p className="text-xs text-white truncate">{d.filename}</p>
                      <span className="text-xs text-slate-500 mt-1 block">
                        {SOURCE_LABELS[d.source] || d.source}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right panel — chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-navy-800 border border-electric-500/30 rounded-full flex items-center justify-center mb-4">
                  <span className="text-electric-400 text-xl">A</span>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  ¿En qué te ayudo?
                </h2>
                <p className="text-slate-400 text-sm max-w-md">
                  Consultame sobre indicadores, reportes, normativa o cualquier
                  documento disponible en la base de conocimiento.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-6 max-w-lg w-full">
                  {[
                    "¿Cuántos homicidios hubo esta semana en la URII?",
                    "Resumí el estado del proyecto de ley de trapitos",
                    "¿Cuáles son los eventos predatorios del último mes?",
                    "¿Qué documentos hay sobre el programa Brigadier?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                      }}
                      className="text-left text-xs text-slate-400 hover:text-white bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded p-3 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg p-4 ${
                  msg.role === "user" ? "chat-message-user" : "chat-message-assistant"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    {msg.role === "user" ? session?.user?.name || "Vos" : "Alfredo"}
                  </span>
                </div>
                <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                    <span className="cursor-blink text-electric-400">▋</span>
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.sources.map((s, si) => (
                      <span
                        key={si}
                        className="text-xs bg-navy-900 text-slate-400 border border-navy-700 rounded px-2 py-0.5"
                      >
                        📄 {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-navy-800 p-4 bg-navy-900">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Consultá sobre indicadores, reportes, normativa..."
                className="flex-1 bg-navy-800 border border-navy-700 rounded px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-electric-500 transition-colors"
                disabled={streaming}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="bg-electric-500 hover:bg-electric-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded text-sm font-medium transition-colors"
              >
                {streaming ? "..." : "Enviar"}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">
              Alfredo responde basándose en los documentos cargados en la base de conocimiento
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
