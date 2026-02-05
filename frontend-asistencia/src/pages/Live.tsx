import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import "./Live.css";
import {
  Activity,
  Clock,
  Mail,
  User2,
  RefreshCw,
  AlertTriangle,
  Timer,
  Zap,
} from "lucide-react";

type LiveUser = { id: number; name: string; email: string };
type LiveItem = {
  id: number;
  titulo: string;
  usuario: LiveUser | null;

  fecha_programada?: string | null;
  hora_inicio_programada?: string | null;
  hora_fin_programada?: string | null;

  hora_inicio_real?: string | null;
  hora_fin_real?: string | null;

  // si el backend los manda, ok (igual recalculamos para que avance)
  progress_percent?: number | null;
  elapsed_seconds?: number | null;
  total_seconds?: number | null;
};

function extractArray(payload: any): LiveItem[] {
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

export default function Live() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ ahora en ms para recalcular % suave cada 1s
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  async function load(silent = false) {
    if (!silent) setFetching(true);
    setError(null);

    try {
      const r = await api.get("/live");
      const arr = extractArray(r.data?.data ?? r.data);
      setItems(arr);
      setUpdatedAt(Date.now());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error cargando LIVE");
      setItems([]);
    } finally {
      setLoading(false);
      if (!silent) setFetching(false);
    }
  }

  // ✅ reloj UI (1s) para % dinámico aunque backend no cambie
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ✅ polling backend (cada 8s) + refresh al volver a la pestaña
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

  const count = items.length;

  const view = useMemo(() => {
    const todayISO = isoLocalToday(new Date(nowMs));

    return items.map((x) => {
      const u = x.usuario;
      const initials = u?.name ? u.name.trim().slice(0, 1).toUpperCase() : "U";

      const dateISO = x.fecha_programada ?? todayISO;

      const progStart = parseLocalDateTime(dateISO, x.hora_inicio_programada);
      const progEnd = parseLocalDateTime(dateISO, x.hora_fin_programada);

      const realStart =
        parseLocalDateTime(dateISO, x.hora_inicio_real) || progStart;

      const realEnd = parseLocalDateTime(dateISO, x.hora_fin_real);

      // totalSeconds: preferimos programado (tu definición del 100%)
      let totalSeconds =
        progStart && progEnd && progEnd.getTime() > progStart.getTime()
          ? Math.floor((progEnd.getTime() - progStart.getTime()) / 1000)
          : Number(x.total_seconds ?? 0);

      if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) totalSeconds = 0;

      // elapsedSeconds: si ya hay fin real, fijo. si no, corre con now.
      let elapsedSeconds = 0;
      if (realStart) {
        const endMs = realEnd ? realEnd.getTime() : nowMs;
        elapsedSeconds = Math.floor((endMs - realStart.getTime()) / 1000);
      } else {
        elapsedSeconds = Number(x.elapsed_seconds ?? 0);
      }
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) elapsedSeconds = 0;

      // ✅ % dinámico (si totalSeconds=0, queda 0)
      const pct =
        totalSeconds > 0 ? clamp((elapsedSeconds / totalSeconds) * 100, 0, 120) : 0;

      const pctUi = clamp(pct, 0, 100);
      const over = pct > 100;

      // ETA (si hay fin programada)
      let eta = "—";
      if (progEnd) {
        const diff = Math.floor((progEnd.getTime() - nowMs) / 1000);
        if (diff > 0) eta = `faltan ${secsToHms(diff)}`;
        else eta = "tiempo cumplido";
      }

      const status =
        pctUi >= 100
          ? "Completado"
          : realStart
          ? "En curso"
          : "Pendiente";

      const statusIcon =
        pctUi >= 100 ? <Zap className="h-4 w-4" /> : <Activity className="h-4 w-4" />;

      return (
        <article key={x.id} className="live-card">
          <div className="live-cardTop">
            <div className="live-avatar" aria-hidden="true">
              {initials}
            </div>

            <div className="live-main">
              <div className="live-titleRow">
                <div className="live-task">
                  <span className="live-id">#{x.id}</span>
                  <span className="live-taskTxt">{x.titulo}</span>
                </div>

                <div className={pctUi >= 100 ? "live-chip live-chip--done" : "live-chip"}>
                  {statusIcon}
                  <span>{status}</span>
                  <span className="live-chipSep">•</span>
                  <b>{Math.round(pctUi)}%</b>
                </div>
              </div>

              <div className="live-userRow">
                <span className="live-userItem">
                  <User2 className="h-4 w-4" />
                  <b className="truncate">{u?.name ?? "—"}</b>
                </span>

                <span className="live-userItem live-userEmail">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{u?.email ?? "—"}</span>
                </span>
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
                  className={pctUi >= 100 ? "live-barFill live-barFill--done" : "live-barFill"}
                  style={{ width: `${pctUi}%` }}
                />
                <div className="live-barGlow" style={{ left: `${pctUi}%` }} />
              </div>

              {over ? (
                <div className="live-over">
                  Ya pasó el tiempo programado (+{secsToHms(elapsedSeconds - totalSeconds)}).
                </div>
              ) : null}
            </div>
          </div>
        </article>
      );
    });
  }, [items, nowMs]);

  return (
    <div className="live-wrap">
      <header className="live-head">
        <div className="live-headLeft">
          <div className="live-h1">Live</div>
          <div className="live-sub">
            Trabajos en curso • actualiza suave cada 1s • sincroniza cada 8s
          </div>
        </div>

        <div className="live-headRight">
          <div className="live-upd">
            {updatedAt ? (
              <span>Actualizado: {new Date(updatedAt).toLocaleTimeString()}</span>
            ) : (
              <span>—</span>
            )}
          </div>

          <button
            className="live-refresh"
            onClick={() => load(false)}
            type="button"
            disabled={fetching}
          >
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
          <div className="live-kpiVal">{count}</div>
        </div>
      </section>

      {loading ? (
        <div className="live-loading">Cargando…</div>
      ) : count === 0 ? (
        <div className="live-empty">No hay tareas activas ahora.</div>
      ) : (
        <div className="live-grid">{view}</div>
      )}
    </div>
  );
}
