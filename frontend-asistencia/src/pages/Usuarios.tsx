import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { Users, Search, RefreshCw, Loader2, AlertTriangle, Mail } from "lucide-react";

type Usuario = {
  id: number;
  name: string;
  email: string;
  roles?: Array<string | { name?: string }>;
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
  const arr = Array.isArray(u.roles) ? u.roles : [];
  const r0 = arr[0];
  const fromRoles = typeof r0 === "string" ? r0 : String((r0 as any)?.name ?? "").trim();
  return fromRoles || String(u.role_name ?? u.role ?? "").trim() || "—";
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
  if (role.includes("emple")) return "bg-emerald-600 text-white";
  return "bg-slate-600 text-white";
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
        <div className="h-6 w-20 bg-black/10 rounded-full" />
      </td>
    </tr>
  );
}

export default function Usuarios() {
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
      const list = extractItems(dataRoot);
      setItems(list);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? "Error cargando usuarios";
      setError(`(${status ?? "?"}) ${msg}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
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

          <button
            onClick={cargar}
            className={[
              "h-10 px-3 rounded-2xl border border-black/15 bg-white font-extrabold text-xs",
              "hover:bg-black/5 transition flex items-center gap-2",
              "focus:outline-none focus:ring-2 focus:ring-[#FE003E]/25",
              loading ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            disabled={loading}
            type="button"
            title="Refrescar"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className={[
                "w-full pl-9 pr-3 py-2 rounded-2xl border border-black/15 outline-none",
                "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
              ].join(" ")}
            />
          </div>

          <button
            onClick={cargar}
            className={[
              "h-10 rounded-2xl bg-black text-white px-4 font-extrabold",
              "hover:opacity-90 transition",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-black/20",
              "flex items-center justify-center gap-2",
            ].join(" ")}
            type="button"
            disabled={loading}
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
                <th className="text-left px-3 py-2">Usuario</th>
                <th className="text-left px-3 py-2">Correo</th>
                <th className="text-left px-3 py-2">Rol</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                items.map((u, idx) => {
                  const role = firstRole(u);
                  return (
                    <tr
                      key={u.id}
                      className={[
                        "border-t border-black/10",
                        idx % 2 === 1 ? "bg-black/[0.01]" : "bg-white",
                        "hover:bg-black/[0.03] transition",
                      ].join(" ")}
                    >
                      <td className="px-3 py-3 font-bold">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="h-9 w-9 rounded-2xl bg-black text-white grid place-items-center font-black">
                            {initials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{u.name}</div>
                            <div className="text-[11px] text-black/45 truncate">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-black/80 min-w-[220px]">
                          <Mail className="h-4 w-4 text-black/40" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className={["inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black", roleBadge(role)].join(" ")}>
                          {role}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-black/60">
                    Sin usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
