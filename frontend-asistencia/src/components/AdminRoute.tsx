// src/components/AdminRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getUser } from "../services/auth";
import { useAuth } from "../auth/AuthContext";

function hasAdminLikeRole(keys: string[]) {
  const s = keys.map((x) => String(x).toLowerCase());
  return s.includes("admin") || s.includes("supervisor") || s.includes("superadmin");
}

export default function AdminRoute() {
  const meStorage: any = getUser();
  const { user, roles, loading } = useAuth();

  // ✅ nunca devolver null (evita “pantalla blanca”)
  if (loading) {
    return (
      <div className="p-6 text-sm font-bold text-black/70">
        Cargando permisos...
      </div>
    );
  }

  // ✅ si no hay sesión (ni storage ni context)
  if (!meStorage && !user) return <Navigate to="/login" replace />;

  // ✅ 1) prioridad: roles del AuthContext
  const ctxRoleKeys = Array.isArray(roles) ? roles.map((r: any) => String(r?.key ?? r?.name ?? r)) : [];
  const isAdminCtx = hasAdminLikeRole(ctxRoleKeys);

  if (isAdminCtx) return <Outlet />;

  // ✅ 2) fallback: roles desde storage (por si context aún no trae)
  const storageRoleKeys = Array.isArray(meStorage?.roles) ? meStorage.roles.map((r: any) => String(r)) : [];
  const isAdminStorage = hasAdminLikeRole(storageRoleKeys);

  if (!isAdminStorage) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
