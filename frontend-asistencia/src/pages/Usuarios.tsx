import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Mail,
  UserPlus,
  ChevronRight,
} from "lucide-react";

type RolLite = { id: number; nombre: string };

type Usuario = {
  id: number;
  name: string;
  email: string;
  roles?: RolLite[];
  role?: string;
  role_name?: string;
};

function extractItems(payload: any): Usuario[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
}

function firstRole(u: Usuario): string {
  const r0 = Array.isArray(u.roles) ? u.roles[0] : null;
  const fromRel = r0 ? String(r0.nombre ?? "").trim() : "";
  return fromRel || String(u.role_name ?? u.role ?? "").trim() || "Sin Rol";
}

function initials(name?: string) {
  const s = String(name ?? "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).slice(0, 2);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function roleBadge(roleRaw: string) {
  const role = String(roleRaw || "").toLowerCase();
  if (role.includes("admin")) return "bg-[#FE003E] text-white";
  if (role.includes("super")) return "bg-black text-white";
  if (role.includes("emple") || role.includes("colab")) return "bg-emerald-600 text-white";
  if (role.includes("estu")) return "bg-slate-600 text-white";
  return "bg-slate-500 text-white";
}

function SkeletonRow() {
  return (
    <tr className="border-t border-black/10 animate-pulse">
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-black/10" />
          <div className="space-y-2">
            <div className="h-3 w-40 bg-black/10 rounded" />
            <div className="h-3 w-28 bg-black/10 rounded" />
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="h-3 w-48 bg-black/10 rounded" />
      </td>
      <td className="px-3 py-3">
        <div className="h-6 w-24 bg-black/10 rounded-full" />
      </td>
      <td className="px-3 py-3">
        <div className="h-6 w-6 bg-black/10 rounded ml-auto" />
      </td>
    </tr>
  );
}

export default function Usuarios() {
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const params = useMemo(() => {
    const s = search.trim();
    return { per_page: 100, page: 1, ...(s ? { search: s } : {}) };
  }, [search]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get("/usuarios", { params });
      const dataRoot = (r.data && (r.data.data ?? r.data)) ?? null;
      setItems(extractItems(dataRoot));
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? "Error cargando usuarios";
      setError(`(${status ?? "?"}) ${msg}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function goShow(u: Usuario) {
    // ✅ Ruta relativa dentro de /dashboard/usuarios
    // Requiere que exista Route path="usuarios/:id"
    navigate(String(u.id));
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div>
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl p-5 border border-black/10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center">
              <Users className="h-5 w-5 text-black/60" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-black">Usuarios</h2>
              <div className="text-xs text-black/60">
                {loading ? "Cargando…" : `${items.length} encontrados`}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard/usuarios/crear")}
              className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-sm shadow-[#FE003E]/20"
              type="button"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </button>

            <button
              onClick={cargar}
              className="h-10 px-3 rounded-2xl border border-black/15 bg-white font-extrabold text-xs hover:bg-black/5 transition flex items-center gap-2 disabled:opacity-60"
              disabled={loading}
              type="button"
              title="Refrescar"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && cargar()}
              placeholder="Buscar por nombre o correo..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl border border-black/15 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
            />
          </div>

          <button
            onClick={cargar}
            className="h-10 rounded-2xl bg-black text-white px-6 font-extrabold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={loading}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Buscar
          </button>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-auto rounded-2xl border border-black/10">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left px-3 py-3">Usuario</th>
                <th className="text-left px-3 py-3">Correo</th>
                <th className="text-left px-3 py-3">Rol</th>
                <th className="text-right px-3 py-3 w-[60px]"></th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-black/40 font-medium">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                items.map((u, idx) => {
                  const role = firstRole(u);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => goShow(u)}
                      className={[
                        "border-t border-black/10 cursor-pointer transition hover:bg-black/[0.03]",
                        idx % 2 === 1 ? "bg-black/[0.01]" : "bg-white",
                      ].join(" ")}
                      title="Ver perfil"
                    >
                      <td className="px-3 py-3 font-bold">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="h-9 w-9 rounded-2xl bg-black text-white grid place-items-center font-black text-xs">
                            {initials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{u.name}</div>
                            <div className="text-[10px] text-black/45 uppercase tracking-wider">
                              ID: {u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-black/70 min-w-[220px]">
                          <Mail className="h-3.5 w-3.5 text-black/30" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${roleBadge(role)}`}>
                          {role}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-black/35 inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] text-black/40 italic">
          * Haz clic en una fila para abrir el perfil del usuario.
        </div>
      </section>
    </div>
  );
}
