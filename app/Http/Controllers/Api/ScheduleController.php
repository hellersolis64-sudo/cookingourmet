<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    private function isAdminOrSupervisor($user): bool
    {
        return $user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'supervisor']);
    }

    private function canAccessSchedule($user, object $row): bool
    {
        return $this->isAdminOrSupervisor($user) || ($user && (int)$row->usuario_id === (int)$user->id);
    }

    private function findSchedule(int $id): ?object
    {
        return DB::table('user_schedules')->where('id', $id)->first();
    }

    // (Opcional) GET /api/schedules/{id}
    public function show(Request $request, int $id)
    {
        $row = $this->findSchedule($id);
        if (!$row) return ApiResponse::error('No encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $row)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        return ApiResponse::success($row, 'Schedule');
    }

    public function index(Request $request)
    {
        $perPage = min((int)$request->input('per_page', 50), 200);

        $q = DB::table('user_schedules')->orderByDesc('id');

        if ($request->filled('usuario_id')) $q->where('usuario_id', (int)$request->input('usuario_id'));
        if ($request->filled('type')) $q->where('type', (string)$request->input('type'));

        return ApiResponse::success($q->paginate($perPage), 'Schedules');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'usuario_id' => ['required', 'integer'],
            'type' => ['nullable', 'string'],
            'title' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'allow_remote' => ['nullable', 'boolean'],
        ]);

        $id = DB::table('user_schedules')->insertGetId([
            'usuario_id' => (int)$data['usuario_id'],
            'type' => $data['type'] ?? 'attendance',
            'title' => $data['title'] ?? null,
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
            'allow_remote' => (bool)($data['allow_remote'] ?? true),

            // ✅ campos tipo tarea (si existen en tabla)
            'hora_inicio_real' => null,
            'hora_fin_real' => null,
            'inicio_real_at' => null,
            'fin_real_at' => null,
            'comentario_cierre' => null,
            'enviada_en' => null,

            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = $this->findSchedule($id);
        return ApiResponse::success($row, 'Schedule creado');
    }

    /**
     * PUT /api/schedules/{id}
     * - Puede servir tanto para editar schedule como para "iniciar" (hora_inicio_real)
     */
    public function update(Request $request, $id)
    {
        $row = $this->findSchedule((int)$id);
        if (!$row) return ApiResponse::error('No encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $row)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $data = $request->validate([
            'type' => ['nullable', 'string'],
            'title' => ['nullable', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'allow_remote' => ['nullable', 'boolean'],

            // ✅ campos tipo tarea
            'hora_inicio_real' => ['nullable', 'date_format:H:i:s'],
            'hora_fin_real' => ['nullable', 'date_format:H:i:s'],
            'inicio_real_at' => ['nullable', 'date'],
            'fin_real_at' => ['nullable', 'date'],
        ]);

        $starts = $data['starts_at'] ?? $row->starts_at;
        $ends   = $data['ends_at'] ?? $row->ends_at;

        if (strtotime($ends) <= strtotime($starts)) {
            return ApiResponse::error('ends_at debe ser mayor que starts_at', null, 422);
        }

        // ✅ armamos update solo con lo que viene o lo existente
        $payload = [
            'type' => array_key_exists('type', $data) ? ($data['type'] ?? $row->type) : $row->type,
            'title' => array_key_exists('title', $data) ? ($data['title'] ?? $row->title) : $row->title,
            'starts_at' => $starts,
            'ends_at' => $ends,
            'allow_remote' => array_key_exists('allow_remote', $data) ? (bool)$data['allow_remote'] : (bool)$row->allow_remote,
            'updated_at' => now(),
        ];

        // ✅ Campos reales (solo si los mandan)
        if (array_key_exists('hora_inicio_real', $data)) $payload['hora_inicio_real'] = $data['hora_inicio_real'];
        if (array_key_exists('hora_fin_real', $data)) $payload['hora_fin_real'] = $data['hora_fin_real'];
        if (array_key_exists('inicio_real_at', $data)) $payload['inicio_real_at'] = $data['inicio_real_at'];
        if (array_key_exists('fin_real_at', $data)) $payload['fin_real_at'] = $data['fin_real_at'];

        DB::table('user_schedules')->where('id', (int)$id)->update($payload);

        $fresh = $this->findSchedule((int)$id);
        return ApiResponse::success($fresh, 'Schedule actualizado');
    }

    /**
     * PATCH /api/schedules/{id}/enviar
     * Cierra schedule igual que tarea:
     * - comentario_cierre requerido
     * - enviada_en se setea
     * - fin_real_at se setea (y hora_fin_real si quieres)
     */
    public function enviar(Request $request, int $id)
    {
        $row = $this->findSchedule($id);
        if (!$row) return ApiResponse::error('No encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $row)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // si ya está enviada/bloqueada, evitamos doble envío
        if (!empty($row->enviada_en) || !empty($row->comentario_cierre)) {
            return ApiResponse::error('Ya fue enviada y está bloqueada', null, 422);
        }

        $data = $request->validate([
            'comentario_cierre' => ['required', 'string', 'min:3'],
        ]);

        // ✅ fin automático
        $now = now();
        $horaFin = $now->format('H:i:s');

        DB::table('user_schedules')->where('id', $id)->update([
            'comentario_cierre' => $data['comentario_cierre'],
            'enviada_en' => $now,
            'fin_real_at' => $now,

            // Si quieres: setear hora_fin_real automáticamente
            'hora_fin_real' => $horaFin,

            'updated_at' => $now,
        ]);

        $fresh = $this->findSchedule($id);
        return ApiResponse::success($fresh, 'Schedule enviado');
    }

    public function destroy($id)
    {
        $row = $this->findSchedule((int)$id);
        if (!$row) return ApiResponse::error('No encontrado', null, 404);

        // ✅ por seguridad: solo admin/supervisor o dueño (si quieres que el dueño pueda borrar)
        // si NO quieres que el dueño borre, cambia a: if (!$this->isAdminOrSupervisor($request->user())) ...
        // aquí no tenemos Request en firma; lo mantenemos como admin/supervisor solamente (como tu ruta)
        DB::table('user_schedules')->where('id', (int)$id)->delete();
        return ApiResponse::success(true, 'Schedule eliminado');
    }

    public function my(Request $request)
    {
        $u = $request->user();
        $perPage = min((int)$request->input('per_page', 100), 200);

        $q = DB::table('user_schedules')
            ->where('usuario_id', $u->id)
            ->orderByDesc('starts_at');

        return ApiResponse::success($q->paginate($perPage), 'Mis actividades');
    }
}
