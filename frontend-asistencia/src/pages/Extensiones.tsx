import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  User,
  Hash,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Save,
} from "lucide-react";

type ApiResponse<T> = { success: boolean; message: string; data: T };

type Extension = {
  id: number;
  tarea_id: number;
  estado: string;
  hora_fin_original: string;
  hora_fin_solicitada: string;
  hora_fin_aprobada: string | null;
  motivo: string | null;
  motivo_resolucion?: string | null;
  aprobado_por: number | null;
  aprobado_en: string | null;
  created_at: string;
};

function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function toHHmm(v?: string | null) {
  if (!v) return "—";
  return String(v).slice(0, 5);
}

type ResolveMode = "aprobar" | "rechazar";

function BadgeEstado({ estado }: { estado: string }) {
  const est = String(estado ?? "").toLowerCase();
  const cls =
    est === "pendiente"
      ? "bg-[#FE003E]/10 text-[#FE003E] border-[#FE003E]/20"
      : est === "aprobado"
      ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/20"
      : "bg-black/5 text-black/70 border-black/10";

  const Icon =
    est === "pendiente" ? Clock : est === "aprobado" ? CheckCircle2 : XCircle;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full border",
        cls,
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {estado}
    </span>
  );
}

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-5 border border-black/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold">{title}</div>
            {subtitle ? <div className="text-xs text-black/55 mt-0.5">{subtitle}</div> : null}
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-2xl hover:bg-black/5 grid place-items-center"
            title="Cerrar"
          >
            <X className="h-4 w-4 text-black/70" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ResolveModal({
  open,
  mode,
  item,
  onClose,
  onDone,
}: {
  open: boolean;
  mode: ResolveMode;
  item: Extension | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setErr(null);
    setSaving(false);
    setMotivo("");
    setHora(mode === "aprobar" ? toHHmm(item.hora_fin_solicitada) : "");
  }, [open, item?.id, mode]);

  if (!open || !item) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const motivoTrim = motivo.trim();

    if (mode === "rechazar" && motivoTrim.length < 3) {
      return setErr("Escribe el motivo del rechazo (mín. 3 caracteres).");
    }

    setSaving(true);
    try {
      if (mode === "aprobar") {
        const horaEnviar = hora ? (hora.length === 5 ? `${hora}:00` : hora) : null;

        await api.put<ApiResponse<any>>(`/extensiones/${item.id}/aprobar`, {
          hora_fin_aprobada: horaEnviar,
          motivo_resolucion: motivoTrim ? motivoTrim : null,
        });
      } else {
        await api.put<ApiResponse<any>>(`/extensiones/${item.id}/rechazar`, {
          motivo_resolucion: motivoTrim,
        });
      }

      onDone();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error guardando decisión");
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "aprobar" ? "Aprobar extensión" : "Rechazar extensión";
  const subtitle = `Solicitud #${item.id} — Tarea #${item.tarea_id}`;

  return (
    <ModalShell open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="text-sm text-black/70">
        Original: <b>{toHHmm(item.hora_fin_original)}</b> → Solicitada:{" "}
        <b>{toHHmm(item.hora_fin_solicitada)}</b>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        {mode === "aprobar" && (
          <div>
            <label className="block text-xs font-extrabold text-black/60 mb-1">Hora fin aprobada</label>
            <input
              type="time"
              step={60}
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
            />
            <div className="text-xs text-black/50 mt-1">
              Si la dejas igual, se aprobará la hora solicitada.
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-extrabold text-black/60 mb-1">
            Motivo del admin {mode === "rechazar" ? "(obligatorio)" : "(opcional)"}
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
            placeholder={mode === "rechazar" ? "Explica por qué se rechaza..." : "Nota/opinión del admin (opcional)..."}
          />
        </div>

        {err && (
          <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-3 py-2 text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
            <div>
              <b className="text-[#FE003E]">Error:</b> {err}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-black/15 px-4 py-2 font-extrabold hover:bg-black/5"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className={[
              "rounded-2xl px-4 py-2 font-extrabold text-white flex items-center gap-2",
              mode === "aprobar" ? "bg-black hover:opacity-90" : "bg-[#FE003E] hover:brightness-95",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Guardando…" : mode === "aprobar" ? "Aprobar" : "Rechazar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function Extensiones() {
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);

  // filtros admin
  const [estado, setEstado] = useState<"" | "pendiente" | "aprobado" | "rechazado">("pendiente");
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [tareaId, setTareaId] = useState<string>("");

  // modal resolver
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveMode, setResolveMode] = useState<ResolveMode>("aprobar");
  const [resolveItem, setResolveItem] = useState<Extension | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.get("/usuarios");
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  const endpoint = useMemo(() => (isAdmin ? "/extensiones" : "/mi/extensiones"), [isAdmin]);

  async function cargar() {
    setLoading(true);
    try {
      const params: any = { per_page: 50, page: 1 };

      if (isAdmin) {
        if (estado) params.estado = estado;
        if (usuarioId.trim()) params.usuario_id = Number(usuarioId);
        if (tareaId.trim()) params.tarea_id = Number(tareaId);
      }

      const res = await api.get<ApiResponse<any>>(endpoint, { params });
      setItems(extractItems<Extension>(res.data.data));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error cargando extensiones");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

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

      <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-black/60" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-black">
                {isAdmin ? "Extensiones (Admin)" : "Mis extensiones"}
              </h2>
              <div className="text-xs text-black/60">
                {isAdmin ? "Aprueba o rechaza solicitudes pendientes" : "Tus solicitudes de extensión"}
              </div>
            </div>
          </div>

          <button
            onClick={cargar}
            className={[
              "h-10 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5",
              "flex items-center gap-2",
              loading ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
            disabled={loading}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </button>
        </div>

        {/* Filtros admin */}
        {isAdmin && (
          <div className="mt-4 rounded-3xl border border-black/10 p-4 bg-black/[0.02]">
            <div className="flex items-center gap-2 text-xs font-black text-black/60 mb-3">
              <Filter className="h-4 w-4" />
              Filtros
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                  className="w-full rounded-2xl border border-black/15 px-3 py-2 font-extrabold bg-white outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                >
                  <option value="">(Todos)</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Usuario ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
                  <input
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    placeholder="Ej: 5"
                    inputMode="numeric"
                    className="w-full pl-9 rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Tarea ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
                  <input
                    value={tareaId}
                    onChange={(e) => setTareaId(e.target.value)}
                    placeholder="Ej: 120"
                    inputMode="numeric"
                    className="w-full pl-9 rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={cargar}
                  className="w-full h-10 rounded-2xl bg-black text-white px-4 font-extrabold hover:opacity-90 flex items-center justify-center gap-2"
                  type="button"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Buscar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-black/60 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-black/60">No hay solicitudes.</p>
          ) : (
            items.map((x) => {
              const est = (x.estado ?? "").toLowerCase();
              const canResolve = isAdmin && est === "pendiente";

              return (
                <div key={x.id} className="rounded-3xl border border-black/10 p-4 hover:bg-black/[0.02] transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold text-black">
                        Solicitud <span className="text-[#FE003E]">#{x.id}</span> — Tarea #{x.tarea_id}
                      </div>

                      <div className="mt-2 text-sm text-black/70">
                        Original: <b>{toHHmm(x.hora_fin_original)}</b> → Solicitada:{" "}
                        <b>{toHHmm(x.hora_fin_solicitada)}</b>
                        {x.hora_fin_aprobada ? (
                          <>
                            {" "}
                            → Aprobada: <b>{toHHmm(x.hora_fin_aprobada)}</b>
                          </>
                        ) : null}
                      </div>

                      {x.motivo && <div className="mt-2 text-sm text-black/70">Motivo (trabajador): {x.motivo}</div>}
                      {(x as any).motivo_resolucion && (
                        <div className="mt-2 text-sm text-black/70">Motivo (admin): {(x as any).motivo_resolucion}</div>
                      )}

                      <div className="mt-2 text-xs text-black/50">Creado: {x.created_at}</div>
                    </div>

                    <div className="flex gap-2 shrink-0 flex-wrap justify-end items-start">
                      <BadgeEstado estado={x.estado} />

                      {canResolve && (
                        <>
                          <button
                            onClick={() => {
                              setResolveItem(x);
                              setResolveMode("aprobar");
                              setResolveOpen(true);
                            }}
                            className="rounded-2xl bg-black text-white px-3 py-2 font-extrabold hover:opacity-90 flex items-center gap-2"
                            type="button"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Aprobar
                          </button>

                          <button
                            onClick={() => {
                              setResolveItem(x);
                              setResolveMode("rechazar");
                              setResolveOpen(true);
                            }}
                            className="rounded-2xl border border-black/15 px-3 py-2 font-extrabold hover:bg-black/5 flex items-center gap-2"
                            type="button"
                          >
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <ResolveModal
        open={resolveOpen}
        mode={resolveMode}
        item={resolveItem}
        onClose={() => {
          setResolveOpen(false);
          setResolveItem(null);
        }}
        onDone={cargar}
      />
    </div>
  );
}
