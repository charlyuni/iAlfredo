"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/");
    } else {
      setError("Credenciales incorrectas");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-navy-800 border border-electric-500/30 rounded px-3 py-1 text-xs font-mono text-electric-400 mb-6 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-electric-500 rounded-full animate-pulse" />
            Acceso restringido
          </div>
          <h1 className="text-2xl font-bold text-white">Alfredo</h1>
          <p className="text-slate-400 text-sm mt-1">
            Secretaría de Gestión Institucional · MJyS Santa Fe
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric-500 transition-colors"
              placeholder="usuario@mjys.gob.ar"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/30 border border-red-800/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-electric-500 hover:bg-electric-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
