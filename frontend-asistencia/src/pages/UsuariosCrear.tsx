import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type ApiResponse<T> = { success: boolean; message?: string; data?: T };

function normalizeRoles(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === "string" ? x : String(x?.name ?? "")))
    .map((s) => s.trim())
    .filter(Boolean);
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-extrabold text-black/60 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/45">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

export default function UsuariosCrear() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [role, setRole] = useState("empleado"); // ✅ igual a tu backend
  const [roles, setRoles] = useState<string[]>(["empleado", "supervisor", "admin"]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<ApiResponse<any>>("/roles");
        const list = normalizeRoles(r.data?.data);
        if (list.length) setRoles(list);
      } catch {
        // si no existe /roles, ok
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("El nombre es obligatorio");
    if (!email.trim()) return setError("El correo es obligatorio");
    if (!password.trim() || password.trim().length < 6)
      return setError("La contraseña debe tener mínimo 6 caracteres");

    setSaving(true);
    try {
      const r = await api.post<ApiResponse<any>>("/usuarios", {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
      });

      if (r.data?.success === false) {
        setError(r.data?.message ?? "No se pudo crear el usuario");
        return;
      }

      navigate("/dashboard/usuarios", { replace: true });
    } catch (e: any) {
      // ✅ 422 validación Laravel
      if (e?.response?.status === 422) {
        const errs = e?.response?.data?.errors;
        if (errs && typeof errs === "object") {
          const first = Object.values(errs)?.[0] as any;
          const msg = Array.isArray(first) ? first[0] : "Datos inválidos";
          setError(msg);
          return;
        }
      }

      setError(e?.response?.data?.message ?? "Error creando usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center">
            <ShieldCheck className="h-5 w-5 text-black/60" />
          </div>
          <div>
            <div className="text-lg font-extrabold">Crear usuario</div>
            <div className="text-[11px] text-black/45">Completa los datos y asigna un rol</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className={[
            "h-10 px-3 rounded-2xl border border-black/10 bg-white",
            "hover:bg-black/5 transition font-extrabold text-xs",
            "flex items-center gap-2",
            "focus:outline-none focus:ring-2 focus:ring-[#FE003E]/25",
          ].join(" ")}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#FE003E]/30 bg-[#FE003E]/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div>
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl p-5 border border-black/10 shadow-sm max-w-xl">
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Nombre" icon={<User className="h-4 w-4" />}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={[
                "w-full pl-9 pr-3 py-2 rounded-2xl border border-black/15 outline-none",
                "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
              ].join(" ")}
              placeholder="Nombre completo"
              autoComplete="name"
            />
          </Field>

          <Field label="Correo" icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={[
                "w-full pl-9 pr-3 py-2 rounded-2xl border border-black/15 outline-none",
                "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
              ].join(" ")}
              placeholder="correo@dominio.com"
              autoComplete="email"
            />
          </Field>

          <div>
            <label className="block text-xs font-extrabold text-black/60 mb-1">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/45">
                <Lock className="h-4 w-4" />
              </span>

              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={[
                  "w-full pl-9 pr-10 py-2 rounded-2xl border border-black/15 outline-none",
                  "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
                ].join(" ")}
                placeholder="mínimo 6 caracteres"
                autoComplete="new-password"
              />

              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl hover:bg-black/5 grid place-items-center"
                title={showPass ? "Ocultar" : "Mostrar"}
              >
                {showPass ? <EyeOff className="h-4 w-4 text-black/55" /> : <Eye className="h-4 w-4 text-black/55" />}
              </button>
            </div>
          </div>

          <Field label="Rol" icon={<ShieldCheck className="h-4 w-4" />}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={[
                "w-full pl-9 pr-3 py-2 rounded-2xl border border-black/15 font-extrabold bg-white outline-none",
                "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
              ].join(" ")}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            disabled={saving}
            className={[
              "mt-1 rounded-2xl bg-[#FE003E] text-white px-4 py-2 font-extrabold",
              "hover:brightness-95 transition",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-4 focus:ring-[#FE003E]/25",
              "flex items-center justify-center gap-2",
            ].join(" ")}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando…
              </>
            ) : (
              "Crear usuario"
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
