import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import "./UsuarioShow.css";
import {
  ArrowLeft,
  User2,
  Shield,
  Mail,
  Clock,
  CalendarDays,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ListTodo,
  CheckCircle2,
  PlayCircle,
  Timer,
  TrendingDown,
  Wallet,
} from "lucide-react";

type RolLite = { id: number; nombre: string };

type Usuario = {
  id: number;
  name: string;
  email: string;
  roles?: RolLite[];
  role?: string;
  role_name?: string;
  created_at?: string;
};

type Tarea = {
  id: number;
  titulo: string;
  descripcion: string | null;

  fecha_programada?: string | null;
  hora_inicio_programada?: string | null;
  hora_fin_programada?: string | null;

  hora_inicio_real?: string | null;
  hora_fin_real?: string | null;

  enviada_en?: string | null;
  created_at?: string;
};

type AttendanceDay = {
  dateISO: string;
  ingreso?: string | null; // HH:mm:ss
  almuerzo_inicio?: string | null;
  almuerzo_fin?: string | null;
  salida?: string | null;
  raw?: any;
};

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODateLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfWeekISO(d: Date) {
  // lunes
  const x = new Date(d);
  const day = x.getDay(); // 0 domingo
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return toISODateLocal(x);
}
function addDaysISO(iso: string, days: number) {
  const [y, m, dd] = iso.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  d.setDate(d.getDate() + days);
  return toISODateLocal(d);
}
function monthRangeISO(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return { from: toISODateLocal(from), to: toISODateLocal(to) };
}

function toHHmm(v?: string | null) {
  if (!v) return "—";
  return String(v).slice(0, 5);
}

function timeFromAny(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // ISO datetime -> tomar HH:mm:ss
  const m = s.match(/(\d{2}:\d{2}:\d{2})/);
  if (m?.[1]) return m[1];
  // HH:mm -> HH:mm:00
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  // HH:mm:ss
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

function pickFirstTime(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const t = timeFromAny(obj?.[k]);
    if (t) return t;
  }
  return null;
}

function pickDateISO(obj: any): string | null {
  const direct =
    obj?.fecha ||
    obj?.date ||
    obj?.dia ||
    obj?.fecha_programada ||
    obj?.created_date ||
    null;

  if (direct && /^\d{4}-\d{2}-\d{2}$/.test(String(direct))) return String(direct);

  const fromCreated = String(obj?.created_at ?? "");
  const m = fromCreated.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m?.[1]) return m[1];

  return null;
}

function minutesLate(entryHHmmss: string | null, expectedHHmm: string) {
  if (!entryHHmmss) return 0;
  const [eh, em] = expectedHHmm.split(":").map(Number);
  const [ah, am] = entryHHmmss.split(":").slice(0, 2).map(Number);
  if (![eh, em, ah, am].every((x) => Number.isFinite(x))) return 0;

  const exp = eh * 60 + em;
  const act = ah * 60 + am;
  return Math.max(0, act - exp);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function scoreFromAvgLate(avgLateMin: number) {
  // 0 tarde => 100, 60min tarde => 40
  const s = 100 - avgLateMin;
  return clamp(s, 0, 100);
}

function scoreClass(score: number) {
  if (score >= 90) return "us-barFill us-barFill--ok";
  if (score >= 75) return "us-barFill us-barFill--good";
  if (score >= 55) return "us-barFill us-barFill--warn";
  return "us-barFill us-barFill--bad";
}

function roleName(u: Usuario) {
  const r0 = Array.isArray(u.roles) ? u.roles[0] : null;
  const fromRel = r0 ? String((r0 as any).nombre ?? "").trim() : "";
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

function taskStatus(t: Tarea, nowISO: string) {
  const done = !!t.hora_fin_real || !!t.enviada_en;
  if (done) return { key: "done", label: "Finalizada", icon: <CheckCircle2 className="h-4 w-4" /> };

  const running = !!t.hora_inicio_real && !t.hora_fin_real;
  if (running) return { key: "run", label: "En curso", icon: <PlayCircle className="h-4 w-4" /> };

  // atrasada si ya pasó hora_fin_programada hoy
  if (t.fecha_programada === nowISO && t.hora_fin_programada) {
    const now = new Date();
    const [hh, mm] = String(t.hora_fin_programada).slice(0, 5).split(":").map(Number);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if (Date.now() > end.getTime()) return { key: "late", label: "Atrasada", icon: <TrendingDown className="h-4 w-4" /> };
  }

  return { key: "pend", label: "Pendiente", icon: <Timer className="h-4 w-4" /> };
}

export default function UsuarioShow() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();

  const [user, setUser] = useState<Usuario | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"day" | "week" | "month">("day");

  // configuración (editable)
  const [expectedEntry, setExpectedEntry] = useState("09:00"); // puedes cambiarlo
  const [expectedExit, setExpectedExit] = useState("18:00");   // (solo visual por ahora)
  const [costPerMin, setCostPerMin] = useState<number>(0);     // ✅ por defecto 0 para no asumir

  const todayISO = toISODateLocal(new Date());

  const range = useMemo(() => {
    if (tab === "day") return { from: todayISO, to: todayISO };
    if (tab === "week") {
      const from = startOfWeekISO(new Date());
      const to = addDaysISO(from, 6);
      return { from, to };
    }
    const { from, to } = monthRangeISO(new Date());
    return { from, to };
  }, [tab, todayISO]);

  async function loadAll(isRefresh = false) {
    if (!userId) return;
    setErr(null);
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      // 1) usuario
      const u = await api.get(`/usuarios/${userId}`);
      setUser((u.data?.data ?? u.data) as Usuario);

      // 2) tareas (por rango)
      const t = await api.get(`/usuarios/${userId}/tareas`, {
        params: {
          per_page: 500,
          page: 1,
          // tu TareaController soporta fecha_from/fecha_to
          fecha_from: range.from,
          fecha_to: range.to,
          // y por si acaso created_at
          from: range.from,
          to: range.to,
        },
      });
      setTareas(extractArray(t.data?.data ?? t.data) as Tarea[]);

      // 3) asistencias (admin)
      // 👉 si tu endpoint /asistencias no filtra por usuario_id aún, te digo abajo qué agregar.
      const a = await api.get(`/asistencias`, {
        params: {
          per_page: 500,
          page: 1,
          from: range.from,
          to: range.to,
          usuario_id: userId,
          user_id: userId,
        },
      });

      const rows = extractArray(a.data?.data ?? a.data);

      // normalizar por día (tomamos lo mejor disponible)
      const byDay = new Map<string, AttendanceDay>();
      for (const r of rows) {
        const dISO = pickDateISO(r);
        if (!dISO) continue;

        const ingreso = pickFirstTime(r, ["hora_entrada", "entrada", "entrada_at", "hora_inicio", "hora_inicio_real", "inicio_real_at"]);
        const almIni  = pickFirstTime(r, ["hora_almuerzo_inicio", "almuerzo_inicio", "almuerzo_inicio_at"]);
        const almFin  = pickFirstTime(r, ["hora_almuerzo_fin", "almuerzo_fin", "almuerzo_fin_at"]);
        const salida  = pickFirstTime(r, ["hora_salida", "salida", "salida_at", "hora_fin", "hora_fin_real", "fin_real_at"]);

        const cur = byDay.get(dISO) ?? { dateISO: dISO, raw: r };
        byDay.set(dISO, {
          dateISO: dISO,
          ingreso: ingreso ?? cur.ingreso ?? null,
          almuerzo_inicio: almIni ?? cur.almuerzo_inicio ?? null,
          almuerzo_fin: almFin ?? cur.almuerzo_fin ?? null,
          salida: salida ?? cur.salida ?? null,
          raw: r,
        });
      }

      const arr = Array.from(byDay.values()).sort((x, y) => x.dateISO.localeCompare(y.dateISO));
      setAttendance(arr);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.message ?? "Error cargando perfil";
      setErr(`(${status ?? "?"}) ${msg}`);
      setUser(null);
      setTareas([]);
      setAttendance([]);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab]);

  const todayAtt = useMemo(() => {
    return attendance.find((x) => x.dateISO === todayISO) ?? null;
  }, [attendance, todayISO]);

  const taskSummary = useMemo(() => {
    const s = { done: 0, run: 0, late: 0, pend: 0 };
    for (const t of tareas) {
      const st = taskStatus(t, todayISO).key;
      if (st === "done") s.done++;
      else if (st === "run") s.run++;
      else if (st === "late") s.late++;
      else s.pend++;
    }
    return s;
  }, [tareas, todayISO]);

  const punctual = useMemo(() => {
    const days = attendance.length;
    const lateMins = attendance.reduce((acc, d) => acc + minutesLate(d.ingreso ?? null, expectedEntry), 0);
    const avgLate = days > 0 ? lateMins / days : 0;
    const score = days > 0 ? scoreFromAvgLate(avgLate) : 0;
    return { days, lateMins, avgLate, score };
  }, [attendance, expectedEntry]);

  const monthStats = useMemo(() => {
    const { from, to } = monthRangeISO(new Date());
    // si estás viendo mes, usa ese; si no, calculo con lo que haya cargado solo si tab=month
    if (tab !== "month") return { lateMins: null as number | null, discount: null as number | null, from, to };

    const lateMins = attendance.reduce((acc, d) => acc + minutesLate(d.ingreso ?? null, expectedEntry), 0);
    const discount = lateMins * Number(costPerMin || 0);
    return { lateMins, discount, from, to };
  }, [tab, attendance, expectedEntry, costPerMin]);

  const lists = useMemo(() => {
    const done: Tarea[] = [];
    const run: Tarea[] = [];
    const other: Tarea[] = [];
    for (const t of tareas) {
      const k = taskStatus(t, todayISO).key;
      if (k === "done") done.push(t);
      else if (k === "run") run.push(t);
      else other.push(t);
    }
    // orden: en curso primero por hora, luego hechas
    return { run, done, other };
  }, [tareas, todayISO]);

  return (
    <div className="us-wrap">
      <div className="us-topbar">
        <button className="us-back" onClick={() => navigate(-1)} type="button">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="us-actions">
          <button className="us-refresh" onClick={() => loadAll(true)} disabled={refreshing} type="button">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </button>
        </div>
      </div>

      {err && (
        <div className="us-error">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <b>Error:</b> {err}
          </div>
        </div>
      )}

      {loading ? (
        <div className="us-loading">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando perfil…
        </div>
      ) : !user ? (
        <div className="us-empty">No se encontró el usuario.</div>
      ) : (
        <>
          {/* Header perfil */}
          <section className="us-hero">
            <div className="us-avatar">{initials(user.name)}</div>

            <div className="us-heroMain">
              <div className="us-nameRow">
                <div className="us-name">
                  <User2 className="h-4 w-4" />
                  {user.name}
                </div>

                <span className="us-role">
                  <Shield className="h-4 w-4" />
                  {roleName(user)}
                </span>
              </div>

              <div className="us-meta">
                <div className="us-metaItem">
                  <Mail className="h-4 w-4" />
                  <span className="us-muted">{user.email}</span>
                </div>
                <div className="us-metaItem">
                  <CalendarDays className="h-4 w-4" />
                  <span className="us-muted">ID: {user.id}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="us-tabs">
            <button className={tab === "day" ? "us-tab us-tab--on" : "us-tab"} onClick={() => setTab("day")} type="button">
              Día
            </button>
            <button className={tab === "week" ? "us-tab us-tab--on" : "us-tab"} onClick={() => setTab("week")} type="button">
              Semana
            </button>
            <button className={tab === "month" ? "us-tab us-tab--on" : "us-tab"} onClick={() => setTab("month")} type="button">
              Mes
            </button>

            <div className="us-range">
              <Clock className="h-4 w-4" />
              <b>{range.from}</b> — <b>{range.to}</b>
            </div>
          </div>

          {/* Configuración */}
          <section className="us-panel">
            <div className="us-panelHead">
              <div className="us-panelTitle">Configuración de cálculo</div>
              <div className="us-panelSub">Ajusta horario esperado y costo por minuto tarde</div>
            </div>

            <div className="us-formGrid">
              <label className="us-field">
                <span>Hora esperada de entrada</span>
                <input value={expectedEntry} onChange={(e) => setExpectedEntry(e.target.value)} type="time" step={60} />
              </label>

              <label className="us-field">
                <span>Hora esperada de salida</span>
                <input value={expectedExit} onChange={(e) => setExpectedExit(e.target.value)} type="time" step={60} />
              </label>

              <label className="us-field">
                <span>Costo por minuto tarde (S/.)</span>
                <input
                  value={String(costPerMin)}
                  onChange={(e) => setCostPerMin(Number(e.target.value || 0))}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                />
              </label>
            </div>
          </section>

          <div className="us-grid">
            {/* Asistencia */}
            <section className="us-card">
              <div className="us-cardHead">
                <div className="us-cardTitle">Asistencia</div>
                <div className="us-cardSub">Ingreso / Almuerzo / Salida</div>
              </div>

              <div className="us-kpis">
                <div className="us-kpi">
                  <div className="us-kpiLbl">Ingreso</div>
                  <div className="us-kpiVal">{toHHmm(tab === "day" ? todayAtt?.ingreso : attendance.at(0)?.ingreso)}</div>
                </div>

                <div className="us-kpi">
                  <div className="us-kpiLbl">Almuerzo</div>
                  <div className="us-kpiVal">
                    {toHHmm(tab === "day" ? todayAtt?.almuerzo_inicio : attendance.at(0)?.almuerzo_inicio)} –{" "}
                    {toHHmm(tab === "day" ? todayAtt?.almuerzo_fin : attendance.at(0)?.almuerzo_fin)}
                  </div>
                </div>

                <div className="us-kpi">
                  <div className="us-kpiLbl">Salida</div>
                  <div className="us-kpiVal">{toHHmm(tab === "day" ? todayAtt?.salida : attendance.at(0)?.salida)}</div>
                </div>
              </div>

              <div className="us-miniNote">
                * Si no ves horas de almuerzo/salida, es porque tu API aún no las devuelve (pero el diseño ya está listo).
              </div>
            </section>

            {/* Tareas */}
            <section className="us-card">
              <div className="us-cardHead">
                <div className="us-cardTitle">Tareas</div>
                <div className="us-cardSub">Hechas y en curso</div>
              </div>

              <div className="us-kpis us-kpis--4">
                <div className="us-kpi">
                  <div className="us-kpiLbl">En curso</div>
                  <div className="us-kpiVal">{taskSummary.run}</div>
                </div>
                <div className="us-kpi">
                  <div className="us-kpiLbl">Finalizadas</div>
                  <div className="us-kpiVal">{taskSummary.done}</div>
                </div>
                <div className="us-kpi">
                  <div className="us-kpiLbl">Atrasadas</div>
                  <div className="us-kpiVal">{taskSummary.late}</div>
                </div>
                <div className="us-kpi">
                  <div className="us-kpiLbl">Pendientes</div>
                  <div className="us-kpiVal">{taskSummary.pend}</div>
                </div>
              </div>

              <div className="us-listCols">
                <div className="us-listBlock">
                  <div className="us-listTitle">
                    <PlayCircle className="h-4 w-4" />
                    En curso
                  </div>

                  {lists.run.length === 0 ? (
                    <div className="us-emptyBox">No hay tareas en curso.</div>
                  ) : (
                    <div className="us-list">
                      {lists.run.map((t) => (
                        <div key={t.id} className="us-task">
                          <div className="us-taskTop">
                            <div className="us-taskName">{t.titulo}</div>
                            <span className="us-badge us-badge--run">En curso</span>
                          </div>
                          {t.descripcion ? <div className="us-taskDesc">{t.descripcion}</div> : null}
                          <div className="us-taskMeta">
                            Prog: {toHHmm(t.hora_inicio_programada)}–{toHHmm(t.hora_fin_programada)} • Real:{" "}
                            {toHHmm(t.hora_inicio_real)}–{toHHmm(t.hora_fin_real)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="us-listBlock">
                  <div className="us-listTitle">
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizadas
                  </div>

                  {lists.done.length === 0 ? (
                    <div className="us-emptyBox">No hay tareas finalizadas en este rango.</div>
                  ) : (
                    <div className="us-list">
                      {lists.done.map((t) => (
                        <div key={t.id} className="us-task">
                          <div className="us-taskTop">
                            <div className="us-taskName">{t.titulo}</div>
                            <span className="us-badge us-badge--ok">Finalizada</span>
                          </div>
                          {t.descripcion ? <div className="us-taskDesc">{t.descripcion}</div> : null}
                          <div className="us-taskMeta">
                            Prog: {toHHmm(t.hora_inicio_programada)}–{toHHmm(t.hora_fin_programada)} • Real:{" "}
                            {toHHmm(t.hora_inicio_real)}–{toHHmm(t.hora_fin_real)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Puntualidad (barra) */}
            <section className="us-card us-card--wide">
              <div className="us-cardHead">
                <div className="us-cardTitle">Puntualidad</div>
                <div className="us-cardSub">
                  Basado en entrada esperada <b>{expectedEntry}</b> • días con data: <b>{punctual.days}</b>
                </div>
              </div>

              {punctual.days === 0 ? (
                <div className="us-emptyBox">Sin registros de asistencia en este rango.</div>
              ) : (
                <>
                  <div className="us-barWrap">
                    <div className="us-barTop">
                      <div className="us-barLbl">Score</div>
                      <div className="us-barVal">{Math.round(punctual.score)}%</div>
                    </div>
                    <div className="us-bar">
                      <div className={scoreClass(punctual.score)} style={{ width: `${punctual.score}%` }} />
                    </div>

                    <div className="us-barFoot">
                      <div>
                        Minutos tarde total: <b>{punctual.lateMins}</b>
                      </div>
                      <div>
                        Promedio tarde/día: <b>{punctual.avgLate.toFixed(1)}</b> min
                      </div>
                    </div>
                  </div>

                  {tab === "month" ? (
                    <div className="us-deduct">
                      <div className="us-deductLeft">
                        <div className="us-deductTitle">
                          <Wallet className="h-4 w-4" />
                          Descuento del mes
                        </div>
                        <div className="us-deductSub">
                          Minutos tarde del mes: <b>{monthStats.lateMins ?? 0}</b> • Costo/min:{" "}
                          <b>S/. {Number(costPerMin || 0).toFixed(2)}</b>
                        </div>
                      </div>

                      <div className="us-deductTotal">
                        Total: <span>S/. {Number(monthStats.discount ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
