import { api } from "./api";

export type ApiResponse<T> = { success: boolean; message: string; data: T };

export type Extension = {
  id: number;
  tarea_id: number;
  estado: string;
  hora_fin_solicitada: string;
  motivo: string | null;
  created_at?: string;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

function extractItems<T>(payload: any): T[] {
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

export async function fetchMyExtensionsAll(per_page = 50): Promise<Extension[]> {
  // /api/mi/extensiones es paginado (Laravel paginate)
  const all: Extension[] = [];
  let page = 1;
  let safe = 0;

  while (safe < 20) {
    safe++;
    const res = await api.get<ApiResponse<any>>("/mi/extensiones", { params: { page, per_page } });
    const payload = res.data.data;

    const items = extractItems<Extension>(payload);
    all.push(...items);

    // si no es paginado, salimos
    if (Array.isArray(payload)) break;

    const last = payload?.last_page ?? 1;
    if (page >= last) break;
    page++;
  }

  return all;
}

export async function createExtension(input: {
  tarea_id: number;
  hora_fin_solicitada: string; // "HH:mm"
  motivo?: string | null;
}) {
  const res = await api.post("/solicitudes-extension", input);
  return res.data;
}
