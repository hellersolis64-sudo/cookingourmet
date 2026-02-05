import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import "./Live.css";
import {
  Activity,
  Clock,
  User2,
  RefreshCw,
  AlertTriangle,
  Timer,
  Zap,
  X,
  ListTodo,
  CheckCircle2,
  AlertOctagon,
  PlayCircle,
} from "lucide-react";

type LiveUser = { id: number; name: string; email?: string };
type LiveItem = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  usuario: LiveUser | null;

  fecha_programada?: string | null;
  hora_inicio_programada?: string | null;
  hora_fin_programada?: string | null;

  hora_inicio_real?: string | null;
  hora_fin_real?: string | null;

  progress_percent?: number | null;
  elapsed_seconds?: number | null;
  total_seconds?: number | null;
};

type DayTask = {
  id: number;
  titulo: string;
  descripcion?: string | null;

  fecha_programada?: string | null;
  hora_inicio_programada?: string | null;
  hora_fin_programada?: string | null;

  hora_inicio_real?: string | null;
  hora_fin_real?: string | null;

  created_at?: string;
};

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function toHHmm(v?: string | null) {
  if (!v) return "—";
  return String(v).slice(0, 5);
}

function secsToHms(s?: number | null) {
  const n = Number(s ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0m";
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const ss = Math.floor(n % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function isoLocalToday(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** dateISO: YYYY-MM-DD, time: HH:mm o HH:mm:ss */
function parseLocalDateTime(dateISO: string, time?: string | null) {
  if (!time) return null;
  const t = String(time).trim();
  if (!t) return null;

  const [y, m, dd] = dateISO.split("-").map(Number);
  const [hh, mm, ss] = t.split(":").map((x) => Number(x ?? 0));
  if (!y || !m || !dd || !Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  return new Date(y, m - 1, dd, hh, mm, Number.isFinite(ss) ? ss : 0, 0);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtDelay(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `+${h}h ${m}m tarde`;
  return `+${m}m tarde`;
}

async function fetchUserDayTasks(userId: number, dayISO: string): Promise<DayTask[]> {
  const res = await api.get(`/usuarios/${userId}/tareas`, {
    params: {
      per_page: 300,
      fecha_programada: dayISO,
      from: dayISO,
      to: dayISO,
    },
  });

  const data = res.data?.data ?? res.data;
  const arr = extractArray(data);
  return arr as DayTask[];
}

type TaskStatus =
  | { key: "on_time"; label: string; cls: string; icon: JSX.Element; lateSec?: number }
  | { key: "late"; label: string; cls: string; icon: JSX.Element; lateSec: number }
  | { key: "running"; label: string; cls: string; icon: JSX.Element }
  | { key: "pending"; label: string; cls: string; icon: JSX.Element };

function getTaskStatus(t: DayTask, dayISO: string, nowMs: number): TaskStatus {
  const progEnd = parseLocalDateTime(dayISO, t.hora_fin_programada);
  const realStart = parseLocalDateTime(dayISO, t.hora_inicio_real);
  const realEnd = parseLocalDateTime(dayISO, t.hora_fin_real);

  // si finalizó (tiene hora_fin_real)
  if (realEnd) {
    if (progEnd) {
      const diff = Math.floor((realEnd.getTime() - progEnd.getTime()) / 1000);
      if (diff <= 0) {
        return {
          key: "on_time",
          label: "Cumplida a tiempo",
          cls: "act-badge act-badge--ok",
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      }
      return {
        key: "late",
        label: "Trabajo no cumplido a tiempo",
        cls: "act-badge act-badge--late",
        icon: <AlertOctagon className="h-4 w-4" />,
        lateSec: diff,
      };
    }

    // no hay progEnd, pero finalizó igual
    return {
      key: "on_time",
      label: "Finalizada",
      cls: "act-badge act-badge--ok",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  // no finalizó: si ya está tarde según progEnd
  if (progEnd) {
    const diff = Math.floor((nowMs - progEnd.getTime()) / 1000);
    if (diff > 0) {
      return {
        key: "late",
        label: "Trabajo no cumplido a tiempo",
        cls: "act-badge act-badge--late",
        icon: <AlertOctagon className="h-4 w-4" />,
        lateSec: diff,
      };
    }
  }

  // si tiene inicio real, está corriendo
  if (realStart) {
    return {
      key: "running",
      label: "En curso",
      cls: "act-badge act-badge--run",
      icon: <PlayCircle className="h-4 w-4" />,
    };
  }

  // caso base
  return {
    key: "pending",
    label: "Pendiente",
    cls: "act-badge act-badge--pend",
    icon: <Activity className="h-4 w-4" />,
  };
}

function DayModal({
  open,
  onClose,
  user,
  dayISO,
  loading,
  error,
  tasks,
  nowMs,
}: {
  open: boolean;
  onClose: () => void;
  user: LiveUser | null;
  dayISO: string;
  loading: boolean;
  error: string | null;
  tasks: DayTask[];
  nowMs: number;
}) {
  if (!open) return null;

  const summary = useMemo(() => {
    let ok = 0,
      late = 0,
      run = 0,
      pend = 0;
    for (const t of tasks) {
      const s = getTaskStatus(t, dayISO, nowMs);
      if (s.key === "on_time") ok++;
      else if (s.key === "late") late++;
      else if (s.key === "running") run++;
      else pend++;
    }
    return { ok, late, run, pend, total: tasks.length };
  }, [tasks, dayISO, nowMs]);

  const name = user?.name ?? "Usuario";
  const initials = user?.name ? user.name.trim().slice(0, 1).toUpperCase() : "U";

  // orden sugerido: por inicio programado si existe, si no por id desc
  const ordered = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      const ah = a.hora_inicio_programada ?? a.hora_inicio_real ?? "";
      const bh = b.hora_inicio_programada ?? b.hora_inicio_real ?? "";
      if (ah && bh) return ah.localeCompare(bh);
      return Number(b.id) - Number(a.id);
    });
    return copy;
  }, [tasks]);

  return (
    <div className="live-modalOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="live-modalWhite" onClick={(e) => e.stopPropagation()}>
        {/* Header sticky */}
        <div className="live-modalWhiteHead">
          <div className="live-modalUser">
            <div className="live-modalAvatar">{initials}</div>
            <div className="live-modalUserInfo">
              <div className="live-modalTitle">
                <ListTodo className="h-4 w-4" />
                Actividades de <span className="live-modalName">{name}</span>
              </div>
              <div className="live-modalSub">
                Día: <b>{dayISO}</b> • estado por cumplimiento de horario
              </div>
            </div>
          </div>

          <button className="live-modalCloseWhite" onClick={onClose} type="button" title="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* KPI */}
        <div className="live-modalKpis">
          <div className="kpi kpi--total">
            <div className="kpi-lbl">Total</div>
            <div className="kpi-val">{summary.total}</div>
          </div>
          <div className="kpi kpi--ok">
            <div className="kpi-lbl">A tiempo</div>
            <div className="kpi-val">{summary.ok}</div>
          </div>
          <div className="kpi kpi--late">
            <div className="kpi-lbl">Tarde</div>
            <div className="kpi-val">{summary.late}</div>
          </div>
          <div className="kpi kpi--run">
            <div className="kpi-lbl">En curso</div>
            <div className="kpi-val">{summary.run}</div>
          </div>
        </div>

        <div className="live-modalBodyWhite">
          {error ? <div className="live-modalErrorWhite">{error}</div> : null}

          {loading ? (
            <div className="live-modalLoadingWhite">Cargando actividades…</div>
          ) : ordered.length === 0 ? (
            <div className="live-modalEmptyWhite">No hay actividades registradas hoy.</div>
          ) : (
            <div className="live-modalListWhite">
              {ordered.map((t) => {
                const st = getTaskStatus(t, dayISO, nowMs);
                const lateText = st.key === "late" ? fmtDelay(st.lateSec) : null;

                const prog = `${toHHmm(t.hora_inicio_programada)} – ${toHHmm(t.hora_fin_programada)}`;
                const real = `${toHHmm(t.hora_inicio_real)} – ${toHHmm(t.hora_fin_real)}`;

                const itemClass =
                  st.key === "late"
                    ? "act-item act-item--late"
                    : st.key === "on_time"
                    ? "act-item act-item--ok"
                    : st.key === "running"
                    ? "act-item act-item--run"
                    : "act-item act-item--pend";

                return (
                  <div key={t.id} className={itemClass}>
                    <div className="act-top">
                      <div className="act-title">{t.titulo}</div>

                      <div className="act-right">
                        <div className={st.cls}>
                          {st.icon}
                          <span>{st.label}</span>
                        </div>
                        {lateText ? <div className="act-lateNote">{lateText}</div> : null}
                      </div>
                    </div>

                    {t.descripcion ? <div className="act-desc">{t.descripcion}</div> : null}

                    <div className="act-meta">
                      <div className="act-metaBox">
                        <div className="act-mini">Programado</div>
                        <div className="act-val">{prog}</div>
                      </div>

                      <div className="act-metaBox">
                        <div className="act-mini">Real</div>
                        <div className="act-val">{real}</div>
                      </div>

                      <div className="act-metaBox">
                        <div className="act-mini">Nota</div>
                        <div className="act-val">
                          {st.key === "late" ? (
                            <span className="act-noteLate">Trabajo no cumplido a tiempo</span>
                          ) : st.key === "on_time" ? (
                            <span className="act-noteOk">Cumplida según horario</span>
                          ) : st.key === "running" ? (
                            <span className="act-noteRun">En ejecución</span>
                          ) : (
                            <span className="act-notePend">Sin iniciar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="live-modalFooterWhite">
          <div className="live-modalFootHint">
            <Timer className="h-4 w-4" />
            El estado “tarde” se marca cuando <b>hora_fin_real</b> supera <b>hora_fin_programada</b>,
            o si ya venció y aún no termina.
          </div>

          <button className="live-modalBtnClose" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Live() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [modalTasks, setModalTasks] = useState<DayTask[]>([]);
  const [modalUser, setModalUser] = useState<LiveUser | null>(null);
  const [modalDayISO, setModalDayISO] = useState<string>(() => isoLocalToday(new Date()));

  async function load(silent = false) {
    if (!silent) setFetching(true);
    setError(null);

    try {
      const r = await api.get("/live");
      const arr = extractArray(r.data?.data ?? r.data);
      setItems(arr as LiveItem[]);
      setUpdatedAt(Date.now());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error cargando LIVE");
      setItems([]);
    } finally {
      setLoading(false);
      if (!silent) setFetching(false);
    }
  }

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    load(true);

    const poll = setInterval(() => load(true), 8000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDay(u: LiveUser | null, dayISO: string) {
    if (!u?.id) return;

    setModalUser(u);
    setModalDayISO(dayISO);
    setModalOpen(true);

    setModalLoading(true);
    setModalErr(null);
    setModalTasks([]);

    try {
      const tasks = await fetchUserDayTasks(u.id, dayISO);
      setModalTasks(tasks);
    } catch (e: any) {
      setModalErr(e?.response?.data?.message ?? "No se pudo cargar actividades del día.");
      setModalTasks([]);
    } finally {
      setModalLoading(false);
    }
  }

  const derived = useMemo(() => {
    const todayISO = isoLocalToday(new Date(nowMs));
    let overdue = 0;
    let ontrack = 0;

    const cards = items.map((x) => {
      const u = x.usuario;
      const initials = u?.name ? u.name.trim().slice(0, 1).toUpperCase() : "U";
      const dateISO = x.fecha_programada ?? todayISO;

      const progStart = parseLocalDateTime(dateISO, x.hora_inicio_programada);
      const progEnd = parseLocalDateTime(dateISO, x.hora_fin_programada);

      const realStart = parseLocalDateTime(dateISO, x.hora_inicio_real) || progStart;
      const realEnd = parseLocalDateTime(dateISO, x.hora_fin_real);

      let totalSeconds =
        progStart && progEnd && progEnd.getTime() > progStart.getTime()
          ? Math.floor((progEnd.getTime() - progStart.getTime()) / 1000)
          : Number(x.total_seconds ?? 0);

      if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) totalSeconds = 0;

      let elapsedSeconds = 0;
      if (realStart) {
        const endMs = realEnd ? realEnd.getTime() : nowMs;
        elapsedSeconds = Math.floor((endMs - realStart.getTime()) / 1000);
      } else {
        elapsedSeconds = Number(x.elapsed_seconds ?? 0);
      }
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) elapsedSeconds = 0;

      const pct = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;
      const pctUi = clamp(pct, 0, 100);

      const isDone = pctUi >= 100;
      const isOver = totalSeconds > 0 && elapsedSeconds > totalSeconds && !realEnd;

      if (isOver) overdue++;
      else ontrack++;

      let eta = "—";
      if (progEnd) {
        const diff = Math.floor((progEnd.getTime() - nowMs) / 1000);
        if (diff > 0) eta = `faltan ${secsToHms(diff)}`;
        else eta = "tiempo cumplido";
      }

      const status = isDone ? "Completado" : realStart ? "En curso" : "Pendiente";

      const chipClass = isOver
        ? "live-chip live-chip--over"
        : isDone
        ? "live-chip live-chip--done"
        : "live-chip";

      const cardClass = isOver ? "live-card live-card--over" : "live-card";

      return (
        <article
          key={x.id}
          className={cardClass}
          role="button"
          tabIndex={0}
          onClick={() => openDay(u, dateISO)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openDay(u, dateISO);
          }}
          title="Ver actividades del día"
        >
          <div className="live-cardTop">
            <div className="live-avatar" aria-hidden="true">
              {initials}
            </div>

            <div className="live-main">
              <div className="live-titleRow">
                <div className="live-task">
                  <span className="live-taskTxt">{x.titulo}</span>
                </div>

                <div className={chipClass}>
                  {isDone ? <Zap className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                  <span>{status}</span>
                  <span className="live-chipSep">•</span>
                  <b>{Math.round(pctUi)}%</b>
                </div>
              </div>

              {x.descripcion ? <div className="live-desc">{x.descripcion}</div> : null}

              <div className="live-userRow">
                <User2 className="h-4 w-4" />
                <b className="live-userName">{u?.name ?? "—"}</b>
                <span className="live-hint">• clic para ver actividades del día</span>
              </div>

              <div className="live-stats">
                <div className="live-stat">
                  <div className="live-mini">Programado</div>
                  <div className="live-val">
                    {toHHmm(x.hora_inicio_programada)} – {toHHmm(x.hora_fin_programada)}
                  </div>
                </div>

                <div className="live-stat">
                  <div className="live-mini">Real</div>
                  <div className="live-val">
                    {toHHmm(x.hora_inicio_real)} – {toHHmm(x.hora_fin_real)}
                  </div>
                </div>

                <div className="live-stat">
                  <div className="live-mini">Tiempo</div>
                  <div className="live-val">
                    {secsToHms(elapsedSeconds)} / {secsToHms(totalSeconds)}
                  </div>
                </div>

                <div className="live-stat">
                  <div className="live-mini">ETA</div>
                  <div className="live-val">
                    <Timer className="h-4 w-4" />
                    {eta}
                  </div>
                </div>
              </div>

              <div className="live-bar">
                <div className="live-barBg" />
                <div
                  className={
                    isOver
                      ? "live-barFill live-barFill--over"
                      : isDone
                      ? "live-barFill live-barFill--done"
                      : "live-barFill"
                  }
                  style={{ width: `${pctUi}%` }}
                />
              </div>

              {isOver ? (
                <div className="live-over">
                  <Clock className="h-4 w-4" />
                  Atrasado: +{secsToHms(elapsedSeconds - totalSeconds)} sobre lo programado.
                </div>
              ) : null}
            </div>
          </div>
        </article>
      );
    });

    return { cards, overdue, ontrack, total: items.length };
  }, [items, nowMs]);

  return (
    <div className="live-wrap">
      <header className="live-head">
        <div className="live-headLeft">
          <div className="live-h1">Live</div>
          <div className="live-sub">Control en tiempo real • clic = actividades del día</div>
        </div>

        <div className="live-headRight">
          <div className="live-upd">
            {updatedAt ? <span>Actualizado: {new Date(updatedAt).toLocaleTimeString()}</span> : <span>—</span>}
          </div>

          <button className="live-refresh" onClick={() => load(false)} type="button" disabled={fetching}>
            <RefreshCw className={fetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refrescar
          </button>
        </div>
      </header>

      {error ? (
        <div className="live-error">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <section className="live-kpi">
        <div className="live-kpiBox">
          <div className="live-mini">En vivo</div>
          <div className="live-kpiVal">{derived.total}</div>
        </div>
        <div className="live-kpiBox live-kpiBox--ok">
          <div className="live-mini">A tiempo</div>
          <div className="live-kpiVal">{derived.ontrack}</div>
        </div>
        <div className="live-kpiBox live-kpiBox--late">
          <div className="live-mini">Atrasados</div>
          <div className="live-kpiVal">{derived.overdue}</div>
        </div>
      </section>

      {loading ? (
        <div className="live-loading">Cargando…</div>
      ) : derived.total === 0 ? (
        <div className="live-empty">No hay tareas activas ahora.</div>
      ) : (
        <div className="live-grid">{derived.cards}</div>
      )}

      <DayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={modalUser}
        dayISO={modalDayISO}
        loading={modalLoading}
        error={modalErr}
        tasks={modalTasks}
        nowMs={nowMs}
      />
    </div>
  );
}
