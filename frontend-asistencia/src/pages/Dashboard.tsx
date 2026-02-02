// src/pages/DashboardPro.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  RefreshCw,
  BarChart3,
  Users,
  Clock,
  TrendingDown,
  CheckCircle2,
  LogOut,
  X,
  Shield,
  BadgeCheck,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// ✅ NUEVO: usar AuthContext (roles + access-mode real)
import { useAuth } from "../auth/AuthContext";

type ApiResponse<T> = { success: boolean; message?: string; data: T };

type AsistenciaRow = {
  id: number;
  fecha: string;
  hora_entrada_real: string | null;
  hora_salida_real: string | null;

  usuario_nombre?: string | null;
  usuario_apellido?: string | null;
  usuario_email?: string | null;
};

type AsistenciaHoy = {
  id: number;
  fecha: string;
  hora_entrada_real: string | null;
  hora_salida_real: string | null;
};

// ====================== helpers ======================
function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  x.setDate(x.getDate() + days);
  return toISODate(x);
}

function todayISO() {
  return toISODate(new Date());
}

function rangeFilterLocal(rows: AsistenciaRow[], fromISO: string, toISO: string) {
  const f = fromISO;
  const t = toISO;
  return rows.filter((r) => {
    const day = String(r.fecha ?? "").slice(0, 10);
    return day && day >= f && day <= t;
  });
}

// ✅ robusto: acepta H:mm, HH:mm, HH:mm:ss, HH:mm:ss.ffffff
function parseDateTimeSafe(fechaISO: string, time: string) {
  const day = String(fechaISO ?? "").slice(0, 10);

  const m = String(time ?? "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!day || !m) return null;

  const [y, mo, d] = day.split("-").map(Number);
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] ?? 0);

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;

  const dt = new Date(y, (mo ?? 1) - 1, d, hh, mm, ss, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// ✅ PRO: si trabajó aunque sea 19s, cuenta 1 minuto
function minutesWorked(r: AsistenciaRow): number {
  if (!r?.fecha || !r?.hora_entrada_real || !r?.hora_salida_real) return 0;

  const start = parseDateTimeSafe(r.fecha, r.hora_entrada_real);
  const end = parseDateTimeSafe(r.fecha, r.hora_salida_real);
  if (!start || !end) return 0;

  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Math.max(1, Math.floor(diffMs / 60000));
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${pad(m)}m`;
}

function fullName(r: AsistenciaRow) {
  const n = String(r.usuario_nombre ?? "").trim();
  const a = String(r.usuario_apellido ?? "").trim();
  const s = `${n} ${a}`.trim();
  return s || String(r.usuario_email ?? "—");
}

// ====================== UI bits ======================
function Card({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold text-black/60">{title}</div>
          <div className="mt-2 text-2xl font-extrabold text-black">{value}</div>
          {hint && <div className="mt-1 text-xs text-black/60">{hint}</div>}
        </div>
        <div className="h-10 w-10 rounded-2xl border border-black/10 bg-black/[0.04] grid place-items-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickRange({ onSet }: { onSet: (from: string, to: string) => void }) {
  const t = todayISO();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSet(t, t)}
        className="h-9 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5"
      >
        Hoy
      </button>
      <button
        type="button"
        onClick={() => onSet(addDaysISO(t, -6), t)}
        className="h-9 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5"
      >
        Últimos 7 días
      </button>
      <button
        type="button"
        onClick={() => onSet(addDaysISO(t, -29), t)}
        className="h-9 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5"
      >
        Últimos 30 días
      </button>
    </div>
  );
}

// ====================== Attendance Prompt ======================
type PromptMode = null | "entry" | "exit";
const ATT_KEY_PREFIX = "att_prompt_done_";

function AttendancePromptModal({
  open,
  mode,
  loading,
  title,
  subtitle,
  onAcceptEntry,
  onCancelExit,
  onConfirmExit,
}: {
  open: boolean;
  mode: PromptMode;
  loading: boolean;
  title: string;
  subtitle?: string;
  onAcceptEntry: () => void;
  onCancelExit: () => void;
  onConfirmExit: () => void;
}) {
  return (
    <AnimatePresence>
      {open && mode && (
        <motion.div
          className="fixed inset-0 z-[99999] bg-black/70 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            className="w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-black text-white flex items-center justify-between">
              <div className="font-extrabold tracking-tight">Asistencia</div>
              <button
                type="button"
                onClick={mode === "exit" ? onCancelExit : onAcceptEntry}
                className="h-9 w-9 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center disabled:opacity-60"
                title="Cerrar"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-black/[0.05] border border-black/10 grid place-items-center">
                  {mode === "entry" ? (
                    <CheckCircle2 className="h-6 w-6 text-black/70" />
                  ) : (
                    <LogOut className="h-6 w-6 text-black/70" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-black">{title}</div>
                  {subtitle && <div className="text-sm text-black/60 mt-1">{subtitle}</div>}
                </div>
              </div>

              <div className="mt-5 flex gap-2 justify-end">
                {mode === "exit" ? (
                  <>
                    <button
                      type="button"
                      onClick={onCancelExit}
                      disabled={loading}
                      className="h-10 px-4 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 disabled:opacity-60"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={onConfirmExit}
                      disabled={loading}
                      className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center gap-2"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Registrar salida
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onAcceptEntry}
                    disabled={loading}
                    className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Aceptar
                  </button>
                )}
              </div>

              <div className="mt-3 text-[11px] text-black/45">
                {mode === "exit"
                  ? "Si cancelas, no volverá a aparecer hoy (hasta que cierres sesión)."
                  : "Se registró tu ingreso automáticamente."}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ====================== PAGE ======================
export default function DashboardPro() {
  const { roles, access } = useAuth();

  // ✅ admin real por roles del context
  const isAdmin = useMemo(() => {
    const keys = roles.map((r: any) => String(r?.key ?? r?.name ?? r).toLowerCase());
    return keys.includes("admin") || keys.includes("supervisor") || keys.includes("superadmin");
  }, [roles]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // filtros
  const [from, setFrom] = useState(() => addDaysISO(todayISO(), -6));
  const [to, setTo] = useState(() => todayISO());

  // data
  const [rows, setRows] = useState<AsistenciaRow[]>([]);

  // ✅ Modal asistencia
  const [promptMode, setPromptMode] = useState<PromptMode>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptSubtitle, setPromptSubtitle] = useState("");

  // ✅ evita doble carga simultánea
  const inflight = useRef(false);

  function promptKey() {
    return `${ATT_KEY_PREFIX}${todayISO()}`;
  }
  function markPromptDoneToday() {
    localStorage.setItem(promptKey(), "1");
  }
  function wasPromptDoneToday() {
    return localStorage.getItem(promptKey()) === "1";
  }

  async function runEntradaSalidaFlowOnce() {
    if (isAdmin) return;
    if (wasPromptDoneToday()) return;

    try {
      const r = await api.get<ApiResponse<AsistenciaHoy | null>>("/mi/asistencia/hoy");
      const row = r.data?.data ?? null;

      const hasEntry = Boolean(row?.hora_entrada_real);
      const hasExit = Boolean(row?.hora_salida_real);

      if (hasEntry && hasExit) {
        markPromptDoneToday();
        return;
      }

      if (!hasEntry) {
        await api.post("/asistencias/entrada");

        setPromptTitle("Ingreso registrado ✅");
        setPromptSubtitle("Tu asistencia de entrada se marcó automáticamente.");
        setPromptMode("entry");
        setPromptOpen(true);

        markPromptDoneToday();
        return;
      }

      if (hasEntry && !hasExit) {
        setPromptTitle("¿Registrar salida?");
        setPromptSubtitle("Tienes entrada marcada, falta registrar la salida.");
        setPromptMode("exit");
        setPromptOpen(true);
      }
    } catch {
      // ignore
    }
  }

  async function cargar() {
    if (inflight.current) return;
    inflight.current = true;

    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        const res = await api.get<ApiResponse<any>>("/asistencias", {
          params: { per_page: 500, page: 1, fecha_from: from, fecha_to: to },
        });
        const items = extractItems<AsistenciaRow>(res.data?.data);
        setRows(items);
      } else {
        const res = await api.get<ApiResponse<any>>("/mi/asistencia", {
          params: { per_page: 500, page: 1 },
        });
        const mine = extractItems<AsistenciaRow>(res.data?.data);
        setRows(rangeFilterLocal(mine, from, to));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error cargando asistencias");
      setRows([]);
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }

  // ✅ carga inicial
  useEffect(() => {
    cargar();
    runEntradaSalidaFlowOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ✅ auto-reload cuando cambie rango (con debounce pequeño)
  useEffect(() => {
    const t = setTimeout(() => {
      cargar();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, isAdmin]);

  // ====== Agregaciones ======
  const computed = useMemo(() => {
    const byDay = new Map<string, number>(); // fecha -> minutos
    const byUser = new Map<string, { name: string; email: string; minutos: number }>();

    let totalMin = 0;
    let incomplete = 0; // ✅ entrada sin salida o salida sin entrada
    let complete = 0;

    for (const r of rows) {
      const hasBoth = Boolean(r.hora_entrada_real && r.hora_salida_real);
      if (!hasBoth) {
        if (r.hora_entrada_real || r.hora_salida_real) incomplete += 1;
        continue;
      }

      complete += 1;

      const mins = minutesWorked(r);
      if (mins <= 0) continue;

      totalMin += mins;

      const day = String(r.fecha ?? "").slice(0, 10);
      if (day) byDay.set(day, (byDay.get(day) ?? 0) + mins);

      const email = String(r.usuario_email ?? "me").trim() || "me";
      const prev = byUser.get(email);
      if (!prev) byUser.set(email, { name: fullName(r), email, minutos: mins });
      else prev.minutos += mins;
    }

    const daysArr = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, minutos]) => ({
        fecha,
        horas: Math.round((minutos / 60) * 100) / 100,
        minutos,
      }));

    const usersArr = Array.from(byUser.values())
      .sort((a, b) => b.minutos - a.minutos)
      .map((u) => ({
        name: u.name,
        email: u.email,
        minutos: u.minutos,
        horas: Math.round((u.minutos / 60) * 100) / 100,
      }));

    const activeUsers = usersArr.filter((u) => u.minutos > 0).length;
    const daysWithWork = daysArr.filter((d) => d.minutos > 0).length;
    const avgPerDayMin = daysWithWork ? Math.round((totalMin / daysWithWork) * 100) / 100 : 0;

    const leastWorked =
      [...usersArr].filter((u) => u.minutos > 0).sort((a, b) => a.minutos - b.minutos)[0] ?? null;

    const myLowestDay =
      [...daysArr].filter((d) => d.minutos > 0).sort((a, b) => a.minutos - b.minutos)[0] ?? null;

    return {
      totalMin,
      daysArr,
      usersArr,
      activeUsers,
      daysWithWork,
      avgPerDayMin,
      leastWorked,
      myLowestDay,
      incomplete,
      complete,
    };
  }, [rows]);

  const topUsers = useMemo(() => computed.usersArr.slice(0, 10), [computed.usersArr]);

  return (
    <div className="space-y-4">
      {/* ✅ Modal Entrada/Salida */}
      <AttendancePromptModal
        open={promptOpen}
        mode={promptMode}
        loading={promptLoading}
        title={promptTitle}
        subtitle={promptSubtitle}
        onAcceptEntry={() => {
          setPromptOpen(false);
          setPromptMode(null);
        }}
        onCancelExit={() => {
          markPromptDoneToday();
          setPromptOpen(false);
          setPromptMode(null);
        }}
        onConfirmExit={async () => {
          setPromptLoading(true);
          try {
            await api.post("/asistencias/salida");
            markPromptDoneToday();
            setPromptOpen(false);
            setPromptMode(null);
            await cargar();
          } catch (e: any) {
            setError(e?.response?.data?.message ?? "Error registrando salida");
          } finally {
            setPromptLoading(false);
          }
        }}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-black">Dashboard PRO</h1>
          <div className="text-xs text-black/60">
            {isAdmin ? "Vista admin" : "Mi vista"} • {from} → {to}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <QuickRange
            onSet={(a, b) => {
              setFrom(a);
              setTo(b);
            }}
          />

          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            className="h-9 px-3 rounded-2xl bg-black text-white font-extrabold hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </button>
        </div>
      </div>

      {/* ✅ NUEVO: estado de acceso */}
      <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="font-extrabold text-black flex items-center gap-2">
            <Shield className="h-5 w-5 text-black/60" />
            Estado de acceso
          </div>
          <div className="text-xs font-bold text-black/50">
            {access.mode === "full" ? "FULL" : access.mode === "temp_full" ? "TEMP FULL" : "VIEWER"}
          </div>
        </div>

        <div className="mt-3 text-sm text-black/70">
          {access.mode === "full" && (
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" /> Acceso completo habilitado.
            </div>
          )}
          {access.mode === "viewer" && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Modo visor: acciones de escritura bloqueadas.
            </div>
          )}
          {access.mode === "temp_full" && (
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" /> Acceso temporal habilitado{" "}
              {access.expiresAt ? (
                <span className="font-extrabold">hasta {new Date(access.expiresAt).toLocaleString()}</span>
              ) : null}
              .
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div>
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={<Clock className="h-5 w-5 text-black/60" />} title="Tiempo total" value={fmtHours(computed.totalMin)} hint="Suma del rango" />
        <Card icon={<BarChart3 className="h-5 w-5 text-black/60" />} title="Promedio por día" value={fmtHours(computed.avgPerDayMin)} hint="Solo días con trabajo" />

        <Card
          icon={<Users className="h-5 w-5 text-black/60" />}
          title={isAdmin ? "Trabajadores activos" : "Días trabajados"}
          value={isAdmin ? String(computed.activeUsers) : String(computed.daysWithWork)}
          hint={isAdmin ? "Con horas > 0" : "En el rango"}
        />

        {/* ✅ NUEVO: incompletos */}
        <Card
          icon={<AlertTriangle className="h-5 w-5 text-black/60" />}
          title="Registros incompletos"
          value={String(computed.incomplete)}
          hint={`Completos: ${computed.complete}`}
        />
      </div>

      {/* Charts */}
      <div className={isAdmin ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
        {/* Por día */}
        <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-extrabold text-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-black/60" />
              Horas trabajadas por día
            </div>
            <div className="text-xs font-bold text-black/50">Barras</div>
          </div>

          <div className="mt-4 h-[320px]">
            {loading ? (
              <div className="h-full grid place-items-center text-sm text-black/60">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : computed.daysArr.length === 0 ? (
              <div className="text-sm text-black/60">
                {rows.length === 0 ? "No llegaron registros del API." : "Sin datos completos en el rango (entrada+salida)."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computed.daysArr}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, _name: any, props: any) => {
                      const mins = props?.payload?.minutos ?? 0;
                      return [`${value} h (${fmtHours(mins)})`, "Horas"];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="horas" name="Horas" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Por trabajador (solo admin) */}
        {isAdmin && (
          <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold text-black flex items-center gap-2">
                <Users className="h-5 w-5 text-black/60" />
                Tiempo por trabajador (Top 10)
              </div>
              <div className="text-xs font-bold text-black/50">Barras</div>
            </div>

            <div className="mt-4 h-[320px]">
              {loading ? (
                <div className="h-full grid place-items-center text-sm text-black/60">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : topUsers.length === 0 ? (
                <div className="text-sm text-black/60">Sin datos completos.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topUsers} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                    <Tooltip
                      formatter={(value: any, _name: any, props: any) => {
                        const mins = props?.payload?.minutos ?? 0;
                        return [`${value} h (${fmtHours(mins)})`, "Horas"];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="horas" name="Horas" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Ranking tabla (solo admin) */}
      {isAdmin && (
        <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-extrabold text-black flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-black/60" />
              Ranking (menos → más)
            </div>
            <div className="text-xs font-bold text-black/50">Ordenado por tiempo</div>
          </div>

          <div className="mt-4 overflow-auto rounded-3xl border border-black/10">
            <table className="w-full text-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="text-left px-3 py-2">Trabajador</th>
                  <th className="text-left px-3 py-2">Correo</th>
                  <th className="text-left px-3 py-2">Tiempo</th>
                  <th className="text-left px-3 py-2">Horas</th>
                </tr>
              </thead>
              <tbody>
                {computed.usersArr
                  .filter((u) => u.minutos > 0)
                  .slice()
                  .sort((a, b) => a.minutos - b.minutos)
                  .map((u, idx) => (
                    <tr
                      key={u.email}
                      className={[
                        "border-t border-black/10",
                        idx % 2 === 1 ? "bg-black/[0.01]" : "bg-white",
                        "hover:bg-black/[0.03] transition",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 font-extrabold">{u.name}</td>
                      <td className="px-3 py-2 text-black/70">{u.email}</td>
                      <td className="px-3 py-2 font-extrabold">{fmtHours(u.minutos)}</td>
                      <td className="px-3 py-2">{u.horas}</td>
                    </tr>
                  ))}

                {!loading && computed.usersArr.filter((u) => u.minutos > 0).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-black/60">
                      Sin registros completos (entrada+salida) en el rango.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
