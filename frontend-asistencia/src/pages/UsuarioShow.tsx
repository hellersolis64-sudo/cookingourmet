// src/pages/UsuarioShow.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  Shield,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  KeyRound,
} from "lucide-react";

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

function firstRoleId(u: Usuario): number | null {
  const r0 = Array.isArray(u.roles) ? u.roles[0] : null;
  return r0?.id ? Number(r0.id) : null;
}

function initials(name?: string) {
  const s = String(name ?? "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).slice(0, 2);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function UsuarioShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, refreshAccessMode } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [u, setU] = useState<Usuario | null>(null);

  // roles para select
  const [roles, setRoles] = useState<RolLite[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // modal editar
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // eliminar
  const [deleting, setDeleting] = useState(false);

  // form
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRolId, setFRolId] = useState<number | "">("");
  const [fPassword, setFPassword] = useState("");
  const [fPassword2, setFPassword2] = useState("");

  const isViewer = !canEdit;

  async function cargar() {
    setLoading(true);
    setError(null);

    try {
      const r = await api.get(`/usuarios/${id}`);
      const payload = r.data?.data ?? r.data;

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

  async function cargarRoles() {
    setRolesLoading(true);
    try {
      const r = await api.get("/roles");
      const dataRoot = r.data?.data ?? r.data;
      const list = Array.isArray(dataRoot) ? dataRoot : Array.isArray(dataRoot?.data) ? dataRoot.data : [];
      setRoles(list);
    } catch {
      // si falla, no bloqueamos
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // abrir modal: precargar form
  useEffect(() => {
    if (!editOpen || !u) return;
    setFName(u.name ?? "");
    setFEmail(u.email ?? "");
    setFRolId(firstRoleId(u) ?? "");
    setFPassword("");
    setFPassword2("");
  }, [editOpen, u]);

  const currentRoleName = useMemo(() => (u ? firstRole(u) : "—"), [u]);

  async function onOpenEdit() {
    setError(null);

    // refresca access por si cambió
    refreshAccessMode().catch(() => {});
    if (isViewer) {
      setError("(403) Estás en modo visor. No puedes editar.");
      return;
    }

    // carga roles solo cuando haga falta
    if (!roles.length) cargarRoles().catch(() => {});
    setEditOpen(true);
  }

  async function onGuardar() {
    if (!u) return;
    setError(null);

    if (isViewer) {
      setError("(403) Estás en modo visor. No puedes editar.");
      return;
    }

    const name = fName.trim();
    const email = fEmail.trim();

    if (!name) return setError("(422) El nombre es requerido.");
    if (!email) return setError("(422) El correo es requerido.");

    if (fPassword || fPassword2) {
      if (fPassword.length < 6) return setError("(422) La contraseña debe tener al menos 6 caracteres.");
      if (fPassword !== fPassword2) return setError("(422) Las contraseñas no coinciden.");
    }

    const body: any = { name, email };

    // rol (si lo cambió)
    if (fRolId !== "" && Number.isFinite(Number(fRolId))) {
      body.rol_id = Number(fRolId);
    }

    // password opcional
    if (fPassword) body.password = fPassword;

    try {
      setSaving(true);
      await api.put(`/usuarios/${u.id}`, body);
      setEditOpen(false);
      await cargar();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? "Error actualizando usuario";
      setError(`(${status ?? "?"}) ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function onEliminar() {
    if (!u) return;
    setError(null);

    refreshAccessMode().catch(() => {});
    if (isViewer) {
      setError("(403) Estás en modo visor. No puedes eliminar.");
      return;
    }

    // confirmación fuerte
    const ok = window.confirm(
      `¿Eliminar al usuario "${u.name}"?\n\nEsta acción NO se puede deshacer.`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      await api.delete(`/usuarios/${u.id}`);
      navigate("/dashboard/usuarios", { replace: true });
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? "Error eliminando usuario";
      setError(`(${status ?? "?"}) ${msg}`);
    } finally {
      setDeleting(false);
    }
  }

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

      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate("/dashboard/usuarios")}
          className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 font-extrabold hover:bg-black/5"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        {/* ✅ Acciones principales */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenEdit}
            disabled={saving || deleting}
            className={[
              "inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 font-extrabold",
              "hover:bg-black/5 transition",
              isViewer ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            title={isViewer ? "Modo visor: no puedes editar" : "Editar"}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>

          <button
            type="button"
            onClick={onEliminar}
            disabled={saving || deleting}
            className={[
              "inline-flex items-center gap-2 rounded-xl border border-[#FE003E]/25 bg-[#FE003E]/5 px-4 py-2 font-extrabold text-[#FE003E]",
              "hover:bg-[#FE003E]/10 transition",
              isViewer ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            title={isViewer ? "Modo visor: no puedes eliminar" : "Eliminar"}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Eliminar
          </button>
        </div>
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
                  <span className={["px-2 py-0.5 rounded-full", roleBadge(currentRoleName)].join(" ")}>
                    {currentRoleName}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 p-4">
                <div className="text-xs font-black tracking-widest text-black/45">ESTADO</div>
                <div className="mt-2 text-sm font-bold text-black/75">
                  {u.email_verified_at ? "Correo verificado ✅" : "Correo NO verificado ⚠️"}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 p-4">
                <div className="text-xs font-black tracking-widest text-black/45">CREADO</div>
                <div className="mt-2 text-sm font-bold text-black/75">{fmtDate(u.created_at)}</div>
              </div>

              <div className="rounded-2xl border border-black/10 p-4">
                <div className="text-xs font-black tracking-widest text-black/45">PERMISOS</div>
                <div className="mt-2 text-sm font-bold text-black/75">
                  {isViewer ? "Modo visor (solo lectura)" : "Edición habilitada"}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ✅ MODAL EDITAR */}
      {editOpen && u && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setEditOpen(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl border border-black/10 shadow-[0_30px_80px_rgba(0,0,0,.35)] overflow-hidden">
            <div className="p-5 border-b border-black/10 flex items-center justify-between">
              <div className="font-extrabold text-black flex items-center gap-2">
                <Pencil className="h-4 w-4" /> Editar usuario
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="h-9 w-9 rounded-2xl border border-black/15 bg-white grid place-items-center hover:bg-black/5"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-black tracking-widest text-black/45 mb-1">NOMBRE</div>
                  <input
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                    placeholder="Nombre"
                    disabled={saving}
                  />
                </div>

                <div>
                  <div className="text-[11px] font-black tracking-widest text-black/45 mb-1">CORREO</div>
                  <input
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                    placeholder="Correo"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-black tracking-widest text-black/45 mb-1">ROL</div>
                  <select
                    value={fRolId}
                    onChange={(e) => setFRolId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30 bg-white"
                    disabled={saving || rolesLoading}
                  >
                    <option value="">
                      {rolesLoading ? "Cargando roles..." : "Selecciona un rol"}
                    </option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-black/45 mt-1">
                    Actual: <b>{currentRoleName}</b>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 p-3">
                  <div className="text-[11px] font-black tracking-widest text-black/45">TIP</div>
                  <div className="text-sm text-black/60 mt-1">
                    Si no cambias la contraseña, déjala vacía.
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-black tracking-widest text-black/45 mb-1 flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> NUEVA CONTRASEÑA
                  </div>
                  <input
                    type="password"
                    value={fPassword}
                    onChange={(e) => setFPassword(e.target.value)}
                    className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                    placeholder="••••••••"
                    disabled={saving}
                  />
                </div>

                <div>
                  <div className="text-[11px] font-black tracking-widest text-black/45 mb-1">CONFIRMAR</div>
                  <input
                    type="password"
                    value={fPassword2}
                    onChange={(e) => setFPassword2(e.target.value)}
                    className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                    placeholder="••••••••"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-black/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="rounded-2xl px-4 py-2 font-extrabold border border-black/15 hover:bg-black/5"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={onGuardar}
                disabled={saving}
                className="rounded-2xl px-4 py-2 font-extrabold bg-[#FE003E] text-white hover:brightness-95 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
