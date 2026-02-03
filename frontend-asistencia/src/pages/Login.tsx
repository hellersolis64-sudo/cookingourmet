import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { signIn, refreshAccessMode } = useAuth();

  const [email, setEmail] = useState("@cookingourmet.edu.pe");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const LOGO_URL = "/assets/logo-cooking.png";

  // ✅ si ProtectedRoute te mandó al login, aquí viene la ruta original
  const from = (location.state as any)?.from || "/dashboard";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email.trim(), password);

      // ✅ refresca access mode real (no bloquea si falla)
      refreshAccessMode().catch(() => {});

      // ✅ vuelve a donde iba (o /dashboard)
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Credenciales incorrectas o error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[600px] w-[600px] rounded-full bg-[#FE003E]/15 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-orange-600/5 blur-[100px]" />

        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1.1px)`,
            backgroundSize: "30px 30px",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-3xl bg-black/40 border border-white/10 rounded-[3rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#FE003E] to-[#ff4d7a] p-0.5 shadow-[0_0_30px_rgba(254,0,62,0.3)] mb-5">
              <div className="h-full w-full rounded-full bg-[#050505] flex items-center justify-center overflow-hidden">
                <img
                  src={LOGO_URL}
                  alt="CG"
                  className="h-12 w-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<span class="text-[#FE003E] text-2xl font-black">CG</span>';
                  }}
                />
              </div>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
              Cooking <span className="text-[#FE003E]">Gourmet</span>
            </h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
              Escuela de Alta Cocina
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase ml-4 tracking-widest">Usuario</label>
              <input
                type="email"
                className="w-full bg-white/5 rounded-2xl border border-white/10 px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#FE003E]/40 transition-all placeholder:text-white/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="@cookingourmet.edu.pe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase ml-4 tracking-widest">Contraseña</label>
              <input
                type="password"
                className="w-full bg-white/5 rounded-2xl border border-white/10 px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#FE003E]/40 transition-all placeholder:text-white/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full rounded-2xl bg-[#FE003E] py-5 text-white font-bold text-sm uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(254,0,62,0.2)] transition-all disabled:opacity-50"
            >
              {loading ? "Preparando acceso..." : "Entrar a la Academia"}
            </motion.button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center"
              >
                <p className="text-red-400 text-xs font-bold uppercase tracking-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute bottom-8 flex flex-col items-center gap-3">
        <div className="h-[1px] w-12 bg-white/10" />
        <span className="text-white/20 text-[9px] uppercase tracking-[0.5em] font-medium">
          Cooking Gourmet System • 2026
        </span>
      </div>
    </div>
  );
}
