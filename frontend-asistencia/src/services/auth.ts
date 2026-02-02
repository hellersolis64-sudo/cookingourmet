import { api } from "./api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roles?: string[]; // ["admin", "supervisor", "empleado"]
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: any; // viene del backend
    checkin?: any;
  };
};

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

function normalizeRoles(user: any): string[] | undefined {
  // Caso 1: roles viene como array ["admin"] o [{name:"admin"}]
  if (Array.isArray(user?.roles)) {
    const out = user.roles
      .map((r: any) => String(r?.name ?? r?.nombre ?? r))
      .map((s: string) => s.toLowerCase().trim())
      .filter(Boolean);

    return out.length ? out : undefined;
  }

  // Caso 2: role/rol/role_name viene como string
  const one = user?.role ?? user?.rol ?? user?.role_name ?? user?.tipo ?? null;
  if (one) return [String(one).toLowerCase().trim()];

  return undefined;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/login", { email, password });

  const token = res.data?.data?.token ?? null;
  const userRaw = res.data?.data?.user ?? null;

  if (token && userRaw) {
    const roles = normalizeRoles(userRaw);
    const userFixed: AuthUser = {
      id: Number(userRaw.id),
      name: String(userRaw.name ?? ""),
      email: String(userRaw.email ?? ""),
      roles,
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userFixed));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/logout");
  } catch {
    // ignorar
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
