// src/layouts/DashboardLayout.tsx
import { useEffect, useState, useRef } from "react"; // ✅ Agregado useRef
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ChatWidget from "../components/chat/ChatWidget";
import SidebarAdmin from "../components/sidebar/SidebarAdmin";
import SidebarEmpleado from "../components/sidebar/SidebarEmpleado";

import { api } from "../services/api";
import { getUser, logout } from "../services/auth";
import { normalizeRoles, hasAnyRole } from "../services/roles";

// ✅ NUEVO
import { useAuth } from "../auth/AuthContext";

function Icon({ name }: { name: "menu" | "close" | "logout" }) {
  const common = "w-5 h-5";
  switch (name) {
    case "menu":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "close":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "logout":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M10 7V6a2 2 0 0 1 2-2h7v16h-7a2 2 0 0 1-2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M14 12H3m0 0 3-3M3 12l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function AccessBanner() {
  const { access } = useAuth();

  if (access.mode === "viewer") {
    return (
      <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-900">
        Usted no tiene ninguna actividad programada fuera de la institución. <span className="underline">Modo visor</span>.
      </div>
    );
  }

  if (access.mode === "temp_full") {
    return (
      <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
        Acceso temporal habilitado{" "}
        {access.expiresAt ? (
          <>
            hasta <span className="underline">{new Date(access.expiresAt).toLocaleString()}</span>
          </>
        ) : null}
        .
      </div>
    );
  }

  return null;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const me = getUser();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>(() => normalizeRoles((me as any)?.roles));

  // ✅ AuthContext para refrescar el modo de acceso
  const { refreshAccessMode } = useAuth();

  // ✅ FIX: Evitar doble ejecución en StrictMode y bucles infinitos
  const ranOnce = useRef(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ✅ Refresca roles + access-mode al entrar al dashboard (UNA SOLA VEZ)
  useEffect(() => {
    if (ranOnce.current) return; 
    ranOnce.current = true;

    let alive = true;

    (async () => {
      try {
        // 1. Refrescar datos del usuario y roles
        const r = await api.get("/me");
        const payload: any = r.data;
        const user = payload?.data?.user ?? payload?.data ?? payload?.user ?? payload;
        const newRoles = normalizeRoles(user?.roles);

        if (alive) setRoles(newRoles);

        // 2. Sincronizar localStorage
        const raw = localStorage.getItem("user");
        if (raw) {
          try {
            const current = JSON.parse(raw);
            localStorage.setItem("user", JSON.stringify({ ...current, roles: newRoles }));
          } catch {}
        }
      } catch (err) {
        console.error("Error al refrescar /me", err);
      }

      try {
        // 3. Refrescar el modo de acceso (viewer/temp_full/full)
        await refreshAccessMode();
      } catch (err) {
        console.error("Error al refrescar access mode", err);
      }
    })();

    return () => {
      alive = false;
    };
    // ⚠️ Importante: Sin dependencias para asegurar que solo corra al montar el layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = hasAnyRole(roles, ["admin", "supervisor"]);

  async function onLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const sidebarNav = isAdmin ? <SidebarAdmin /> : <SidebarEmpleado />;

  const sidebar = (
    <aside className="h-screen bg-black text-white flex flex-col">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FE003E]" />
          <div className="min-w-0">
            <div className="font-extrabold leading-tight">CG-AdminControler</div>
            <div className="text-xs text-white/60 truncate">
              {me ? `${me.name} — ${me.email}` : "Control"}
            </div>
            <div className="text-[11px] text-white/40 truncate">
              {isAdmin ? "Admin/Supervisor" : "Empleado"}
            </div>
          </div>
        </div>
      </div>

      {sidebarNav}

      <div className="p-3 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full rounded-xl bg-[#FE003E] text-white px-4 py-2 font-extrabold hover:opacity-95 flex items-center justify-center gap-2"
        >
          <Icon name="logout" /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="hidden md:grid md:grid-cols-[280px_1fr] min-h-screen">
        <div className="sticky top-0 h-screen">{sidebar}</div>
        <main className="p-4">
          <AccessBanner />
          <Outlet />
        </main>
      </div>

      <div className="md:hidden min-h-screen">
        <div className="p-3 flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl bg-black text-white px-3 py-2 font-bold flex items-center gap-2"
          >
            <Icon name="menu" /> Menú
          </button>
          <div className="flex-1 text-black font-extrabold truncate">TimeFlow</div>
        </div>

        <main className="p-4 pt-2">
          <AccessBanner />
          <Outlet />
        </main>

        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[82%] max-w-[320px]">
              <div className="h-full relative">
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-white/10 text-white px-3 py-2 font-bold"
                  >
                    <Icon name="close" />
                  </button>
                </div>
                {sidebar}
              </div>
            </div>
          </div>
        )}
      </div>

      <ChatWidget />
    </div>
  );
}