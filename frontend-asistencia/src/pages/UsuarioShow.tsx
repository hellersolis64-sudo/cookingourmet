import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { AlertTriangle, ArrowLeft, Mail, Shield, User2, Loader2 } from "lucide-react";

type RolLite = { id: number; nombre: string };

type Usuario = {
  id: number;
  name: string;
  email: string;
  roles?: RolLite[];
  created_at?: string;
  email_verified_at?: string | null;
};

function roleBadge(roleRaw: string) {
  const role = String(roleRaw || "").toLowerCase();
  if (role.includes("admin")) return "bg-[#FE003E] text-white";
  if (role.includes("super")) return "bg-black text-white";
  if (role.includes("emple") || role.includes("colab")) return "bg-emerald-600 text-white";
  if (role.includes("estu")) return "bg-slate-600 text-white";
  return "bg-slate-600 text-white";
}

function firstRole(u: Usuario): string {
  const r0 = Array.isArray(u.roles) ? u.roles[0] : null;
  return r0 ? String(r0.nombre ?? "").trim() : "—";
}

function initials(name?: string) {
  const s = String(name ?? "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).slice(0, 2);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function UsuarioShow() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [u, setU] = useState<Usuario | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);

    try {
      const r = await api.get(`/usuarios/${id}`);
      const payload = r.data?.data ?? r.data;

      // acepta {data:{...}} o directo
      const user: Usuario = payload?.id ? payload : payload?.data ?? null;

      if (!user?.id) throw new Error("Respuesta inválida");
      setU(user);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? "Error cargando perfil";
      setError(`(${status ?? "?"}) ${msg}`);
      setU(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-black/10 p-6">
          <div className="flex items-center gap-2 text-black/70 font-bold">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando perfil...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="max-w-4xl mx-auto rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div>
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/dashboard/usuarios")}
          className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 font-extrabold hover:bg-black/5"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      </div>

      <section className="max-w-4xl mx-auto bg-white rounded-2xl border border-black/10 shadow-sm p-6">
        {!u ? (
          <div className="text-black/60">No se encontró el usuario.</div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-3xl bg-black text-white grid place-items-center font-black text-lg">
                  {initials(u.name)}
                </div>

                <div className="min-w-0">
                  <div className="text-2xl font-extrabold truncate">{u.name}</div>
                  <div className="text-sm text-black/60 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="text-xs text-black/45 mt-1">ID: {u.id}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs font-black text-black/70">
                  <Shield className="h-4 w-4" />
                  Rol:
                  <span className={["px-2 py-0.5 rounded-full", roleBadge(firstRole(u))].join(" ")}>
                    {firstRole(u)}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 p-4">
                <div className="text-xs font-black tracking-widest text-black/45">ESTADO</div>
                <div className="mt-2 text-sm font-bold text-black/75">
                  {u.email_verified_at ? "Correo verificado ✅" : "Correo NO verificado ⚠️"}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 p-4">
                <div className="text-xs font-black tracking-widest text-black/45">ACCIONES</div>
                <div className="mt-2 text-sm text-black/60">
                  Aquí vamos a poner los botones de <b>Editar</b> y <b>Eliminar</b> en el siguiente paso.
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
