// src/pages/Calendario.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { api } from "../services/api";
import { getUser } from "../services/auth";

type ApiResponse<T> = { success: boolean; message: string; data: T };

type Tarea = {
  id: number;
  titulo: string;
  descripcion: string | null;

  fecha_programada: string | null; // YYYY-MM-DD
  hora_inicio_programada: string | null; // HH:mm:ss
  hora_fin_programada: string | null; // HH:mm:ss

  hora_inicio_real?: string | null; // HH:mm:ss
  hora_fin_real?: string | null; // HH:mm:ss

  inicio_real_at?: string | null; // ISO datetime
  fin_real_at?: string | null; // ISO datetime

  comentario_cierre?: string | null;
  enviada_en?: string | null;
};

// ✅ Remotas: en UI las tratamos como “tarea-like”, pero su basePath es /schedules
type Schedule = {
  id: number;
  usuario_id: number;
  type: string | null;
  title: string | null;
  starts_at: string; // "YYYY-MM-DD HH:mm:ss" o ISO
  ends_at: string;
  allow_remote: boolean | number;

  // ✅ para que sea igual que Tarea en acciones/estado (si backend ya lo envía)
  hora_inicio_real?: string | null;
  hora_fin_real?: string | null;
  inicio_real_at?: string | null;
  fin_real_at?: string | null;
  comentario_cierre?: string | null;
  enviada_en?: string | null;
};

type Archivo = {
  id: number;
  tarea_id: number;
  ruta: string;
  nombre_original: string;
  mime: string;
  url: string;
};

type UsuarioLite = { id: number; name: string; email: string };

function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toHHmmssNow() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function combineDateTime(date: string, time: string) {
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}`;
}

function normalizeDateTime(v: string) {
  const s = String(v || "").trim();
  if (!s) return s;
  if (s.includes("T")) return s;
  if (s.includes(" ")) return s.replace(" ", "T");
  return s;
}

function splitISODateTime(v: string) {
  const iso = normalizeDateTime(v);
  const [d, tRaw] = iso.split("T");
  const t = (tRaw ?? "").slice(0, 8);
  return { date: d, time: t };
}

function getErrorMessage(e: any, fallback: string) {
  const data = e?.response?.data;
  if (!data) return fallback;

  if (typeof data?.message === "string" && data.message.trim()) {
    const errs = data?.errors;
    if (errs && typeof errs === "object") {
      const flat = Object.values(errs).flat().filter(Boolean) as string[];
      if (flat.length) return `${data.message} (${flat.join(", ")})`;
    }
    return data.message;
  }

  if (typeof data === "string") return data;
  return fallback;
}

/** =========================
 *  ESTADOS (sirve para Task y Schedule si comparten campos)
 *  ========================= */
type Status = "pending" | "running" | "done";

function getStatus(t: Pick<Tarea, "enviada_en" | "comentario_cierre" | "hora_fin_real" | "fin_real_at" | "hora_inicio_real" | "inicio_real_at">): Status {
  if (t.enviada_en || t.comentario_cierre || t.hora_fin_real || t.fin_real_at) return "done";
  if ((t.hora_inicio_real || t.inicio_real_at) && !t.hora_fin_real && !t.fin_real_at) return "running";
  return "pending";
}

function statusUI(s: Status) {
  if (s === "pending") {
    return {
      label: "Por iniciar",
      color: "#FE003E",
      softBg: "bg-[#FE003E]/10",
      softBd: "border-[#FE003E]/30",
      softTx: "text-[#FE003E]",
    };
  }
  if (s === "running") {
    return {
      label: "En proceso",
      color: "#2563EB",
      softBg: "bg-blue-500/10",
      softBd: "border-blue-500/30",
      softTx: "text-blue-600",
    };
  }
  return {
    label: "Finalizada",
    color: "#16A34A",
    softBg: "bg-green-500/10",
    softBd: "border-green-500/30",
    softTx: "text-green-700",
  };
}

/** ✅ admin desde localStorage */
function isAdminLikeFromStorage(): boolean {
  const me: any = getUser();
  if (!me) return false;

  const roles = Array.isArray(me?.roles) ? me.roles.map((r: any) => String(r).toLowerCase()) : [];
  const role = String(me?.role ?? me?.role_name ?? me?.rol ?? me?.tipo ?? "").toLowerCase();

  return (
    roles.includes("admin") ||
    roles.includes("supervisor") ||
    roles.includes("superadmin") ||
    role === "admin" ||
    role === "supervisor" ||
    role === "superadmin"
  );
}

/** =========================
 *  MODAL TAREA (sirve para normal + remota)
 *  ========================= */
type ModalKind = "task" | "schedule";
type TaskModalTarget = {
  kind: ModalKind;
  // tarea “normal”
  tarea?: Tarea;
  // schedule remoto
  schedule?: Schedule;
};














function TaskModal({
  open,
  target,
  onClose,
  onUpdated,
}: {
  open: boolean;
  target: TaskModalTarget | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  // ✅ Hooks SIEMPRE arriba (sin returns antes)
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [elapsed, setElapsed] = useState<number>(0);

  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [selected, setSelected] = useState<FileList | null>(null);
  const [comentario, setComentario] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  // ✅ Datos “seguros” aunque target sea null
  const kind: ModalKind = (target?.kind ?? "task") as ModalKind;
  const isSchedule = kind === "schedule";
  const raw: any = isSchedule ? target?.schedule : target?.tarea;

  const BASE_MAP: Record<ModalKind, string> = {
    task: "/tareas",
    schedule: "/schedules",
  };

  const base = BASE_MAP[kind];
  const id = Number(raw?.id ?? 0);

  const planned = useMemo(() => {
    // ✅ si no hay raw todavía, devolvemos defaults (sin crashear)
    if (!raw) {
      return {
        title: "",
        desc: null as string | null,
        date: "",
        start: "",
        end: "",
        remoteInfo: null as null | { allow: boolean; type: string | null },
        startsAtISO: "",
      };
    }

    if (!isSchedule) {
      const t = raw as Tarea;
      return {
        title: t.titulo,
        desc: t.descripcion,
        date: t.fecha_programada ?? "",
        start: (t.hora_inicio_programada ?? "").slice(0, 5),
        end: (t.hora_fin_programada ?? "").slice(0, 5),
        remoteInfo: null as null | { allow: boolean; type: string | null },
        startsAtISO:
          t.fecha_programada && t.hora_inicio_programada
            ? combineDateTime(t.fecha_programada, t.hora_inicio_programada)
            : "",
      };
    }

    const s = raw as Schedule;
    const st = splitISODateTime(s.starts_at);
    const en = splitISODateTime(s.ends_at);
    const allow = s.allow_remote === true || s.allow_remote === 1;

    return {
      title: s.title ?? "Actividad",
      desc: null,
      date: st.date ?? "",
      start: (st.time ?? "").slice(0, 5),
      end: (en.time ?? "").slice(0, 5),
      remoteInfo: { allow, type: s.type ?? null },
      startsAtISO: normalizeDateTime(s.starts_at),
    };
  }, [raw, isSchedule]);

  const running =
    Boolean(raw?.hora_inicio_real || raw?.inicio_real_at) &&
    !Boolean(raw?.hora_fin_real || raw?.fin_real_at);

  const locked = Boolean(raw?.enviada_en || raw?.comentario_cierre);

  const status: Status = raw ? getStatus(raw) : "pending";
  const st = statusUI(status);

  const safeArchivos = Array.isArray(archivos) ? archivos : extractItems<Archivo>(archivos);

  const BACKEND_URL = String(import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

  function fileHref(url: string) {
    if (!url) return "#";

    if (url.startsWith("http")) {
      try {
        const u = new URL(url);
        if (u.pathname.startsWith("/storage/")) return `${BACKEND_URL}${u.pathname}`;
        return url;
      } catch {
        return url;
      }
    }

    return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  function isImage(mime: string) {
    return typeof mime === "string" && mime.startsWith("image/");
  }

  useEffect(() => {
    // ✅ el hook se llama siempre, pero adentro salimos si no hay data
    if (!open || !raw || !id) return;

    const controller = new AbortController();
    let alive = true;

    setErr(null);
    setElapsed(0);
    setSelected(null);
    setComentario(raw.comentario_cierre ?? "");
    setFileInputKey((k) => k + 1);

    (async () => {
      setLoadingFiles(true);
      try {
        const res = await api.get<ApiResponse<any>>(`${base}/${id}/archivos`, {
          signal: controller.signal,
        });
        if (!alive) return;
        setArchivos(extractItems<Archivo>(res.data.data));
      } catch {
        if (!alive) return;
        setArchivos([]);
      } finally {
        if (!alive) return;
        setLoadingFiles(false);
      }
    })();

    let timer: any = null;

    const startMs = raw.inicio_real_at
      ? new Date(raw.inicio_real_at).getTime()
      : planned.startsAtISO
      ? new Date(planned.startsAtISO).getTime()
      : null;

    if (running && startMs) {
      timer = setInterval(() => setElapsed(Math.max(0, Date.now() - startMs)), 1000);
    }

    return () => {
      alive = false;
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [open, raw, id, base, planned.startsAtISO, running]);

  function fmt(ms: number) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  async function refreshFiles() {
    if (!raw || !id) return;
    setLoadingFiles(true);
    try {
      const res = await api.get<ApiResponse<any>>(`${base}/${id}/archivos`);
      setArchivos(extractItems<Archivo>(res.data.data));
    } catch {
      setArchivos([]);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function iniciar() {
    if (!raw || !id) return;

    setErr(null);
    setSaving(true);
    try {
      const res = await api.put<ApiResponse<any>>(`${base}/${id}`, {
        hora_inicio_real: toHHmmssNow(),
        hora_fin_real: null,
      });

      if (!res.data?.success) {
        setErr(res.data?.message ?? "No se pudo iniciar");
        return;
      }

      onUpdated();
      onClose();
    } catch (e: any) {
      setErr(getErrorMessage(e, "Error iniciando"));
    } finally {
      setSaving(false);
    }
  }

  async function subirEvidencias() {
    if (!raw || !id) return;

    setErr(null);
    if (locked) return setErr("La tarea ya fue enviada y está bloqueada.");
    if (!selected || selected.length === 0) return setErr("Selecciona al menos un archivo.");

    const form = new FormData();
    if (selected.length === 1) form.append("archivo", selected[0]);
    else Array.from(selected).forEach((f) => form.append("files[]", f));

    setUploading(true);
    try {
      const res = await api.post<ApiResponse<any>>(`${base}/${id}/archivos`, form, {
        headers: { "Content-Type": undefined as any },
      });

      if (!res.data?.success) {
        setErr(res.data?.message ?? "No se pudo subir evidencias");
        return;
      }

      setSelected(null);
      setFileInputKey((k) => k + 1);
      await refreshFiles();
    } catch (e: any) {
      setErr(getErrorMessage(e, "Error subiendo evidencias"));
    } finally {
      setUploading(false);
    }
  }

  async function enviarTarea() {
    if (!raw || !id) return;

    setErr(null);
    if (locked) return setErr("La tarea ya fue enviada y está bloqueada.");
    if (!running && !raw.hora_inicio_real && !raw.inicio_real_at) return setErr("Primero inicia la tarea.");
    if (!comentario.trim() || comentario.trim().length < 3) return setErr("Escribe un comentario final (mín. 3 caracteres).");
    if (safeArchivos.length === 0) return setErr("Adjunta al menos una evidencia antes de enviar.");

    const ok = window.confirm("¿Seguro que deseas ENVIAR / FINALIZAR esta tarea? Luego quedará bloqueada.");
    if (!ok) return;

    setSaving(true);
    try {
      const res = await api.patch<ApiResponse<any>>(`${base}/${id}/enviar`, {
        comentario_cierre: comentario.trim(),
      });

      if (!res.data?.success) {
        setErr(res.data?.message ?? "No se pudo enviar");
        return;
      }

      onUpdated();
      onClose();
    } catch (e: any) {
      setErr(getErrorMessage(e, "Error enviando tarea"));
    } finally {
      setSaving(false);
    }
  }

  // ✅ Recién aquí se retorna null (después de llamar hooks)
  if (!open || !target || !raw) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-5 border border-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-black/60">
              {isSchedule ? "Tarea remota" : "Tarea"} #{id}
            </div>

            <div className="text-lg font-extrabold text-black">
              {planned.title}
              {planned.remoteInfo && (
                <span className="ml-2 text-xs font-extrabold text-black/50">
                  ({planned.remoteInfo.type ?? "—"} • remoto: {planned.remoteInfo.allow ? "sí" : "no"})
                </span>
              )}
            </div>

            <div className="text-sm text-black/70 mt-1">
              {planned.date} • {planned.start} - {planned.end}
            </div>

            <div className={`inline-flex mt-2 text-xs font-extrabold px-2 py-1 rounded-full border ${st.softBg} ${st.softBd} ${st.softTx}`}>
              {st.label}
              {locked ? " (Bloqueada)" : ""}
            </div>
          </div>

          <button onClick={onClose} className="text-black/50 hover:text-black">✕</button>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-black/10 p-3">
            <div className="text-xs font-extrabold text-black/60">Inicio real</div>
            <div className="font-extrabold text-black">
              {raw.hora_inicio_real ?? (raw.inicio_real_at ? new Date(raw.inicio_real_at).toLocaleTimeString() : "—")}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 p-3">
            <div className="text-xs font-extrabold text-black/60">Fin real</div>
            <div className="font-extrabold text-black">
              {raw.hora_fin_real ?? (raw.fin_real_at ? new Date(raw.fin_real_at).toLocaleTimeString() : "—")}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 p-3">
            <div className="text-xs font-extrabold text-black/60">Cronómetro</div>
            <div className="font-extrabold text-black">{running ? fmt(elapsed) : "00:00:00"}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-black/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-extrabold text-black">Evidencias</div>
            <button
              onClick={refreshFiles}
              disabled={loadingFiles}
              className="rounded-xl border border-black/15 px-3 py-2 text-sm font-extrabold hover:bg-black/5 disabled:opacity-60"
            >
              {loadingFiles ? "..." : "Refrescar"}
            </button>
          </div>

          {loadingFiles ? (
            <div className="mt-2 text-sm text-black/60">Cargando evidencias...</div>
          ) : safeArchivos.length === 0 ? (
            <div className="mt-2 text-sm text-black/60">Aún no hay evidencias.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {safeArchivos.map((a) => (
                <li key={a.id} className="rounded-xl border border-black/10 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {isImage(a.mime) && (
                      <img
                        src={fileHref(a.url)}
                        alt={a.nombre_original}
                        className="w-12 h-12 rounded-xl object-cover border border-black/10"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold text-black truncate">{a.nombre_original}</div>
                      <div className="text-xs text-black/60">{a.mime}</div>
                    </div>
                  </div>

                  <a href={fileHref(a.url)} target="_blank" rel="noreferrer" className="rounded-xl bg-black text-white px-3 py-2 text-sm font-extrabold hover:opacity-90">
                    Ver
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 grid gap-2">
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={locked}
              onChange={(e) => setSelected(e.target.files)}
              className="block w-full text-sm"
            />

            <button
              onClick={subirEvidencias}
              disabled={locked || uploading || !selected || selected.length === 0}
              className="rounded-xl border border-black/15 px-4 py-2 font-extrabold hover:bg-black/5 disabled:opacity-60"
            >
              {uploading ? "Subiendo..." : "Subir evidencias"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-extrabold text-black/60 mb-1">Comentario final (antes de enviar)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={locked}
            rows={4}
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
            placeholder="Cuéntanos cómo te fue, qué se hizo, problemas, resultados..."
          />
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-3 py-2 text-sm">
            <b className="text-[#FE003E]">Error:</b> {err}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {status === "pending" && !locked && (
            <button onClick={iniciar} disabled={saving} className="rounded-xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:opacity-95 disabled:opacity-60">
              Iniciar
            </button>
          )}

          {!locked && (
            <button onClick={enviarTarea} disabled={saving || uploading} className="rounded-xl bg-black text-white px-4 py-2 font-extrabold hover:opacity-90 disabled:opacity-60">
              {saving ? "Enviando..." : "Enviar / Finalizar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

















/** =========================
 *  PAGE
 *  ========================= */
export default function Calendario() {
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioLite[]>([]);
  const [usuarioId, setUsuarioId] = useState<number | "">("");

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const today = toISODate(new Date());
    return { from: today, to: today };
  });

  const [openTask, setOpenTask] = useState(false);
  const [target, setTarget] = useState<TaskModalTarget | null>(null);

  // ✅ debounce + abort para no saturar backend
  const debounceRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqSeq = useRef(0);

  // ✅ memo: admin solo 1 vez
  useEffect(() => {
    const admin = isAdminLikeFromStorage();
    setIsAdmin(admin);

    if (!admin) {
      setUsuarios([]);
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const u = await api.get<ApiResponse<any>>("/usuarios", {
          params: { per_page: 200, page: 1 },
          signal: controller.signal,
        });
        const payload = u.data?.data;
        setUsuarios(extractItems<UsuarioLite>(payload));
      } catch {
        setUsuarios([]);
      }
    })();

    return () => controller.abort();
  }, []);

  async function fetchTareas(nextRange: { from: string; to: string }, admin: boolean, uid: number | "") {
    const params = { fecha_from: nextRange.from, fecha_to: nextRange.to, per_page: 500, page: 1 };
    const url = admin && uid ? `/usuarios/${uid}/tareas` : "/mi/tareas";
    const res = await api.get<ApiResponse<any>>(url, { params });
    return extractItems<Tarea>(res.data.data);
  }

  async function fetchSchedules(admin: boolean, uid: number | "") {
    if (admin && uid) {
      const res = await api.get<ApiResponse<any>>("/schedules", {
        params: { per_page: 200, page: 1, usuario_id: uid },
      });
      return extractItems<Schedule>(res.data.data);
    }

    const res = await api.get<ApiResponse<any>>("/mi/schedules", { params: { per_page: 200, page: 1 } });
    return extractItems<Schedule>(res.data.data);
  }

  function scheduleLoad(nextRange: { from: string; to: string }, admin: boolean, uid: number | "") {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const mySeq = ++reqSeq.current;

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);

      try {
        const [ts, ss] = await Promise.all([
          (async () => {
            const params = { fecha_from: nextRange.from, fecha_to: nextRange.to, per_page: 500, page: 1 };
            const url = admin && uid ? `/usuarios/${uid}/tareas` : "/mi/tareas";
            const res = await api.get<ApiResponse<any>>(url, { params, signal: controller.signal });
            return extractItems<Tarea>(res.data.data);
          })(),
          (async () => {
            if (admin && uid) {
              const res = await api.get<ApiResponse<any>>("/schedules", {
                params: { per_page: 200, page: 1, usuario_id: uid },
                signal: controller.signal,
              });
              return extractItems<Schedule>(res.data.data);
            }
            const res = await api.get<ApiResponse<any>>("/mi/schedules", {
              params: { per_page: 200, page: 1 },
              signal: controller.signal,
            });
            return extractItems<Schedule>(res.data.data);
          })(),
        ]);

        if (mySeq !== reqSeq.current) return;

        setTareas(ts);
        setSchedules(ss);
      } catch (e: any) {
        if (mySeq !== reqSeq.current) return;
        setError(getErrorMessage(e, "Error cargando calendario"));
      }
    }, 250);
  }

  useEffect(() => {
    scheduleLoad(range, isAdmin, usuarioId);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, isAdmin, usuarioId]);

  const events = useMemo(() => {
    const taskEvents = tareas
      .filter((t) => t.fecha_programada && t.hora_inicio_programada && t.hora_fin_programada)
      .map((t) => {
        const ui = statusUI(getStatus(t));
        return {
          id: `task-${t.id}`,
          title: t.titulo,
          start: combineDateTime(t.fecha_programada!, t.hora_inicio_programada!),
          end: combineDateTime(t.fecha_programada!, t.hora_fin_programada!),
          extendedProps: { kind: "task", tarea: t },
          backgroundColor: ui.color,
          borderColor: ui.color,
          textColor: "#FFFFFF",
        };
      });

    // Remotas: mismo estado/colores por STATUS, no por “tipo”
    const scheduleEvents = schedules.map((s) => {
      const ui = statusUI(getStatus(s));
      const allow = s.allow_remote === true || s.allow_remote === 1;
      const title = `${allow ? "REMOTA" : "ACT"}: ${s.title ?? "Actividad"}${s.type ? ` (${s.type})` : ""}`;

      return {
        id: `sch-${s.id}`,
        title,
        start: normalizeDateTime(s.starts_at),
        end: normalizeDateTime(s.ends_at),
        extendedProps: { kind: "schedule", schedule: s },
        backgroundColor: ui.color,
        borderColor: ui.color,
        textColor: "#FFFFFF",
      };
    });

    return [...taskEvents, ...scheduleEvents];
  }, [tareas, schedules]);

  async function cargarManual() {
    const mySeq = ++reqSeq.current;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const [ts, ss] = await Promise.all([fetchTareas(range, isAdmin, usuarioId), fetchSchedules(isAdmin, usuarioId)]);

      if (mySeq !== reqSeq.current) return;
      setTareas(ts);
      setSchedules(ss);
    } catch (e: any) {
      if (mySeq !== reqSeq.current) return;
      setError(getErrorMessage(e, "Error cargando calendario"));
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm">
          <b className="text-[#FE003E]">Error:</b> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-black/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold text-black">Calendario</div>
            <div className="text-sm text-black/60">Vista semanal 24 horas</div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-2 py-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FE003E" }} />
                Por iniciar
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-2 py-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2563EB" }} />
                En proceso
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-2 py-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#16A34A" }} />
                Finalizada
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-end">
            {isAdmin && (
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value ? Number(e.target.value) : "")}
                className="rounded-xl border border-black/15 px-3 py-2 font-bold bg-white"
                disabled={usuarios.length === 0}
                title={usuarios.length === 0 ? "No se pudo cargar usuarios o aún está cargando" : "Filtrar por usuario"}
              >
                <option value="">{usuarios.length ? "(Yo) Mis eventos" : "Cargando usuarios..."}</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            )}

            <button onClick={cargarManual} className="rounded-xl border border-black/15 px-4 py-2 font-extrabold hover:bg-black/5">
              Refrescar
            </button>
          </div>
        </div>

        <div className="mt-4">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            height="auto"
            nowIndicator={true}
            allDaySlot={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            expandRows={true}
            weekends={true}
            events={events}
            datesSet={(arg) => {
              const from = toISODate(arg.start);
              const endDate = new Date(arg.end.getTime() - 24 * 60 * 60 * 1000);
              const to = toISODate(endDate);

              setRange((prev) => {
                if (prev.from === from && prev.to === to) return prev;
                return { from, to };
              });
            }}
            eventClick={(info) => {
              const kind = (info.event.extendedProps as any)?.kind as ModalKind;

              if (kind === "task") {
                setTarget({ kind: "task", tarea: (info.event.extendedProps as any).tarea as Tarea });
                setOpenTask(true);
                return;
              }

              if (kind === "schedule") {
                setTarget({ kind: "schedule", schedule: (info.event.extendedProps as any).schedule as Schedule });
                setOpenTask(true);
                return;
              }
            }}
          />
        </div>
      </div>

      <TaskModal
        open={openTask}
        target={target}
        onClose={() => {
          setOpenTask(false);
          setTarget(null);
        }}
        onUpdated={cargarManual}
      />
    </div>
  );
}
