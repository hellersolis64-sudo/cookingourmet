// src/pages/Roles.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  KeyRound,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ApiResponse<T> = { success: boolean; message?: string; data: T };

type RoleRow = {
  id: number;
  nombre: string;
  descripcion: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function toStr(v: any) {
  return v == null ? "" : String(v);
}

function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
            className="w-full max-w-lg rounded-3xl bg-white border border-black/10 shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-black text-white flex items-center justify-between">
              <div className="font-extrabold tracking-tight flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> {title}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-2xl bg-white/10 hover:bg-white/20 grid place-items-center"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Roles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // búsqueda
  const [q, setQ] = useState("");

  // modal crear/editar
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return roles;
    return roles.filter((r) => {
      const a = (r.nombre ?? "").toLowerCase();
      const b = (r.descripcion ?? "").toLowerCase();
      return a.includes(s) || b.includes(s) || String(r.id).includes(s);
    });
  }, [q, roles]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      // ✅ por ahora solo GET /roles (cuando hagamos backend)
      const res = await api.get<ApiResponse<any>>("/roles", { params: { per_page: 200, page: 1 } });
      const items = extractItems<RoleRow>(res.data?.data ?? res.data);
      setRoles(items);
    } catch (e: any) {
      setRoles([]);
      setError(e?.response?.data?.message ?? "Error cargando roles");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setNombre("");
    setDescripcion("");
    setOpen(true);
  }

  function openEdit(r: RoleRow) {
    setEditing(r);
    setNombre(r.nombre ?? "");
    setDescripcion(r.descripcion ?? "");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const n = nombre.trim();
    if (!n) return setError("El nombre del rol es obligatorio.");

    setSaving(true);
    try {
      if (!editing) {
        // ✅ Backend luego: POST /roles
        await api.post("/roles", { nombre: n, descripcion: descripcion.trim() ? descripcion.trim() : null });
      } else {
        // ✅ Backend luego: PUT /roles/{id}
        await api.put(`/roles/${editing.id}`, { nombre: n, descripcion: descripcion.trim() ? descripcion.trim() : null });
      }
      setOpen(false);
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error guardando rol");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(r: RoleRow) {
    if (!window.confirm(`¿Eliminar rol "${r.nombre}" (#${r.id})?`)) return;
    setError(null);
    setDeletingId(r.id);
    try {
      // ✅ Backend luego: DELETE /roles/{id}
      await api.delete(`/roles/${r.id}`);
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error eliminando rol");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center">
              <KeyRound className="h-5 w-5 text-black/60" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-black">Roles</h2>
              <div className="text-xs text-black/60">
                Crea/edita roles (nombre y descripción). El <b>ID no cambia</b>.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

            <button
              onClick={openCreate}
              className="h-10 px-3 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 flex items-center gap-2"
              type="button"
            >
              <Plus className="h-4 w-4" /> Nuevo rol
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por id/nombre/descr..."
            className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
          />
        </div>
      </section>

      <section className="bg-white rounded-3xl p-5 border border-black/10 shadow-sm">
        <h3 className="text-lg font-extrabold text-black">Listado</h3>

        <div className="mt-4 overflow-auto rounded-3xl border border-black/10">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Descripción</th>
                <th className="text-right px-3 py-2">Acciones</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-black/60">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-black/60">
                    Sin roles.
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={[
                      "border-t border-black/10",
                      idx % 2 === 1 ? "bg-black/[0.01]" : "bg-white",
                      "hover:bg-black/[0.03] transition",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 font-extrabold">{r.id}</td>
                    <td className="px-3 py-2 font-extrabold">{toStr(r.nombre)}</td>
                    <td className="px-3 py-2 text-black/70">{toStr(r.descripcion) || "—"}</td>

                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="h-9 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 flex items-center gap-2"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </button>

                        <button
                          onClick={() => onDelete(r)}
                          disabled={deletingId === r.id}
                          className="h-9 px-3 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 flex items-center gap-2 disabled:opacity-60"
                          type="button"
                        >
                          {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] text-black/55">
          * El cambio de nombre no cambia el ID. (Luego en el backend validaremos que el nombre sea único).
        </div>
      </section>

      <Modal
        open={open}
        title={editing ? `Editar rol #${editing.id}` : "Crear rol"}
        onClose={closeModal}
      >
        <form onSubmit={onSave} className="grid gap-3">
          <div>
            <label className="block text-xs font-extrabold text-black/60 mb-1">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
              placeholder="Ej: colaborador"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-black/60 mb-1">Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-2xl border border-black/15 px-3 py-2 outline-none focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30"
              placeholder="Ej: Usuario colaborador"
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="h-10 px-4 rounded-2xl border border-black/15 font-extrabold hover:bg-black/5 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-2xl bg-[#FE003E] text-white font-extrabold hover:brightness-95 disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
