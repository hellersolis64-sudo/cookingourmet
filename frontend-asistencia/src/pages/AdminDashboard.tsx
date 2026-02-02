import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getUser, logout } from "../services/auth";

type ApiResponse<T> = { success: boolean; message?: string; data: T };

type Tarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_programada?: string | null;
  hora_inicio_programada?: string | null;
  hora_fin_programada?: string | null;
};

type UsuarioLite = { id: number; name: string; email: string };

type Paginated<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

type Schedule = {
  id: number;
  usuario_id: number;
  type: string | null;
  title: string | null;
  starts_at: string; // "YYYY-MM-DD HH:mm:ss" o ISO
  ends_at: string;
  allow_remote: boolean | number;
};

function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
}

function toHHmm(v?: string | null) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

function toHHmmssFromTimeInput(v: string) {
  // "HH:mm" -> "HH:mm:00"
  const s = String(v || "").trim();
  if (!s) return null;
  if (s.length === 5) return `${s}:00`;
  if (s.length >= 8) return s.slice(0, 8);
  return s;
}

function ymdToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toSqlDatetime(dateYmd: string, hhmm: string) {
  // "2026-01-30" + "08:00" => "2026-01-30 08:00:00"
  const t = toHHmmssFromTimeInput(hhmm);
  if (!dateYmd || !t) return null;
  return `${dateYmd} ${t}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const me = getUser();

  const [error, setError] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioLite[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // ===================== ASIGNAR TAREA =====================
  const [targetUserId, setTargetUserId] = useState<number | "">("");
  const [asigTitulo, setAsigTitulo] = useState("");
  const [asigDesc, setAsigDesc] = useState("");
  const [asigFecha, setAsigFecha] = useState("");
  const [asigHini, setAsigHini] = useState("");
  const [asigHfin, setAsigHfin] = useState("");
  const [assigning, setAssigning] = useState(false);

  // ===================== VER TAREAS POR USUARIO =====================
  const [viewUserId, setViewUserId] = useState<number | "">("");
  const [userTasks, setUserTasks] = useState<Tarea[]>([]);
  const [userTasksLoading, setUserTasksLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ===================== PROGRAMAR ACTIVIDAD (TEMP_FULL) =====================
  const [schUserId, setSchUserId] = useState<number | "">("");
  const [schType, setSchType] = useState<string>("attendance"); // attendance | task | meeting ...
  const [schTitle, setSchTitle] = useState<string>("Actividad programada");
  const [schDate, setSchDate] = useState<string>(() => ymdToday());
  const [schStart, setSchStart] = useState<string>("08:00");
  const [schEnd, setSchEnd] = useState<string>("09:00");
  const [schAllowRemote, setSchAllowRemote] = useState<boolean>(true);
  const [creatingSch, setCreatingSch] = useState(false);

  const [schListUserId, setSchListUserId] = useState<number | "">("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function cargarUsuarios() {
    setError(null);
    setLoadingUsuarios(true);
    try {
      const res = await api.get<ApiResponse<any>>("/usuarios", {
        params: { per_page: 200, page: 1 },
      });

      const pag = res.data?.data;
      const list: UsuarioLite[] = Array.isArray(pag?.data) ? pag.data : [];

      setUsuarios(list);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setError(e?.response?.data?.message ?? "Error cargando usuarios");
      setUsuarios([]);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  async function asignarTarea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!targetUserId) return setError("Selecciona un usuario.");
    if (!asigTitulo.trim()) return setError("El título es obligatorio.");
    if (!asigFecha) return setError("Selecciona fecha programada.");
    if (!asigHini) return setError("Selecciona hora inicio.");
    if (!asigHfin) return setError("Selecciona hora fin.");

    const hini = toHHmmssFromTimeInput(asigHini);
    const hfin = toHHmmssFromTimeInput(asigHfin);

    if (!hini) return setError("Hora inicio inválida.");
    if (!hfin) return setError("Hora fin inválida.");

    setAssigning(true);
    try {
      const res = await api.post<ApiResponse<Tarea>>("/tareas", {
        usuario_id: targetUserId,
        titulo: asigTitulo.trim(),
        descripcion: asigDesc.trim() ? asigDesc.trim() : null,
        fecha_programada: asigFecha,
        hora_inicio_programada: hini,
        hora_fin_programada: hfin,
      });

      if (!res.data?.success) return setError(res.data?.message || "No se pudo asignar la tarea");

      setTargetUserId("");
      setAsigTitulo("");
      setAsigDesc("");
      setAsigFecha("");
      setAsigHini("");
      setAsigHfin("");

      if (viewUserId) await cargarTareasUsuario(viewUserId, 1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error asignando tarea");
    } finally {
      setAssigning(false);
    }
  }

  async function cargarTareasUsuario(userId: number, goPage = 1) {
    setError(null);
    setUserTasksLoading(true);

    try {
      const res = await api.get<ApiResponse<any>>(`/usuarios/${userId}/tareas`, {
        params: { page: goPage, per_page: 10 },
      });

      const payload = res.data?.data ?? res.data;

      const pag: Paginated<Tarea> | null =
        payload?.data && Array.isArray(payload?.data) === false ? payload : null;

      if (pag && Array.isArray((pag as any)?.data)) {
        setUserTasks((pag as any).data ?? []);
        setPage((pag as any).current_page ?? goPage);
        setLastPage((pag as any).last_page ?? 1);
        setTotal((pag as any).total ?? ((pag as any).data?.length ?? 0));
      } else {
        const items = extractItems<Tarea>(payload);
        setUserTasks(items);
        setPage(1);
        setLastPage(1);
        setTotal(items.length);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error cargando tareas del usuario");
      setUserTasks([]);
      setPage(1);
      setLastPage(1);
      setTotal(0);
    } finally {
      setUserTasksLoading(false);
    }
  }

  // ===================== SCHEDULES =====================
  async function cargarSchedules(userId?: number) {
    setError(null);
    setSchedulesLoading(true);
    try {
      const res = await api.get<ApiResponse<any>>("/schedules", {
        params: {
          per_page: 100,
          page: 1,
          ...(userId ? { usuario_id: userId } : {}),
        },
      });

      const payload = res.data?.data ?? res.data;
      const items = Array.isArray(payload?.data) ? payload.data : extractItems<Schedule>(payload);

      setSchedules(items);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error cargando actividades");
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  }

  async function crearSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!schUserId) return setError("Selecciona un usuario para la actividad.");
    if (!schDate) return setError("Selecciona fecha.");
    if (!schStart) return setError("Selecciona hora inicio.");
    if (!schEnd) return setError("Selecciona hora fin.");

    const starts_at = toSqlDatetime(schDate, schStart);
    const ends_at = toSqlDatetime(schDate, schEnd);

    if (!starts_at) return setError("Fecha/hora inicio inválida.");
    if (!ends_at) return setError("Fecha/hora fin inválida.");

    setCreatingSch(true);
    try {
      const res = await api.post<ApiResponse<Schedule>>("/schedules", {
        usuario_id: schUserId,
        type: schType,
        title: schTitle?.trim() ? schTitle.trim() : null,
        starts_at,
        ends_at,
        allow_remote: schAllowRemote,
      });

      if (!res.data?.success) return setError(res.data?.message || "No se pudo crear la actividad");

      // refresca lista
      const uid = schListUserId ? Number(schListUserId) : undefined;
      await cargarSchedules(uid);

      // reset parcial (mantén user seleccionado por comodidad)
      setSchTitle("Actividad programada");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error creando actividad");
    } finally {
      setCreatingSch(false);
    }
  }

  async function eliminarSchedule(id: number) {
    if (!window.confirm(`¿Eliminar actividad #${id}?`)) return;
    setError(null);
    try {
      await api.delete(`/schedules/${id}`);
      const uid = schListUserId ? Number(schListUserId) : undefined;
      await cargarSchedules(uid);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error eliminando actividad");
    }
  }

  useEffect(() => {
    cargarUsuarios();
    cargarSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen text-black">
      <div className="border-b border-black/10 bg-white">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FE003E]" />
            <div>
              <div className="font-extrabold leading-tight">TimeFlow — Admin</div>
              <div className="text-xs text-black/60">{me ? `${me.name} — ${me.email}` : "Panel admin"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-black/15 px-4 py-2 font-extrabold hover:bg-black/5"
            >
              Mis tareas
            </button>
            <button
              onClick={onLogout}
              className="rounded-xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:opacity-95"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {error && (
            <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm">
              <b className="text-[#FE003E]">Error:</b> {error}
            </div>
          )}

          {/* =================== ACTIVIDADES (TEMP_FULL) =================== */}
          <section className="bg-white rounded-2xl p-5 border border-black/10 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold">Programar Actividad (permite acceso remoto temporal)</h2>
              <button
                onClick={() => cargarSchedules(schListUserId ? Number(schListUserId) : undefined)}
                disabled={schedulesLoading}
                className="rounded-xl border border-black/15 px-4 py-2 font-bold hover:bg-black/5 disabled:opacity-60"
              >
                {schedulesLoading ? "..." : "Refrescar actividades"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Crear actividad */}
              <div className="rounded-2xl border border-black/10 p-4">
                <h3 className="font-extrabold">Crear actividad</h3>

                <form onSubmit={crearSchedule} className="mt-3 grid gap-3">
                  <select
                    className="w-full rounded-xl border border-black/15 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={schUserId}
                    onChange={(e) => setSchUserId(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingUsuarios}
                  >
                    <option value="">Selecciona usuario...</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="w-full rounded-xl border border-black/15 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                      value={schType}
                      onChange={(e) => setSchType(e.target.value)}
                    >
                      <option value="attendance">Asistencia</option>
                      <option value="task">Tareas</option>
                      <option value="meeting">Reunión</option>
                      <option value="other">Otro</option>
                    </select>

                    <label className="flex items-center gap-2 text-sm font-bold text-black/70">
                      <input
                        type="checkbox"
                        checked={schAllowRemote}
                        onChange={(e) => setSchAllowRemote(e.target.checked)}
                      />
                      Permitir remoto
                    </label>
                  </div>

                  <input
                    className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={schTitle}
                    onChange={(e) => setSchTitle(e.target.value)}
                    placeholder="Título (opcional)"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-black/60 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={schDate}
                        onChange={(e) => setSchDate(e.target.value)}
                        className="w-full rounded-xl border border-black/15 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-black/60 mb-1">Inicio</label>
                      <input
                        type="time"
                        value={schStart}
                        onChange={(e) => setSchStart(e.target.value)}
                        className="w-full rounded-xl border border-black/15 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-black/60 mb-1">Fin</label>
                      <input
                        type="time"
                        value={schEnd}
                        onChange={(e) => setSchEnd(e.target.value)}
                        className="w-full rounded-xl border border-black/15 px-3 py-2"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingSch || loadingUsuarios}
                    className="rounded-xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:opacity-95 disabled:opacity-60"
                  >
                    {creatingSch ? "Guardando..." : "Crear actividad"}
                  </button>

                  <div className="text-xs text-black/60">
                    * Esta actividad hace que, fuera de la IP de oficina, el usuario tenga <b>temp_full</b> solo durante ese rango.
                  </div>
                </form>
              </div>

              {/* Listar actividades */}
              <div className="rounded-2xl border border-black/10 p-4">
                <h3 className="font-extrabold">Actividades programadas</h3>

                <div className="mt-3 flex flex-col gap-3">
                  <select
                    className="w-full rounded-xl border border-black/15 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={schListUserId}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : "";
                      setSchListUserId(v);
                      cargarSchedules(v ? Number(v) : undefined);
                    }}
                    disabled={loadingUsuarios}
                  >
                    <option value="">(Todos) Filtrar por usuario...</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  {schedulesLoading ? (
                    <p className="text-sm text-black/60">Cargando...</p>
                  ) : schedules.length === 0 ? (
                    <p className="text-sm text-black/60">No hay actividades.</p>
                  ) : (
                    <ul className="space-y-2">
                      {schedules.map((s) => {
                        const u = usuarios.find((x) => x.id === s.usuario_id);
                        const allow = s.allow_remote === true || s.allow_remote === 1;

                        return (
                          <li key={s.id} className="rounded-2xl border border-black/10 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-extrabold">
                                  <span className="text-[#FE003E]">#{s.id}</span>{" "}
                                  {s.title ?? "Actividad"}{" "}
                                  <span className="text-xs text-black/50 font-bold">
                                    ({s.type ?? "—"})
                                  </span>
                                </div>
                                <div className="text-xs text-black/60 mt-1 font-bold">
                                  Usuario: <b className="text-black">{u ? `${u.name} (${u.email})` : `#${s.usuario_id}`}</b>
                                </div>
                                <div className="text-xs text-black/60 mt-1">
                                  {String(s.starts_at)} → {String(s.ends_at)}{" "}
                                  {allow ? <b className="text-emerald-700">• Remoto</b> : <b className="text-black/50">• No remoto</b>}
                                </div>
                              </div>

                              <button
                                onClick={() => eliminarSchedule(s.id)}
                                className="rounded-xl border border-black/15 px-3 py-1.5 font-bold hover:bg-black/5"
                                type="button"
                                title="Eliminar"
                              >
                                Eliminar
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =================== TAREAS (tu bloque original) =================== */}
          <section className="bg-white rounded-2xl p-5 border border-black/10 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold">Programar Tarea</h2>
              <button
                onClick={cargarUsuarios}
                disabled={loadingUsuarios}
                className="rounded-xl border border-black/15 px-4 py-2 font-bold hover:bg-black/5 disabled:opacity-60"
              >
                {loadingUsuarios ? "..." : "Refrescar usuarios"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Asignar */}
              <div className="rounded-2xl border border-black/10 p-4">
                <h3 className="font-extrabold">Asignar tarea</h3>

                <form onSubmit={asignarTarea} className="mt-3 grid gap-3">
                  <select
                    className="w-full rounded-xl border border-black/15 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingUsuarios}
                  >
                    <option value="">Selecciona usuario...</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  <input
                    className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={asigTitulo}
                    onChange={(e) => setAsigTitulo(e.target.value)}
                    placeholder="Título"
                    disabled={loadingUsuarios}
                  />

                  <textarea
                    className="w-full rounded-xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={asigDesc}
                    onChange={(e) => setAsigDesc(e.target.value)}
                    placeholder="Descripción (opcional)"
                    rows={3}
                    disabled={loadingUsuarios}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-black/60 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={asigFecha}
                        onChange={(e) => setAsigFecha(e.target.value)}
                        className="w-full rounded-xl border border-black/15 px-3 py-2"
                        disabled={loadingUsuarios}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-black/60 mb-1">Inicio</label>
                      <input
                        type="time"
                        value={asigHini}
                        onChange={(e) => setAsigHini(e.target.value)}
                        className="w-full rounded-xl border border-black/15 px-3 py-2"
                        disabled={loadingUsuarios}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-black/60 mb-1">Fin</label>
                      <input
                        type="time"
                        value={asigHfin}
                        onChange={(e) => setAsigHfin(e.target.value)}
                        className="w-full rounded-xl border border-black/15 px-3 py-2"
                        disabled={loadingUsuarios}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={assigning || loadingUsuarios}
                    className="rounded-xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:opacity-95 disabled:opacity-60"
                  >
                    {assigning ? "Asignando..." : "Asignar"}
                  </button>
                </form>
              </div>

              {/* Ver tareas por usuario */}
              <div className="rounded-2xl border border-black/10 p-4">
                <h3 className="font-extrabold">Ver tareas por usuario</h3>

                <div className="mt-3 flex flex-col gap-3">
                  <select
                    className="w-full rounded-xl border border-black/15 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-[#FE003E]/30 focus:border-[#FE003E]"
                    value={viewUserId}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : "";
                      setViewUserId(v);
                      setUserTasks([]);
                      setPage(1);
                      setLastPage(1);
                      setTotal(0);
                      if (v) cargarTareasUsuario(v, 1);
                    }}
                    disabled={loadingUsuarios}
                  >
                    <option value="">Selecciona usuario...</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  {!viewUserId ? (
                    <p className="text-sm text-black/60">Selecciona un usuario para ver sus tareas.</p>
                  ) : userTasksLoading ? (
                    <p className="text-sm text-black/60">Cargando...</p>
                  ) : userTasks.length === 0 ? (
                    <p className="text-sm text-black/60">Este usuario no tiene tareas.</p>
                  ) : (
                    <>
                      <div className="text-sm text-black/60">
                        Total: <b className="text-black">{total}</b> — Página{" "}
                        <b className="text-black">{page}</b> / <b className="text-black">{lastPage}</b>
                      </div>

                      <ul className="space-y-2">
                        {userTasks.map((t) => (
                          <li key={t.id} className="rounded-2xl border border-black/10 p-3">
                            <div className="font-extrabold">
                              <span className="text-[#FE003E]">#{t.id}</span> {t.titulo}
                            </div>

                            <div className="text-xs text-black/60 mt-1 font-bold">
                              {t.fecha_programada
                                ? `${t.fecha_programada} • ${toHHmm(t.hora_inicio_programada)} - ${toHHmm(
                                    t.hora_fin_programada
                                  )}`
                                : "Sin programación"}
                            </div>

                            {t.descripcion && <div className="text-sm text-black/70 mt-1">{t.descripcion}</div>}
                          </li>
                        ))}
                      </ul>

                      <div className="flex gap-2 justify-end">
                        <button
                          className="rounded-xl border border-black/15 px-4 py-2 font-bold hover:bg-black/5 disabled:opacity-60"
                          disabled={page <= 1}
                          onClick={() => viewUserId && cargarTareasUsuario(viewUserId, page - 1)}
                          type="button"
                        >
                          Prev
                        </button>
                        <button
                          className="rounded-xl border border-black/15 px-4 py-2 font-bold hover:bg-black/5 disabled:opacity-60"
                          disabled={page >= lastPage}
                          onClick={() => viewUserId && cargarTareasUsuario(viewUserId, page + 1)}
                          type="button"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
