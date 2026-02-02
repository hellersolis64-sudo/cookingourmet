import { api } from "./api";

export type AccessMode = "full" | "temp_full" | "viewer";

export type AccessModeInfo = {
  mode: AccessMode;
  reason: "IN_OFFICE_IP" | "HAS_SCHEDULED_ACTIVITY" | "NO_ACTIVITY_OUTSIDE";
  ip?: string;
  expires_at?: string | null;
};

// --- Variables de control fuera de la función (persistentes en la sesión) ---
let cache: AccessModeInfo | null = null;
let cacheAt = 0;
let inflight: Promise<AccessModeInfo> | null = null;

/**
 * Obtiene el modo de acceso con caché de 15 segundos 
 * y deduplicación de peticiones en curso.
 */
export async function getAccessMode(): Promise<AccessModeInfo> {
  const now = Date.now();

  // ✅ 1. Retornar caché si tiene menos de 15 segundos
  if (cache && (now - cacheAt < 15000)) {
    return cache;
  }

  // ✅ 2. Si ya hay una petición volando, devolver la misma promesa (Deduplicación)
  if (inflight) {
    return inflight;
  }

  // ✅ 3. Si no hay caché ni petición en curso, crear una nueva
  inflight = (async () => {
    try {
      const res = await api.get("/auth/access-mode");
      
      // Adaptar según la estructura de tu respuesta API
      const data = (res.data?.data ?? res.data) as AccessModeInfo;

      // Actualizar caché
      cache = data;
      cacheAt = Date.now();
      
      return data;
    } finally {
      // Limpiar el estado de "vuelo" al terminar (éxito o error)
      inflight = null;
    }
  })();

  return inflight;
}