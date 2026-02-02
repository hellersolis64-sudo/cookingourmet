// src/services/roles.ts
import { getUser } from "./auth";

export type RoleName = "admin" | "supervisor" | "empleado";

export function normalizeRoles(input: any): string[] {
  if (!input) return [];

  // si ya es array: ["admin"] o [{name:"admin"}]
  if (Array.isArray(input)) {
    return input
      .map((r) => String(r?.name ?? r?.nombre ?? r?.rol ?? r).toLowerCase().trim())
      .filter(Boolean);
  }

  // si viene como string: "admin"
  return [String(input).toLowerCase().trim()].filter(Boolean);
}

export function getRolesFromStorage(): string[] {
  const me: any = getUser();
  return normalizeRoles(me?.roles ?? me?.role ?? me?.rol ?? me?.role_name);
}

export function hasAnyRole(roles: string[], allowed: RoleName[]) {
  const set = new Set(roles.map((r) => r.toLowerCase()));
  return allowed.some((a) => set.has(a));
}

export function isAdminOrSupervisorFromStorage(): boolean {
  const roles = getRolesFromStorage();
  return hasAnyRole(roles, ["admin", "supervisor"]);
}

export function isEmpleadoFromStorage(): boolean {
  const roles = getRolesFromStorage();
  // empleado puro (si quieres permitir admin también, cambia esto)
  return hasAnyRole(roles, ["empleado"]) && !hasAnyRole(roles, ["admin", "supervisor"]);
}
