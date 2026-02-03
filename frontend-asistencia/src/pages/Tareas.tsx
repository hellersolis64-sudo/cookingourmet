// src/pages/Tareas.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  Clock,
  CalendarDays,
  Plus,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  TimerReset,
  X,
  Save,
  Send,
  BadgeAlert,
} from "lucide-react";

type ApiResponse<T> = { success: boolean; message: string; data: T };

type Tarea = {
  id: number;
  titulo: string;
  descripcion: string | null;

  fecha_programada?: string | null; // YYYY-MM-DD
  hora_inicio_programada?: string | null; // HH:mm:ss
  hora_fin_programada?: string | null; // HH:mm:ss
};

type Extension = {
  id: number;
  tarea_id: number;
  estado: string;
  hora_fin_solicitada: string;
  motivo: string | null;
};

function extractItems<T>(payload: any): T[] {
  return Array.isArray(payload) ? payload : payload?.data ?? [];
}

function toHHmm(v?: string | null) {
  if (!v) return "";
  return v.slice(0, 5);
}

// ===== Reloj (front) =====
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODateLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toHHmmss(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function addMinutes(d: Date, minutes: number) {
  const x = new Date(d.getTime());
  x.setMinutes(x.getMinutes() + minutes);
  return x;
}
function parseTodayHHmmToDate(todayISO: string, hhmm: string) {
  const [y, m, dd] = todayISO.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, dd, hh, mm, 0, 0);
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
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 grid place-items-center p-3 sm:p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-black/10"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-black leading-tight break-words">
              {title}
            </div>
            {subtitle ? (
              <div className="text-xs text-black/55 mt-0.5 break-words">
                {subtitle}
              </div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-2xl hover:bg-black/5 grid place-items-center shrink-0"
            title="Cerrar"
            type="button"
          >
            <X className="h-4 w-4 text-black/70" />
          </button>
        </div>

        {/* Body (scroll seguro en móviles) */}
        <div className="p-4 sm:p-5 max-h-[78vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// ===== Edit modal (solo título/desc) =====
function EditTaskModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Tarea | null;
  onClose: () => void;
  onSave: (payload: { id: number; titulo: string; descripcion: string | null }) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    if (!initial) return;
    setTitulo(initial.titulo);
    setDescripcion(initial.descripcion ?? "");
  }, [initial]);

  if (!open || !initial) return null;

  const sched = initial.fecha_programada
    ? `${initial.fecha_programada} • ${toHHmm(initial.hora_inicio_programada)} - ${toHHmm(
        initial.hora_fin_programada
      )}`
    : "Sin programación";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Editar tarea"
      subtitle={`Programación: ${sched}`}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-extrabold text-black/60 mb-1">
            Título
          </label>
          <input
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold text-black/60 mb-1">
            Descripción (opcional)
          </label>
          <textarea
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={3}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="rounded-2xl border border-black/15 px-4 py-2 font-extrabold hover:bg-black/5 w-full sm:w-auto"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onSave({
                id: initial.id,
                titulo: titulo.trim() || initial.titulo,
                descripcion: descripcion.trim() ? descripcion.trim() : null,
              })
            }
            className="rounded-2xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:brightness-95 flex items-center justify-center gap-2 w-full sm:w-auto"
            type="button"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ExtensionModal({
  open,
  tarea,
  onClose,
  onCreated,
}: {
  open: boolean;
  tarea: Tarea | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setHora("");
    setMotivo("");
  }, [open]);

  if (!open || !tarea) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!hora) return setErr("Selecciona la hora fin solicitada.");

    const horaEnviar = hora.length === 5 ? `${hora}:00` : hora;

    setSaving(true);
    try {
      const res = await api.post<ApiResponse<any>>("/solicitudes-extension", {
        tarea_id: tarea.id,
        hora_fin_solicitada: horaEnviar,
        motivo: motivo.trim() ? motivo.trim() : null,
      });

      if (!res.data?.success) {
        setErr(res.data?.message ?? "No se pudo crear la solicitud");
        return;
      }

      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Error creando solicitud");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Solicitar extensión"
      subtitle={`Tarea #${tarea.id} — ${tarea.titulo}`}
    >
      <form onSubmit={submit} className="grid gap-3">
        <div>
          <label className="block text-xs font-extrabold text-black/60 mb-1">
            Nueva hora fin
          </label>
          <input
            type="time"
            step={60}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold text-black/60 mb-1">
            Motivo (opcional)
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
            placeholder="Describe por qué necesitas extensión..."
          />
        </div>

        {err && (
          <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-3 py-2 text-sm flex gap-2">
            <BadgeAlert className="h-4 w-4 text-[#FE003E] mt-0.5" />
            <div className="min-w-0 break-words">
              <b className="text-[#FE003E]">Error:</b> {err}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-black/15 px-4 py-2 font-extrabold hover:bg-black/5 w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function Tareas() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // reloj
  const [now, setNow] = useState(() => new Date());

  // crear
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [hfin, setHfin] = useState(() => {
    const d = addMinutes(new Date(), 60);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);

  // editar
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Tarea | null>(null);

  // extensiones pendientes por tarea
  const [pendingByTask, setPendingByTask] = useState<Set<number>>(new Set());
  const [extOpen, setExtOpen] = useState(false);
  const [extTask, setExtTask] = useState<Tarea | null>(null);

  const fechaHoy = toISODateLocal(now);
  const horaAhora = toHHmmss(now);

  // ✅ cache pendientes
  const EXT_CACHE_KEY = "ext_pending_cache_v1";
  const EXT_CACHE_TTL_MS = 60_000;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function cargarTareas() {
    try {
      const res = await api.get<ApiResponse<any>>("/mi/tareas");
      const payload = res.data.data;
      const items = extractItems<Tarea>(payload);
      setTareas(items);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error cargando tareas");
      setTareas([]);
    }
  }

  async function cargarPendientesExtensionesCached(force = false) {
    try {
      if (!force) {
        const raw = localStorage.getItem(EXT_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed?.ts &&
            Date.now() - Number(parsed.ts) < EXT_CACHE_TTL_MS &&
            Array.isArray(parsed?.ids)
          ) {
            setPendingByTask(new Set<number>(parsed.ids.map(Number)));
            return;
          }
        }
      }

      const res = await api.get<ApiResponse<any>>("/mi/extensiones", {
        params: { page: 1, per_page: 200 },
      });
      const payload = res.data.data;
      const items = extractItems<Extension>(payload);

      const set = new Set<number>();
      for (const x of items) {
        if ((x.estado ?? "").toLowerCase() === "pendiente") set.add(Number(x.tarea_id));
      }

      setPendingByTask(set);

      localStorage.setItem(
        EXT_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), ids: Array.from(set.values()) })
      );
    } catch {
      setPendingByTask(new Set());
    }
  }

  async function initLoad(force = false) {
    setError(null);
    setLoading(true);
    try {
      await Promise.allSettled([cargarTareas(), cargarPendientesExtensionesCached(force)]);
    } finally {
      setLoading(false);
    }
  }

  async function crearTarea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!titulo.trim()) return setError("El título es obligatorio");
    if (!hfin) return setError("La hora fin es obligatoria");

    const end = parseTodayHHmmToDate(fechaHoy, hfin);
    if (end.getTime() <= now.getTime()) {
      return setError("La hora fin debe ser mayor a la hora actual. Elige al menos unos minutos después.");
    }

    setSaving(true);
    try {
      const res = await api.post<ApiResponse<Tarea>>("/tareas", {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        hora_fin_programada: hfin,
      });

      if (!res.data.success) return setError(res.data.message || "No se pudo crear la tarea");

      setTitulo("");
      setDescripcion("");
      const d = addMinutes(new Date(), 60);
      setHfin(`${pad(d.getHours())}:${pad(d.getMinutes())}`);

      await initLoad(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error creando tarea");
    } finally {
      setSaving(false);
    }
  }

  async function guardarEdicion(payload: { id: number; titulo: string; descripcion: string | null }) {
    setError(null);
    try {
      const res = await api.put<ApiResponse<Tarea>>(`/tareas/${payload.id}`, payload);
      if (!res.data.success) return setError(res.data.message || "No se pudo actualizar");
      setEditOpen(false);
      setEditTask(null);
      await cargarTareas(); // ✅ rápido
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error actualizando tarea");
    }
  }

  async function eliminarTarea(id: number) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setError(null);
    try {
      const res = await api.delete<ApiResponse<null>>(`/tareas/${id}`);
      if (!res.data.success) return setError(res.data.message || "No se pudo eliminar");
      await initLoad(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error eliminando tarea");
    }
  }

  useEffect(() => {
    initLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-4 space-y-4">
      {error && (
        <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div className="min-w-0 break-words">
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Crear */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-black/10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center shrink-0">
                  <Plus className="h-5 w-5 text-black/60" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-black break-words">
                    Crear tarea
                  </h2>
                  <div className="text-xs text-black/60 break-words">
                    La fecha e inicio se registran automáticamente con la hora real.
                  </div>
                </div>
              </div>
            </div>

            {/* reloj visible */}
            <div className="rounded-3xl border border-black/10 px-4 py-3 text-left sm:text-right bg-black/[0.02] w-full sm:w-auto">
              <div className="text-xs font-extrabold text-black/60 flex items-center justify-start sm:justify-end gap-2">
                <Clock className="h-4 w-4" />
                Hora actual
              </div>
              <div className="text-lg font-extrabold text-black">{horaAhora}</div>
              <div className="text-xs text-black/60 flex items-center justify-start sm:justify-end gap-2">
                <CalendarDays className="h-4 w-4" />
                {fechaHoy}
              </div>
            </div>
          </div>

          <form onSubmit={crearTarea} className="mt-4 grid gap-3">
            <div>
              <label className="block text-xs font-extrabold text-black/60 mb-1">Título</label>
              <input
                className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-black/60 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción (opcional)"
                rows={3}
              />
            </div>

            {/* En móvil se apilan, en sm+ se distribuyen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Fecha (auto)</label>
                <input
                  type="date"
                  value={fechaHoy}
                  disabled
                  className="w-full rounded-2xl border border-black/15 px-3 py-2 bg-black/5 text-black/70"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Inicio (auto)</label>
                <input
                  type="time"
                  step={1}
                  value={horaAhora}
                  disabled
                  className="w-full rounded-2xl border border-black/15 px-3 py-2 bg-black/5 text-black/70"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Fin</label>
                <input
                  type="time"
                  step={60}
                  value={hfin}
                  onChange={(e) => setHfin(e.target.value)}
                  className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center justify-center gap-2 w-full"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Guardando…" : "Crear"}
            </button>
          </form>
        </section>

        {/* Lista */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-black/10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-xl font-extrabold text-black">Mis tareas</h2>

            <button
              onClick={() => initLoad(true)}
              className="h-10 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 flex items-center justify-center gap-2 w-full sm:w-auto"
              disabled={loading}
              type="button"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refrescar
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-black/60 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </p>
            ) : tareas.length === 0 ? (
              <p className="text-sm text-black/60">No tienes tareas.</p>
            ) : (
              <ul className="space-y-2">
                {tareas.map((t) => {
                  const hasPending = pendingByTask.has(t.id);
                  const sched = t.fecha_programada
                    ? `${t.fecha_programada} • ${toHHmm(t.hora_inicio_programada)} - ${toHHmm(
                        t.hora_fin_programada
                      )}`
                    : "Sin programación";

                  return (
                    <li
                      key={t.id}
                      className="rounded-3xl border border-black/10 p-4 hover:bg-black/[0.02] transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-extrabold text-black break-words">
                            <span className="text-[#FE003E]">#{t.id}</span> {t.titulo}
                          </div>

                          <div className="text-xs font-bold text-black/60 mt-1 flex items-center gap-2 flex-wrap">
                            <TimerReset className="h-4 w-4 text-black/40" />
                            <span className="break-words">{sched}</span>
                          </div>

                          {t.descripcion && (
                            <div className="text-sm text-black/70 mt-2 break-words">
                              {t.descripcion}
                            </div>
                          )}

                          {hasPending && (
                            <div className="inline-flex mt-3 text-xs font-black px-2.5 py-1 rounded-full bg-[#FE003E]/10 text-[#FE003E] border border-[#FE003E]/20 items-center gap-1.5">
                              <BadgeAlert className="h-4 w-4" />
                              Extensión pendiente
                            </div>
                          )}
                        </div>

                        {/* Acciones: en móvil se apilan y ocupan ancho; en md+ se ponen a la derecha */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-wrap gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setExtTask(t);
                              setExtOpen(true);
                            }}
                            disabled={hasPending}
                            className={[
                              "rounded-2xl border border-black/15 px-3 py-2 font-extrabold",
                              "hover:bg-black/5 transition flex items-center justify-center gap-2",
                              hasPending ? "opacity-60 cursor-not-allowed" : "",
                            ].join(" ")}
                            type="button"
                            title={hasPending ? "Ya hay una extensión pendiente" : "Solicitar extensión"}
                          >
                            <TimerReset className="h-4 w-4" />
                            Extensión
                          </button>

                          <button
                            onClick={() => {
                              setEditTask(t);
                              setEditOpen(true);
                            }}
                            className="rounded-2xl border border-black/15 px-3 py-2 font-extrabold hover:bg-black/5 transition flex items-center justify-center gap-2"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>

                          <button
                            onClick={() => eliminarTarea(t.id)}
                            className="rounded-2xl bg-black text-white px-3 py-2 font-extrabold hover:opacity-90 transition flex items-center justify-center gap-2"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <EditTaskModal
        open={editOpen}
        initial={editTask}
        onClose={() => {
          setEditOpen(false);
          setEditTask(null);
        }}
        onSave={guardarEdicion}
      />

      <ExtensionModal
        open={extOpen}
        tarea={extTask}
        onClose={() => {
          setExtOpen(false);
          setExtTask(null);
        }}
        onCreated={() => {
          // ✅ fuerza recarga de pendientes (para pintar el badge sin esperar TTL)
          cargarPendientesExtensionesCached(true);
        }}
      />
    </div>
  );
}
