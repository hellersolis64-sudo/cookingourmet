<?php


namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Tarea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;



class TareaController extends Controller
{
    private function isAdminOrSupervisor($user): bool
    {
        return $user && $user->hasAnyRole(['admin', 'supervisor']);
    }

    private function canAccessTarea($user, Tarea $tarea): bool
    {
        return $this->isAdminOrSupervisor($user) || ($user && $tarea->usuario_id === $user->id);
    }

    private function estadoNombre(Tarea $tarea): ?string
    {
        if (!Schema::hasColumn('tareas', 'estado_id')) return null;
        if (!$tarea->estado_id) return null;

        return DB::table('tarea_estados')
            ->where('id', $tarea->estado_id)
            ->value('nombre');
    }

    private function isLocked(Tarea $tarea): bool
    {
        $estado = $this->estadoNombre($tarea);
        return in_array($estado, ['enviada', 'completada', 'incompleta'], true);
    }

    /**
     * Normaliza HH:mm a HH:mm:ss (para columnas TIME)
     */
    private function normalizeTime(?string $time): ?string
    {
        if (!$time) return null;
        $t = trim($time);
        return (strlen($t) === 5) ? ($t . ':00') : $t;
    }

    /**
     * Aplica filtros comunes (Búsqueda, Estado, Fechas)
     */
    private function applyFilters(Request $request, Builder $query): void
    {
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('titulo', 'like', "%{$s}%")
                  ->orWhere('descripcion', 'like', "%{$s}%");
            });
        }

        if ($request->filled('estado_id') && Schema::hasColumn('tareas', 'estado_id')) {
            $query->where('estado_id', (int) $request->estado_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->input('to'));
        }

        if ($request->filled('fecha_programada') && Schema::hasColumn('tareas', 'fecha_programada')) {
            $query->whereDate('fecha_programada', $request->input('fecha_programada'));
        }

        // ✅ Rango por fecha_programada (para calendario)
        if (Schema::hasColumn('tareas', 'fecha_programada')) {
            if ($request->filled('fecha_from')) {
                $query->whereDate('fecha_programada', '>=', $request->input('fecha_from'));
            }
            if ($request->filled('fecha_to')) {
                $query->whereDate('fecha_programada', '<=', $request->input('fecha_to'));
            }
        }
    }

    private function applyOrderByProgramacion(Builder $query): void
    {
        if (Schema::hasColumn('tareas', 'fecha_programada')) {
            // NULL al final + fecha desc
            $query->orderByRaw('fecha_programada IS NULL, fecha_programada DESC');
        }
        if (Schema::hasColumn('tareas', 'hora_inicio_programada')) {
            // NULL al final + hora asc
            $query->orderByRaw('hora_inicio_programada IS NULL, hora_inicio_programada ASC');
        }
        $query->orderByDesc('id');
    }

    public function index(Request $request)
    {
        $query = Tarea::query()->with('usuario');
        $this->applyFilters($request, $query);
        $this->applyOrderByProgramacion($query);

        $perPage = min((int) $request->input('per_page', 10), 500);
        $tareas = $query->paginate($perPage);

        return ApiResponse::success($tareas, 'Lista global de tareas');
    }

    public function tareasPorUsuario(Request $request, int $usuario)
    {
        $query = Tarea::query()->with('usuario')->where('usuario_id', $usuario);
        $this->applyFilters($request, $query);
        $this->applyOrderByProgramacion($query);

        $perPage = min((int) $request->input('per_page', 10), 500);
        $tareas = $query->paginate($perPage);

        return ApiResponse::success($tareas, 'Tareas del usuario');
    }






    

public function store(Request $request)
{
    $data = $request->validate([
        'titulo' => ['required', 'string', 'max:255'],
        'descripcion' => ['nullable', 'string'],
        'usuario_id' => ['nullable', 'integer', 'exists:users,id'],

        // Admin puede usar esto. No-admin NO.
        'fecha_programada' => ['nullable', 'date'],
        'hora_inicio_programada' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        'hora_fin_programada' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
    ]);

    $authUser = $request->user();
    $isAdmin = $this->isAdminOrSupervisor($authUser);

    $targetUserId = $data['usuario_id'] ?? $authUser->id;

    if ($targetUserId !== $authUser->id && !$isAdmin) {
        return ApiResponse::error('No autorizado para asignar tareas', null, 403);
    }

    $now = now(); // (America/Lima)
    $today = $now->toDateString();
    $nowTime = $now->format('H:i:s');

    // Normalizamos inputs
    $fechaIn = $data['fecha_programada'] ?? null;
    $hiniIn  = $this->normalizeTime($data['hora_inicio_programada'] ?? null);
    $hfinIn  = $this->normalizeTime($data['hora_fin_programada'] ?? null);

    // =========================
    // ✅ NO-ADMIN: SOLO HORA FIN
    // =========================
    if (!$isAdmin) {
        // Bloqueamos fecha e inicio
        if ($request->filled('fecha_programada') || $request->filled('hora_inicio_programada')) {
            return ApiResponse::error(
                'No puedes definir fecha/hora inicio. El inicio se registra automáticamente con la hora real del sistema.',
                null,
                422
            );
        }

        $fecha = $today;
        $hini  = $nowTime;

        // Hora fin (puedes hacerla requerida o opcional)
        if (!$hfinIn) {
            return ApiResponse::error('Debes indicar la hora fin.', null, 422);
        }

        $hfin = $hfinIn;

        // Validar fin > inicio (con fecha completa para evitar líos)
        $start = Carbon::createFromFormat('Y-m-d H:i:s', "{$fecha} {$hini}");
        $end   = Carbon::createFromFormat('Y-m-d H:i:s', "{$fecha} {$hfin}");

        if ($end->lte($start)) {
            return ApiResponse::error('La hora fin debe ser mayor a la hora actual.', null, 422);
        }
    }
    // =========================
    // ✅ ADMIN/SUPERVISOR: LIBRE
    // =========================
    else {
        $fecha = $fechaIn ?? $today;

        // si no manda inicio, usamos ahora
        $hini = $hiniIn ?? $nowTime;

        // fin opcional
        $hfin = $hfinIn;

        if ($hfin && $hfin <= $hini) {
            return ApiResponse::error('La hora_fin_programada debe ser mayor a hora_inicio_programada', null, 422);
        }
    }

    $payload = [
        'usuario_id' => $targetUserId,
        'titulo' => $data['titulo'],
        'descripcion' => $data['descripcion'] ?? null,
    ];

    if (Schema::hasColumn('tareas', 'fecha_programada')) $payload['fecha_programada'] = $fecha;
    if (Schema::hasColumn('tareas', 'hora_inicio_programada')) $payload['hora_inicio_programada'] = $hini;
    if (Schema::hasColumn('tareas', 'hora_fin_programada')) $payload['hora_fin_programada'] = $hfin ?? null;

    if (Schema::hasColumn('tareas', 'estado_id')) {
        $pendienteId = DB::table('tarea_estados')->where('nombre', 'pendiente')->value('id');
        if ($pendienteId) $payload['estado_id'] = $pendienteId;
    }

    $tarea = Tarea::create($payload);

    return ApiResponse::success($tarea, 'Tarea creada correctamente', 201);
}










    public function show(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // si tienes relaciones en el modelo, ok. Si no, al menos devolvemos archivos por table.
        $tarea->load(['usuario', 'archivos', 'historialEstados.estado']);

        return ApiResponse::success($tarea, 'Detalle de la tarea');
    }

    public function update(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // ✅ bloqueada: no se edita
        if ($this->isLocked($tarea)) {
            return ApiResponse::error('Tarea bloqueada. No se puede modificar.', null, 409);
        }

        $data = $request->validate([
            'titulo' => ['sometimes', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],

            'fecha_programada' => ['sometimes', 'nullable', 'date'],
            'hora_inicio_programada' => ['sometimes', 'nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'hora_fin_programada' => ['sometimes', 'nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],

            'hora_inicio_real' => ['nullable'],
            'hora_fin_real' => ['nullable'],
        ]);

        if (array_key_exists('hora_inicio_programada', $data)) {
            $data['hora_inicio_programada'] = $this->normalizeTime($data['hora_inicio_programada']);
        }
        if (array_key_exists('hora_fin_programada', $data)) {
            $data['hora_fin_programada'] = $this->normalizeTime($data['hora_fin_programada']);
        }

        $finalFecha = array_key_exists('fecha_programada', $data)
            ? $data['fecha_programada']
            : (Schema::hasColumn('tareas', 'fecha_programada') ? $tarea->fecha_programada : null);

        $finalIni = array_key_exists('hora_inicio_programada', $data)
            ? $data['hora_inicio_programada']
            : $tarea->hora_inicio_programada;

        $finalFin = array_key_exists('hora_fin_programada', $data)
            ? $data['hora_fin_programada']
            : $tarea->hora_fin_programada;

        if (($finalIni || $finalFin) && !$finalFecha && Schema::hasColumn('tareas', 'fecha_programada')) {
            return ApiResponse::error('Si asignas hora programada, debes tener fecha_programada', null, 422);
        }

        if ($finalIni && $finalFin && $finalFin <= $finalIni) {
            return ApiResponse::error('La hora_fin_programada debe ser mayor a hora_inicio_programada', null, 422);
        }

        $tarea->update($data);

        return ApiResponse::success($tarea->fresh(), 'Tarea actualizada correctamente');
    }

    public function destroy(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // ✅ bloqueada: no se elimina
        if ($this->isLocked($tarea)) {
            return ApiResponse::error('Tarea bloqueada. No se puede eliminar.', null, 409);
        }

        $tarea->delete();

        return ApiResponse::success(null, 'Tarea eliminada correctamente');
    }

    public function misTareas(Request $request)
{
    $user = $request->user();

    // ✅ evita 500 si no hay sesión/token válido
    if (!$user) {
        return ApiResponse::error('No autenticado', null, 401);
    }

    // ✅ valida fechas si vienen (evita errores en applyFilters)
    $from = $request->query('fecha_from');
    $to   = $request->query('fecha_to');

    try {
        if ($from) Carbon::createFromFormat('Y-m-d', $from);
        if ($to) Carbon::createFromFormat('Y-m-d', $to);
    } catch (\Throwable $e) {
        return ApiResponse::error('Formato de fecha inválido. Usa YYYY-MM-DD', null, 422);
    }

    $query = Tarea::query()->where('usuario_id', $user->id);

    // Si tu applyFilters ya hace esto, igual no pasa nada; si no, acá queda seguro:
    if ($from && $to && Schema::hasColumn('tareas', 'fecha_programada')) {
        $query->whereBetween('fecha_programada', [$from, $to]);
    }

    // Tus helpers
    $this->applyFilters($request, $query);
    $this->applyOrderByProgramacion($query);

    $perPage = (int) $request->input('per_page', 10);
    $perPage = max(1, min($perPage, 500));

    $tareas = $query->paginate($perPage);

    return ApiResponse::success($tareas, 'Mis tareas');
}


    public function cambiarEstado(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // ✅ si está bloqueada, no cambiar estado (excepto admin revisión lo haremos aparte)
        if ($this->isLocked($tarea)) {
            return ApiResponse::error('Tarea bloqueada. No se puede cambiar estado.', null, 409);
        }

        $data = $request->validate([
            'estado_id' => ['required', 'integer', 'exists:tarea_estados,id'],
            'nota' => ['nullable', 'string', 'max:500'],
        ]);

        if (Schema::hasColumn('tareas', 'estado_id')) {
            $tarea->estado_id = (int) $data['estado_id'];
            $tarea->save();
        }

        DB::table('tarea_historial_estados')->insert([
            'tarea_id' => $tarea->id,
            'estado_id' => (int) $data['estado_id'],
            'usuario_id' => $request->user()->id,
            'nota' => $data['nota'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ApiResponse::success($tarea->fresh(), 'Estado actualizado');
    }

    public function historialEstados(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $historial = DB::table('tarea_historial_estados')
            ->where('tarea_id', $tarea->id)
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($historial, 'Historial de estados');
    }

    // =========================
    // Archivos (Evidencias)
    // =========================

    public function listarArchivos(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $rows = DB::table('tarea_archivos')
            ->where('tarea_id', $tarea->id)
            ->orderByDesc('id')
            ->get()
            ->map(function ($r) {
                $r->url = asset('storage/' . ltrim($r->ruta, '/'));
                return $r;
            });

        return ApiResponse::success($rows, 'Archivos de la tarea');
    }

    public function subirArchivos(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        if ($this->isLocked($tarea)) {
            return ApiResponse::error('La tarea está bloqueada. No se pueden subir evidencias.', null, 409);
        }

        $data = $request->validate([
            'archivos' => ['required', 'array', 'max:6'],
            'archivos.*' => ['file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf'],
        ]);

        $saved = [];

        foreach ($data['archivos'] as $file) {
            $safeName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs("tareas/{$tarea->id}", $safeName, 'public');

            $id = DB::table('tarea_archivos')->insertGetId([
                'tarea_id' => $tarea->id,
                'ruta' => $path,
                'nombre_original' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('tarea_archivos')->where('id', $id)->first();
            $row->url = asset('storage/' . ltrim($row->ruta, '/'));
            $saved[] = $row;
        }

        return ApiResponse::success($saved, 'Evidencias subidas', 201);
    }

    // =========================
    // Enviar (Finalizar + Bloquear)
    // =========================

    public function enviar(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        if ($this->isLocked($tarea)) {
            return ApiResponse::error('La tarea ya fue enviada y está bloqueada.', null, 409);
        }

        $data = $request->validate([
            'comentario_cierre' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $hasEvidence = DB::table('tarea_archivos')->where('tarea_id', $tarea->id)->exists();
        if (!$hasEvidence) {
            return ApiResponse::error('Debes adjuntar al menos una evidencia antes de enviar.', null, 422);
        }

        DB::transaction(function () use ($tarea, $data) {
            if (Schema::hasColumn('tareas', 'hora_fin_real') && empty($tarea->hora_fin_real)) {
                $tarea->hora_fin_real = now()->format('H:i:s');
            }

            if (Schema::hasColumn('tareas', 'comentario_cierre')) {
                $tarea->comentario_cierre = $data['comentario_cierre'];
            }
            if (Schema::hasColumn('tareas', 'enviada_en')) {
                $tarea->enviada_en = now();
            }

            if (Schema::hasColumn('tareas', 'estado_id')) {
                $enviadaId = DB::table('tarea_estados')->where('nombre', 'enviada')->value('id');
                if ($enviadaId) {
                    $tarea->estado_id = $enviadaId;

                    DB::table('tarea_historial_estados')->insert([
                        'tarea_id' => $tarea->id,
                        'estado_id' => $enviadaId,
                        'usuario_id' => auth()->id(),
                        'nota' => 'Enviada por el trabajador',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $tarea->save();
        });

        return ApiResponse::success($tarea->fresh(), 'Tarea enviada y bloqueada');
    }








    
    // =========================
// ✅ LIVE: ver quién está trabajando (Admin/Supervisor)
// =========================
        public function live(Request $request)
        {
            $auth = $request->user();
            if (!$this->isAdminOrSupervisor($auth)) {
                return ApiResponse::error('No autorizado', null, 403);
            }

            $now = now();
            $tz  = config('app.timezone') ?: 'UTC';

            $hasStartAt   = Schema::hasColumn('tareas', 'inicio_real_at');
            $hasEndAt     = Schema::hasColumn('tareas', 'fin_real_at');
            $hasStartTime = Schema::hasColumn('tareas', 'hora_inicio_real');
            $hasEndTime   = Schema::hasColumn('tareas', 'hora_fin_real');

            $q = Tarea::query()->with(['usuario:id,name,email']);

            // evita mostrar tareas bloqueadas (enviada/completada/incompleta)
            if (Schema::hasColumn('tareas', 'estado_id')) {
                $lockedIds = DB::table('tarea_estados')
                    ->whereIn('nombre', ['enviada', 'completada', 'incompleta'])
                    ->pluck('id')
                    ->all();

                if (!empty($lockedIds)) $q->whereNotIn('estado_id', $lockedIds);
            }

            // Solo “activas”: iniciadas y no finalizadas
            if ($hasStartAt) $q->whereNotNull('inicio_real_at');
            elseif ($hasStartTime) $q->whereNotNull('hora_inicio_real');

            if ($hasEndAt) $q->whereNull('fin_real_at');
            elseif ($hasEndTime) $q->whereNull('hora_fin_real');

            // evita basura vieja
            $q->where('created_at', '>=', $now->copy()->subDays(2));

            $rows = $q->orderByDesc('id')->limit(200)->get();

            $items = $rows->map(function ($t) use ($now, $tz, $hasStartAt, $hasEndAt, $hasStartTime, $hasEndTime) {
                $fecha = (Schema::hasColumn('tareas', 'fecha_programada') && $t->fecha_programada)
                    ? $t->fecha_programada
                    : optional($t->created_at)->toDateString();

                $hiniProg = $this->normalizeTime($t->hora_inicio_programada ?? null);
                $hfinProg = $this->normalizeTime($t->hora_fin_programada ?? null);

                // base programada
                $scheduledStart = ($fecha && $hiniProg)
                    ? Carbon::createFromFormat('Y-m-d H:i:s', "{$fecha} {$hiniProg}", $tz)
                    : (optional($t->created_at) ?? $now);

                $scheduledEnd = null;
                if ($fecha && $hfinProg) {
                    $scheduledEnd = Carbon::createFromFormat('Y-m-d H:i:s', "{$fecha} {$hfinProg}", $tz);
                    if ($scheduledEnd->lte($scheduledStart)) $scheduledEnd->addDay(); // por si cruza medianoche
                }

                // inicio real
                $realStart = null;
                if ($hasStartAt && !empty($t->inicio_real_at)) {
                    $realStart = Carbon::parse($t->inicio_real_at);
                } elseif ($hasStartTime && !empty($t->hora_inicio_real) && $fecha) {
                    $rs = $this->normalizeTime($t->hora_inicio_real);
                    $realStart = Carbon::createFromFormat('Y-m-d H:i:s', "{$fecha} {$rs}", $tz);
                } else {
                    $realStart = $scheduledStart;
                }

                // fin real
                $realEnd = null;
                if ($hasEndAt && !empty($t->fin_real_at)) {
                    $realEnd = Carbon::parse($t->fin_real_at);
                } elseif ($hasEndTime && !empty($t->hora_fin_real) && $fecha) {
                    $re = $this->normalizeTime($t->hora_fin_real);
                    $realEnd = Carbon::createFromFormat('Y-m-d H:i:s', "{$fecha} {$re}", $tz);
                }

                $elapsed = max(0, $now->diffInSeconds($realStart, false)); // ahora - inicio
                $total   = $scheduledEnd ? max(1, $scheduledEnd->diffInSeconds($scheduledStart)) : 0;

                $progress = $total > 0 ? (int) round(min(100, max(0, ($elapsed / $total) * 100))) : null;

                return [
                    'id' => $t->id,
                    'titulo' => $t->titulo,
                    'descripcion' => $t->descripcion,
                    'usuario' => $t->usuario ? [
                        'id' => $t->usuario->id,
                        'name' => $t->usuario->name,
                        'email' => $t->usuario->email,
                    ] : null,

                    'fecha_programada' => $t->fecha_programada ?? null,
                    'hora_inicio_programada' => $t->hora_inicio_programada ?? null,
                    'hora_fin_programada' => $t->hora_fin_programada ?? null,

                    'hora_inicio_real' => $t->hora_inicio_real ?? null,
                    'hora_fin_real' => $t->hora_fin_real ?? null,
                    'inicio_real_at' => $t->inicio_real_at ?? null,
                    'fin_real_at' => $t->fin_real_at ?? null,

                    'elapsed_seconds' => $elapsed,
                    'total_seconds' => $total,
                    'progress_percent' => $progress,
                ];
            });

            return ApiResponse::success($items, 'Live');
        }

        // =========================
        // ✅ INICIAR tarea (pone hora_inicio_real / inicio_real_at)
        // =========================
        public function iniciar(Request $request, Tarea $tarea)
        {
            if (!$this->canAccessTarea($request->user(), $tarea)) {
                return ApiResponse::error('No autorizado', null, 403);
            }
            if ($this->isLocked($tarea)) {
                return ApiResponse::error('Tarea bloqueada. No se puede iniciar.', null, 409);
            }

            $now = now();
            $changed = false;

            if (Schema::hasColumn('tareas', 'hora_inicio_real') && empty($tarea->hora_inicio_real)) {
                $tarea->hora_inicio_real = $now->format('H:i:s');
                $changed = true;
            }
            if (Schema::hasColumn('tareas', 'inicio_real_at') && empty($tarea->inicio_real_at)) {
                $tarea->inicio_real_at = $now;
                $changed = true;
            }

            // estado “en_progreso” si existe
            if (Schema::hasColumn('tareas', 'estado_id')) {
                $enProgresoId = DB::table('tarea_estados')
                    ->whereIn('nombre', ['en_progreso', 'en progreso', 'en-progreso'])
                    ->value('id');
                if ($enProgresoId) $tarea->estado_id = $enProgresoId;
            }

            if ($changed) $tarea->save();

            return ApiResponse::success($tarea->fresh(), $changed ? 'Tarea iniciada' : 'La tarea ya estaba iniciada');
        }

        // =========================
        // ✅ FINALIZAR tarea (pone hora_fin_real / fin_real_at)
        // =========================
        public function finalizar(Request $request, Tarea $tarea)
        {
            if (!$this->canAccessTarea($request->user(), $tarea)) {
                return ApiResponse::error('No autorizado', null, 403);
            }
            if ($this->isLocked($tarea)) {
                return ApiResponse::error('Tarea bloqueada. No se puede finalizar.', null, 409);
            }

            $now = now();
            $changed = false;

            if (Schema::hasColumn('tareas', 'hora_fin_real') && empty($tarea->hora_fin_real)) {
                $tarea->hora_fin_real = $now->format('H:i:s');
                $changed = true;
            }
            if (Schema::hasColumn('tareas', 'fin_real_at') && empty($tarea->fin_real_at)) {
                $tarea->fin_real_at = $now;
                $changed = true;
            }

            if ($changed) $tarea->save();

            return ApiResponse::success($tarea->fresh(), $changed ? 'Tarea finalizada' : 'La tarea ya estaba finalizada');
        }

}
