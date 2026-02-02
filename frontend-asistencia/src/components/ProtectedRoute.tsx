import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken, getUser } from "../services/auth";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute() {
  const location = useLocation();
  const { loading } = useAuth();

  const token = getToken();
  const user = getUser();

  // ✅ mientras AuthProvider “bootea”, no redirigir todavía (evita parpadeos)
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-black/70">
          Cargando sesión...
        </div>
      </div>
    );
  }

  // ✅ exige token + user
  if (!token || !user) {
    const from = `${location.pathname}${location.search ?? ""}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
