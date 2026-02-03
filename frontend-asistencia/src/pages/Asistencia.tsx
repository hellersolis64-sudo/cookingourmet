// src/pages/Asistencia.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Search,
  CalendarDays,
  Clock,
  LogIn,
  LogOut,
  User,
  Mail,
  CheckCircle2,
  XCircle,
  X,
  Camera,
  Upload,
  Trash2,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthContext";

type ApiResponse<T> = { success: boolean; message: string; data: T };

type AsistenciaRow = {
  id: number;
  fecha: string;
  hora_entrada_real: string | null;
  hora_salida_real: string | null;

  usuario_nombre?: string | null;
  usuario_email?: string | null;
  usuario_apellido?: string | null;
};

// Nuevo payload para /mi/asistencia/hoy
type MiHoyPayload = {
  hoy: AsistenciaRow | null;
  context?: {
    mode?: string | null;
    requires_photo?: boolean;
  };
};

// ================= helpers =================
function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isAdminFromStorage(): boolean {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return false;
    const u = JSON.parse(raw);
    const roles = Array.isArray(u?.roles) ? u.roles : [];
    return roles.some((r: any) => {
      const name = typeof r === "string" ? r : String(r?.name ?? "");
      return ["admin", "supervisor"].includes(name.trim().toLowerCase());
    });
  } catch {
    return false;
  }
}

function BadgeOk({ ok, textOk, textNo }: { ok: boolean; textOk: string; textNo: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-full border",
        ok ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/20" : "bg-black/5 text-black/70 border-black/10",
      ].join(" ")}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {ok ? textOk : textNo}
    </span>
  );
}

// ================= Modal Entrada/Salida =================
type PromptMode = null | "entry" | "exit";

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
                    Continuar
                  </button>
                )}
              </div>

              <div className="mt-3 text-[11px] text-black/45">
                {mode === "exit"
                  ? "Si cancelas, no volverá a aparecer hoy (hasta que cierres sesión o mañana)."
                  : "Se abrirá la cámara/subida para enviar foto antes de registrar."}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ================= Modal FOTO =================
type PhotoMode = "entry" | "exit";

function AttendancePhotoModal({
  open,
  mode,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: PhotoMode;
  loading: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setCameraOn(false);
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s);
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch {
      setCameraOn(false);
    }
  }

  function stopCamera() {
    stream?.getTracks()?.forEach((t) => t.stop());
    setStream(null);
    setCameraOn(false);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `asistencia_${mode}_${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(f);
    }, "image/jpeg", 0.9);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[99999] bg-black/70 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            className="w-full max-w-2xl rounded-3xl bg-white border border-black/10 shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-black text-white flex items-center justify-between">
              <div className="font-extrabold tracking-tight">
                {mode === "entry" ? "Foto requerida — Entrada" : "Foto requerida — Salida"}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center disabled:opacity-60"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={cameraOn || loading}
                  className="h-10 px-4 rounded-2xl bg-black text-white font-extrabold hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" /> Usar cámara
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  disabled={!cameraOn || loading}
                  className="h-10 px-4 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 disabled:opacity-60"
                >
                  Apagar cámara
                </button>

                <label className="h-10 px-4 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 cursor-pointer flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Subir foto
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) setFile(f);
                    }}
                  />
                </label>

                {cameraOn && (
                  <button
                    type="button"
                    onClick={capture}
                    disabled={loading}
                    className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center gap-2"
                  >
                    Capturar
                  </button>
                )}
              </div>

              {cameraOn ? (
                <div className="rounded-3xl overflow-hidden border border-black/10 bg-black">
                  <video ref={videoRef} className="w-full h-auto" />
                </div>
              ) : null}

              <canvas ref={canvasRef} style={{ display: "none" }} />

              {file ? (
                <div className="rounded-3xl border border-black/10 p-3">
                  <div className="text-xs font-extrabold text-black/60 mb-2">Preview</div>
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-full max-h-[320px] object-cover rounded-2xl"
                  />
                  <div className="mt-2 text-[11px] text-black/60 truncate">{file.name}</div>
                </div>
              ) : (
                <div className="text-sm text-black/60">
                  Debes <b>capturar</b> o <b>subir</b> una foto antes de registrar.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="h-10 px-4 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => file && onConfirm(file)}
                  disabled={!file || loading}
                  className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar y registrar
                </button>
              </div>

              <div className="text-[11px] text-black/45">
                * Foto real del lugar por seguridad (solo cuando estás fuera).
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ================= Modal Confirm Delete =================
function ConfirmDeleteModal({
  open,
  loading,
  title,
  subtitle,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[99999] bg-black/70 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={loading ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            className="w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-black text-white flex items-center justify-between">
              <div className="font-extrabold tracking-tight">Confirmar</div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center disabled:opacity-60"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="text-lg font-extrabold text-black">{title}</div>
              {subtitle ? <div className="mt-1 text-sm text-black/60">{subtitle}</div> : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="h-10 px-4 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Eliminar
                </button>
              </div>

              <div className="mt-3 text-[11px] text-black/45">
                Esta acción no se puede deshacer.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ================= PAGE =================
export default function Asistencia() {
  const { canAttendance, access } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [hoy, setHoy] = useState<AsistenciaRow | null>(null);
  const [hist, setHist] = useState<AsistenciaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [now, setNow] = useState(() => new Date());
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ si requiere foto (según backend)
  const [requiresPhoto, setRequiresPhoto] = useState<boolean>(true);

  // filtros admin
  const [usuarioQ, setUsuarioQ] = useState<string>("");
  const [from, setFrom] = useState<string>(() => toISODate(new Date()));
  const [to, setTo] = useState<string>(() => toISODate(new Date()));

  // loading de acciones (no admin)
  const [markingIn, setMarkingIn] = useState(false);
  const [markingOut, setMarkingOut] = useState(false);

  // ✅ Modal flujo entrada/salida
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<PromptMode>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptSubtitle, setPromptSubtitle] = useState("");

  const ranFlowRef = useRef(false);

  // ✅ “no molestar más hoy” (por día)
  const dayKey = useMemo(() => toISODate(new Date()), []);
  const ENTRY_SHOWN_KEY = `att_entry_shown_${dayKey}`;
  const EXIT_SNOOZE_KEY = `att_exit_snooze_${dayKey}`;

  // ✅ Foto modal
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("entry");

  // ✅ delete admin
  const [delOpen, setDelOpen] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delRow, setDelRow] = useState<AsistenciaRow | null>(null);

  useEffect(() => {
    const admin = isAdminFromStorage();
    setIsAdmin(admin);
  }, []);

  const titulo = useMemo(() => (isAdmin ? "Asistencias (Admin)" : "Asistencia (hoy)"), [isAdmin]);

  async function cargar() {
    setLoading(true);
    try {
      if (!isAdmin) {
        const r1 = await api.get<ApiResponse<MiHoyPayload>>("/mi/asistencia/hoy");
        const payload = r1.data.data;

        setHoy(payload?.hoy ?? null);
        // por defecto: si no viene, asumimos true para seguridad
        setRequiresPhoto(Boolean(payload?.context?.requires_photo ?? true));

        const r2 = await api.get<ApiResponse<any>>("/mi/asistencia", { params: { per_page: 20, page: 1 } });
        setHist(extractItems<AsistenciaRow>(r2.data.data));
      } else {
        const params: any = { per_page: 50, page: 1, fecha_from: from, fecha_to: to };
        if (usuarioQ.trim()) params.usuario = usuarioQ.trim();

        const r = await api.get<ApiResponse<any>>("/asistencias", { params });
        setHist(extractItems<AsistenciaRow>(r.data.data));
        setHoy(null);
      }
      setError(null);
    } catch (e: any) {
      console.log("ASISTENCIA ERROR", e?.response?.status, e?.response?.data);
      setError(e?.response?.data?.message ?? "Error cargando asistencia");
      setHoy(null);
      setHist([]);
    } finally {
      setLoading(false);
    }
  }

  async function postWithPhoto(url: string, file: File) {
    const fd = new FormData();
    fd.append("photo", file);
    await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
  }

  async function markEntryNoPhoto() {
    setError(null);
    setMarkingIn(true);
    try {
      await api.post("/asistencias/entrada");
      localStorage.setItem(ENTRY_SHOWN_KEY, "1");
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error marcando entrada");
    } finally {
      setMarkingIn(false);
    }
  }

  async function markExitNoPhoto() {
    setError(null);
    setMarkingOut(true);
    try {
      await api.post("/asistencias/salida");
      sessionStorage.setItem(EXIT_SNOOZE_KEY, "1");
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error marcando salida");
    } finally {
      setMarkingOut(false);
    }
  }

  function requestEntry() {
    if (!canAttendance) {
      setError("Modo visor: no puedes marcar asistencia fuera de la institución sin actividad programada.");
      return;
    }

    // ✅ dentro (no requiere foto) => marcar directo
    if (!requiresPhoto) {
      markEntryNoPhoto();
      return;
    }

    // ✅ fuera => foto
    setPhotoMode("entry");
    setPhotoOpen(true);
  }

  function requestExit() {
    if (!canAttendance) {
      setError("Modo visor: no puedes marcar asistencia fuera de la institución sin actividad programada.");
      return;
    }

    // ✅ dentro (no requiere foto) => marcar directo
    if (!requiresPhoto) {
      markExitNoPhoto();
      return;
    }

    // ✅ fuera => foto
    setPhotoMode("exit");
    setPhotoOpen(true);
  }

  async function onConfirmPhoto(file: File) {
    setError(null);

    if (photoMode === "entry") {
      setMarkingIn(true);
      try {
        await postWithPhoto("/asistencias/entrada", file);
        localStorage.setItem(ENTRY_SHOWN_KEY, "1");
        await cargar();
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Error marcando entrada");
      } finally {
        setMarkingIn(false);
        setPhotoOpen(false);
      }
      return;
    }

    setMarkingOut(true);
    try {
      await postWithPhoto("/asistencias/salida", file);
      sessionStorage.setItem(EXIT_SNOOZE_KEY, "1");
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error marcando salida");
    } finally {
      setMarkingOut(false);
      setPhotoOpen(false);
    }
  }

  // ✅ auto flujo: solo si requiere foto (afuera)
  async function runAutoFlow() {
    if (isAdmin) return;
    if (!canAttendance) return;
    if (ranFlowRef.current) return;
    ranFlowRef.current = true;

    try {
      const r = await api.get<ApiResponse<MiHoyPayload>>("/mi/asistencia/hoy");
      const payload = r.data.data;
      const row = payload?.hoy ?? null;
      const needPhoto = Boolean(payload?.context?.requires_photo ?? true);

      // si estamos dentro, no molestamos con prompts
      if (!needPhoto) return;

      const hasEntry = Boolean(row?.hora_entrada_real);
      const hasExit = Boolean(row?.hora_salida_real);

      if (hasEntry && hasExit) return;

      if (!hasEntry) {
        const entryShown = localStorage.getItem(ENTRY_SHOWN_KEY) === "1";
        if (!entryShown) {
          setPromptTitle("Registrar entrada");
          setPromptSubtitle("Debes enviar una foto real del lugar para marcar asistencia.");
          setPromptMode("entry");
          setPromptOpen(true);
        }
        return;
      }

      if (hasEntry && !hasExit) {
        const snoozed = sessionStorage.getItem(EXIT_SNOOZE_KEY) === "1";
        if (snoozed) return;

        setPromptTitle("¿Registrar salida?");
        setPromptSubtitle("Debes enviar una foto real del lugar para registrar salida.");
        setPromptMode("exit");
        setPromptOpen(true);
      }
    } catch {
      // no rompemos
    }
  }

  async function onDeleteRow(row: AsistenciaRow) {
    setDelRow(row);
    setDelOpen(true);
  }

  async function confirmDelete() {
    if (!delRow) return;
    setDelLoading(true);
    setError(null);

    try {
      await api.delete(`/asistencias/${delRow.id}`);
      setDelOpen(false);
      setDelRow(null);
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error eliminando asistencia");
    } finally {
      setDelLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading) runAutoFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin, canAttendance]);

  const entradaOk = !!hoy?.hora_entrada_real;
  const salidaOk = !!hoy?.hora_salida_real;

  const viewer = access.mode === "viewer";

  return (
    <div className="space-y-4">
      {/* ✅ MODAL eliminar */}
      <ConfirmDeleteModal
        open={delOpen}
        loading={delLoading}
        title={`¿Eliminar asistencia #${delRow?.id ?? ""}?`}
        subtitle={
          delRow
            ? `Fecha: ${delRow.fecha} — Entrada: ${delRow.hora_entrada_real ?? "—"} — Salida: ${delRow.hora_salida_real ?? "—"}`
            : undefined
        }
        onClose={() => {
          if (delLoading) return;
          setDelOpen(false);
          setDelRow(null);
        }}
        onConfirm={confirmDelete}
      />

      {/* ✅ MODAL entrada/salida */}
      <AttendancePromptModal
        open={promptOpen}
        mode={promptMode}
        loading={promptLoading}
        title={promptTitle}
        subtitle={promptSubtitle}
        onAcceptEntry={() => {
          setPromptOpen(false);
          setPromptMode(null);
          requestEntry();
        }}
        onCancelExit={() => {
          sessionStorage.setItem(EXIT_SNOOZE_KEY, "1");
          setPromptOpen(false);
          setPromptMode(null);
        }}
        onConfirmExit={async () => {
          setPromptLoading(true);
          try {
            setPromptOpen(false);
            setPromptMode(null);
            requestExit();
          } finally {
            setPromptLoading(false);
          }
        }}
      />

      {/* ✅ MODAL foto */}
      <AttendancePhotoModal
        open={photoOpen}
        mode={photoMode}
        loading={photoMode === "entry" ? markingIn : markingOut}
        onClose={() => setPhotoOpen(false)}
        onConfirm={onConfirmPhoto}
      />

      {viewer && !isAdmin && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-extrabold text-yellow-900">
          Usted no tiene ninguna actividad programada fuera de la institución. <span className="underline">Modo visor</span>.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div>
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      {/* Panel principal */}
      <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-black/60" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-black">{titulo}</h2>
              <div className="text-xs text-black/60">
                {isAdmin ? "Filtra por nombre/apellido/correo o deja vacío para ver TODOS" : "Registro de hoy + historial"}
              </div>

              {!isAdmin ? (
                <div className="mt-1 text-[11px] text-black/55">
                  {requiresPhoto ? "Fuera de institución: foto requerida." : "Dentro de institución: no requiere foto."}
                </div>
              ) : null}
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-extrabold text-black/60 mb-1">Buscar usuario (nombre/apellido/correo)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
                  <input
                    value={usuarioQ}
                    onChange={(e) => setUsuarioQ(e.target.value)}
                    placeholder="Vacío = TODOS"
                    className="w-full pl-9 rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Desde</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full pl-9 rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black/60 mb-1">Hasta</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full pl-9 rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={cargar}
                  className="w-full h-10 rounded-2xl bg-black text-white px-4 font-extrabold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
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

        {/* Vista normal */}
        {!isAdmin && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-3xl border border-black/10 p-4">
                <div className="text-xs font-extrabold text-black/60 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Fecha
                </div>
                <div className="text-lg font-extrabold text-black">{hoy?.fecha ?? "—"}</div>
              </div>

              <div className="rounded-3xl border border-black/10 p-4">
                <div className="text-xs font-extrabold text-black/60 flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Entrada
                </div>
                <div className="text-lg font-extrabold text-black">{hoy?.hora_entrada_real ?? "—"}</div>
                <div className="mt-2">
                  <BadgeOk ok={entradaOk} textOk="Entrada marcada" textNo="Sin entrada" />
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 p-4">
                <div className="text-xs font-extrabold text-black/60 flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Salida
                </div>
                <div className="text-lg font-extrabold text-black">{hoy?.hora_salida_real ?? "—"}</div>
                <div className="mt-2">
                  <BadgeOk ok={salidaOk} textOk="Salida marcada" textNo="Sin salida" />
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 p-4 bg-black/[0.02]">
                <div className="text-xs font-extrabold text-black/60 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Hora actual
                </div>
                <div className="text-lg font-extrabold text-black">{formatTime(now)}</div>
                <div className="text-xs text-black/60">Hora del sistema</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={requestEntry}
                disabled={markingIn || entradaOk || !canAttendance}
                className={[
                  "rounded-2xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:brightness-95",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "flex items-center gap-2",
                ].join(" ")}
                type="button"
                title={
                  !canAttendance
                    ? "Modo visor"
                    : entradaOk
                    ? "Ya marcaste entrada"
                    : requiresPhoto
                    ? "Marcar entrada (foto requerida fuera)"
                    : "Marcar entrada (sin foto dentro)"
                }
              >
                {markingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {entradaOk ? "Entrada marcada" : "Marcar entrada"}
              </button>

              <button
                onClick={requestExit}
                disabled={markingOut || !entradaOk || salidaOk || !canAttendance}
                className={[
                  "rounded-2xl bg-black text-white px-4 py-2 font-extrabold hover:opacity-90",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "flex items-center gap-2",
                ].join(" ")}
                type="button"
                title={
                  !canAttendance
                    ? "Modo visor"
                    : !entradaOk
                    ? "Primero marca entrada"
                    : salidaOk
                    ? "Ya marcaste salida"
                    : requiresPhoto
                    ? "Marcar salida (foto requerida fuera)"
                    : "Marcar salida (sin foto dentro)"
                }
              >
                {markingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {salidaOk ? "Salida marcada" : "Marcar salida"}
              </button>
            </div>

            {!canAttendance ? (
              <div className="mt-3 text-xs text-black/60">
                * Estás en modo visor. Solo podrás marcar si estás en IP de institución o tienes actividad programada ahora.
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Tabla */}
      <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
        <h2 className="text-xl font-extrabold text-black">{isAdmin ? "Resultados" : "Historial"}</h2>

        <div className="mt-4 overflow-auto rounded-3xl border border-black/10">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {isAdmin && <th className="text-left px-3 py-2">Usuario</th>}
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Entrada</th>
                <th className="text-left px-3 py-2">Salida</th>
                {isAdmin && <th className="text-right px-3 py-2">Acciones</th>}
              </tr>
            </thead>

            <tbody className="bg-white">
              {hist.map((r, idx) => {
                const hasIn = !!r.hora_entrada_real;
                const hasOut = !!r.hora_salida_real;

                return (
                  <tr
                    key={r.id}
                    className={[
                      "border-t border-black/10",
                      idx % 2 === 1 ? "bg-black/[0.01]" : "bg-white",
                      "hover:bg-black/[0.03] transition",
                    ].join(" ")}
                  >
                    {isAdmin && (
                      <td className="px-3 py-2">
                        <div className="font-extrabold text-black flex items-center gap-2">
                          <User className="h-4 w-4 text-black/40" />
                          <span className="truncate">
                            {(r.usuario_nombre ?? "—") + (r.usuario_apellido ? ` ${r.usuario_apellido}` : "")}
                          </span>
                        </div>
                        {r.usuario_email ? (
                          <div className="text-[11px] text-black/55 flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4 text-black/35" />
                            <span className="truncate">{r.usuario_email}</span>
                          </div>
                        ) : null}
                      </td>
                    )}

                    <td className="px-3 py-2 font-extrabold">{r.fecha}</td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {hasIn ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <XCircle className="h-4 w-4 text-black/35" />
                        )}
                        <span>{r.hora_entrada_real ?? "—"}</span>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {hasOut ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <XCircle className="h-4 w-4 text-black/35" />
                        )}
                        <span>{r.hora_salida_real ?? "—"}</span>
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteRow(r)}
                          disabled={delLoading}
                          className={[
                            "inline-flex items-center gap-2 h-9 px-3 rounded-2xl border border-black/15",
                            "font-extrabold hover:bg-black/5",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                          ].join(" ")}
                          title="Eliminar asistencia"
                        >
                          <Trash2 className="h-4 w-4 text-[#FE003E]" />
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {hist.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-black/60" colSpan={isAdmin ? 5 : 3}>
                    Sin registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
