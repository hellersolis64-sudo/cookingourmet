import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { getAccessMode } from "../services/accessMode";
import { login as loginSvc, logout as logoutSvc, getUser as getUserSvc } from "../services/auth";

type RoleItem = { key: string; name?: string };

export type AccessState = {
  mode: "full" | "temp_full" | "viewer";
  reason?: string;
  expiresAt?: number | null;
};

type AuthUser = {
  id: number;
  name?: string;
  email?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  roles: RoleItem[];
  loading: boolean;

  access: AccessState;
  canEdit: boolean;
  canAttendance: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  refreshMe: () => Promise<void>;
  refreshAccessMode: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return ctx;
}

function normalizeRoles(input: any): RoleItem[] {
  const arr = Array.isArray(input) ? input : [];
  return arr.map((r: any) => {
    if (typeof r === "string") return { key: r, name: r };
    const key = r?.key ?? r?.name ?? String(r?.id ?? "role");
    const name = r?.name ?? r?.key;
    return { key: String(key), name: name ? String(name) : undefined };
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  const [access, setAccess] = useState<AccessState>({ mode: "viewer", expiresAt: null });

  const canEdit = access.mode === "full" || access.mode === "temp_full";
  const canAttendance = access.mode === "full" || access.mode === "temp_full";

  const bootedRef = useRef(false);

  const refreshAccessMode = useCallback(async () => {
    try {
      const info = await getAccessMode();
      setAccess({
        mode: info.mode,
        reason: info.reason,
        expiresAt: info.expires_at ? new Date(info.expires_at).getTime() : null,
      });
    } catch {
      setAccess({ mode: "viewer", reason: "NO_ACTIVITY_OUTSIDE", expiresAt: null });
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const res = await api.get("/me");
    const payload = (res.data?.data ?? res.data) as any;

    const u = (payload?.user ?? payload) as any;
    const r = payload?.roles ?? u?.roles ?? [];

    setUser(u ? { id: Number(u.id), name: u.name, email: u.email } : null);
    setRoles(normalizeRoles(r));
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await loginSvc(email, password);

      if (!res?.success) {
        const msg = res?.message || "Credenciales incorrectas";
        const err: any = new Error(msg);
        err.response = { data: { message: msg } };
        throw err;
      }

      const me = getUserSvc();
      if (me) {
        setUser({ id: Number(me.id), name: me.name, email: me.email });
        setRoles(Array.isArray(me.roles) ? me.roles.map((k: string) => ({ key: k, name: k })) : []);
      }

      // ✅ no bloquees UI si el backend está lento
      await Promise.allSettled([refreshMe(), refreshAccessMode()]);
    },
    [refreshMe, refreshAccessMode]
  );

  const signOut = useCallback(async () => {
    await logoutSvc();
    setUser(null);
    setRoles([]);
    setAccess({ mode: "viewer", reason: "NO_ACTIVITY_OUTSIDE", expiresAt: null });
  }, []);

  // ✅ Boot: nunca te quedes cargando infinito
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let alive = true;

    // ✅ failsafe: pase lo que pase, baja loading
    const safety = setTimeout(() => {
      if (!alive) return;
      setLoading(false);
    }, 1500);

    (async () => {
      try {
        const me = getUserSvc();

        // si no hay user en storage, ya no bloqueamos: simplemente termina loading
        if (!me) return;

        if (alive) {
          setUser({ id: Number(me.id), name: me.name, email: me.email });
          setRoles(Array.isArray(me.roles) ? me.roles.map((k: string) => ({ key: k, name: k })) : []);
        }

        // ✅ refrescos en background (sin await) para no colgar UI
        refreshMe().catch(() => {});
        refreshAccessMode().catch(() => {});
      } catch {
        if (!alive) return;
        setUser(null);
        setRoles([]);
        setAccess({ mode: "viewer", reason: "NO_ACTIVITY_OUTSIDE", expiresAt: null });
      } finally {
        if (alive) setLoading(false);
        clearTimeout(safety);
      }
    })();

    return () => {
      alive = false;
      clearTimeout(safety);
    };
  }, [refreshMe, refreshAccessMode]);

  // Expiración del acceso temporal
  useEffect(() => {
    if (access.mode !== "temp_full" || !access.expiresAt) return;

    const t = setInterval(() => {
      if (Date.now() >= (access.expiresAt ?? 0)) {
        setAccess({ mode: "viewer", reason: "NO_ACTIVITY_OUTSIDE", expiresAt: null });
      }
    }, 1000);

    return () => clearInterval(t);
  }, [access.mode, access.expiresAt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles,
      loading,
      access,
      canEdit,
      canAttendance,
      signIn,
      signOut,
      refreshMe,
      refreshAccessMode,
    }),
    [user, roles, loading, access, canEdit, canAttendance, signIn, signOut, refreshMe, refreshAccessMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
