// src/pages/Tareas.tsx
import "./Tareas.css";

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
function ensureHHmmss(v: string) {
  return v.length === 5 ? `${v}:00` : v;
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
      className="ta-modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="ta-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ta-modalHeader">
          <div style={{ minWidth: 0 }}>
            <div className="ta-modalTitle">{title}</div>
            {subtitle ? <div className="ta-modalSub">{subtitle}</div> : null}
          </div>

          <button
            className="ta-iconBtn"
            onClick={onClose}
            type="button"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="ta-modalBody">{children}</div>
      </div>
    </div>
  );
}

function EditTaskModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Tarea | null;
  onClose: () => void;
  onSave: (payload: {
    id: number;
    titulo: string;
    descripcion: string | null;
  }) => Promise<void>;
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
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label className="ta-label">Título</label>
          <input
            className="ta-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título"
          />
        </div>

        <div>
          <label className="ta-label">Descripción (opcional)</label>
          <textarea
            className="ta-textarea"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={3}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="ta-btn ta-btnOutline"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              onSave({
                id: initial.id,
                titulo: titulo.trim() || initial.titulo,
                descripcion: descripcion.trim() ? descripcion.trim() : null,
              })
            }
            className="ta-btn ta-btnPrimary"
          >
            <Save size={14} /> Guardar
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

    setSaving(true);
    try {
      const res = await api.post<ApiResponse<any>>("/solicitudes-extension", {
        tarea_id: tarea.id,
        hora_fin_solicitada: ensureHHmmss(hora),
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
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <div>
          <label className="ta-label">Nueva hora fin</label>
          <input
            type="time"
            step={60}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="ta-input"
          />
        </div>

        <div>
          <label className="ta-label">Motivo (opcional)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="ta-textarea"
            placeholder="Describe por qué necesitas extensión..."
          />
        </div>

        {err && (
          <div className="ta-alert">
            <BadgeAlert size={16} color="#FE003E" />
            <div style={{ minWidth: 0 }}>
              <b>Error:</b> {err}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="ta-btn ta-btnOutline"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="ta-btn ta-btnPrimary"
          >
            {saving ? <Loader2 size={14} className="ta-spin" /> : <Send size={14} />}
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

  const [now, setNow] = useState(() => new Date());

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [hfin, setHfin] = useState(() => {
    const d = addMinutes(new Date(), 60);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Tarea | null>(null);

  const [pendingByTask, setPendingByTask] = useState<Set<number>>(new Set());
  const [extOpen, setExtOpen] = useState(false);
  const [extTask, setExtTask] = useState<Tarea | null>(null);

  const fechaHoy = toISODateLocal(now);
  const horaAhora = toHHmmss(now);

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
        if ((x.estado ?? "").toLowerCase() === "pendiente")
          set.add(Number(x.tarea_id));
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
      await Promise.allSettled([
        cargarTareas(),
        cargarPendientesExtensionesCached(force),
      ]);
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
      return setError(
        "La hora fin debe ser mayor a la hora actual. Elige al menos unos minutos después."
      );
    }

    setSaving(true);
    try {
      const res = await api.post<ApiResponse<Tarea>>("/tareas", {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        hora_fin_programada: ensureHHmmss(hfin),
      });

      if (!res.data.success)
        return setError(res.data.message || "No se pudo crear la tarea");

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

  async function guardarEdicion(payload: {
    id: number;
    titulo: string;
    descripcion: string | null;
  }) {
    setError(null);
    try {
      const res = await api.put<ApiResponse<Tarea>>(
        `/tareas/${payload.id}`,
        payload
      );
      if (!res.data.success)
        return setError(res.data.message || "No se pudo actualizar");
      setEditOpen(false);
      setEditTask(null);
      await cargarTareas();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error actualizando tarea");
    }
  }

  async function eliminarTarea(id: number) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setError(null);
    try {
      const res = await api.delete<ApiResponse<null>>(`/tareas/${id}`);
      if (!res.data.success)
        return setError(res.data.message || "No se pudo eliminar");
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
    <div className="ta-page">
      <div className="ta-container">
        {error && (
          <div className="ta-alert" style={{ marginBottom: 10 }}>
            <AlertTriangle size={16} color="#FE003E" />
            <div style={{ minWidth: 0 }}>
              <b>Error:</b> {error}
            </div>
          </div>
        )}

        <div className="ta-grid">
          {/* Crear */}
          <section className="ta-card">
            <div className="ta-cardHeader">
              <div className="ta-leftHeader">
                <div className="ta-iconBox">
                  <Plus size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="ta-title">Crear tarea</h2>
                  <div className="ta-subtitle">
                    La fecha e inicio se registran automáticamente con la hora
                    real.
                  </div>
                </div>
              </div>

              <div className="ta-kpi">
                <div className="ta-kpiTop">
                  <Clock size={14} />
                  Hora actual
                </div>
                <div className="ta-kpiTime">{horaAhora}</div>
                <div className="ta-kpiBottom">
                  <CalendarDays size={14} />
                  {fechaHoy}
                </div>
              </div>
            </div>

            <form onSubmit={crearTarea} className="ta-form">
              <div>
                <label className="ta-label">Título</label>
                <input
                  className="ta-input"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título"
                />
              </div>

              <div>
                <label className="ta-label">Descripción (opcional)</label>
                <textarea
                  className="ta-textarea"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción (opcional)"
                  rows={3}
                />
              </div>

              <div className="ta-row3">
                <div>
                  <label className="ta-label">Fecha (auto)</label>
                  <input
                    type="date"
                    value={fechaHoy}
                    disabled
                    className="ta-input"
                  />
                </div>

                <div>
                  <label className="ta-label">Inicio (auto)</label>
                  <input
                    type="time"
                    step={1}
                    value={horaAhora}
                    disabled
                    className="ta-input"
                  />
                </div>

                <div>
                  <label className="ta-label">Fin</label>
                  <input
                    type="time"
                    step={60}
                    value={hfin}
                    onChange={(e) => setHfin(e.target.value)}
                    className="ta-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="ta-btn ta-btnPrimary ta-btnFull"
              >
                {saving ? (
                  <Loader2 size={14} className="ta-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {saving ? "Guardando…" : "Crear"}
              </button>
            </form>
          </section>

          {/* Lista */}
          <section className="ta-card">
            <div className="ta-listHeader">
              <h2 className="ta-title" style={{ margin: 0 }}>
                Mis tareas
              </h2>

              <button
                onClick={() => initLoad(true)}
                className="ta-btn ta-btnOutline"
                disabled={loading}
                type="button"
              >
                {loading ? (
                  <Loader2 size={14} className="ta-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Refrescar
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "rgba(0,0,0,0.60)",
                    fontWeight: 850,
                  }}
                >
                  <Loader2 size={16} className="ta-spin" /> Cargando…
                </div>
              ) : tareas.length === 0 ? (
                <div style={{ color: "rgba(0,0,0,0.60)", fontWeight: 850 }}>
                  No tienes tareas.
                </div>
              ) : (
                <ul className="ta-list">
                  {tareas.map((t) => {
                    const hasPending = pendingByTask.has(t.id);
                    const sched = t.fecha_programada
                      ? `${t.fecha_programada} • ${toHHmm(
                          t.hora_inicio_programada
                        )} - ${toHHmm(t.hora_fin_programada)}`
                      : "Sin programación";

                    return (
                      <li key={t.id} className="ta-item">
                        <div className="ta-itemRow">
                          <div className="ta-itemBody">
                            <div className="ta-itemTitle">
                              <span className="ta-id">#{t.id}</span> {t.titulo}
                            </div>

                            <div className="ta-itemMeta">
                              <TimerReset size={14} style={{ opacity: 0.6 }} />
                              <span>{sched}</span>
                            </div>

                            {t.descripcion ? (
                              <div className="ta-itemDesc">{t.descripcion}</div>
                            ) : null}

                            {hasPending ? (
                              <div className="ta-badge">
                                <BadgeAlert size={14} />
                                Extensión pendiente
                              </div>
                            ) : null}
                          </div>

                          {/* ✅ ACCIONES SOLO ICONOS */}
                          <div className="ta-actions">
                            <button
                              type="button"
                              className="ta-iconAction"
                              disabled={hasPending}
                              title={
                                hasPending
                                  ? "Ya hay una extensión pendiente"
                                  : "Solicitar extensión"
                              }
                              aria-label="Solicitar extensión"
                              onClick={() => {
                                setExtTask(t);
                                setExtOpen(true);
                              }}
                            >
                              <TimerReset size={16} />
                            </button>

                            <button
                              type="button"
                              className="ta-iconAction"
                              title="Editar"
                              aria-label="Editar"
                              onClick={() => {
                                setEditTask(t);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="ta-iconAction ta-iconAction--danger"
                              title="Eliminar"
                              aria-label="Eliminar"
                              onClick={() => eliminarTarea(t.id)}
                            >
                              <Trash2 size={16} />
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
          onCreated={() => cargarPendientesExtensionesCached(true)}
        />
      </div>
    </div>
  );
}
