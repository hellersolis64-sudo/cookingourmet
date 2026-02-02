<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Tarea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Carbon;

class SolicitudExtensionController extends Controller
{
    private function isAdminOrSupervisor($user): bool
    {
        return $user && $user->hasAnyRole(['admin', 'supervisor']);
    }

    private function canAccessTarea($user, Tarea $tarea): bool
    {
        return $this->isAdminOrSupervisor($user) || ($user && $tarea->usuario_id === $user->id);
    }

    private function normalizeTime(?string $time): ?string
    {
        if (!$time) return null;
        $t = trim($time);
        return (strlen($t) === 5) ? ($t . ':00') : $t; // HH:mm => HH:mm:ss
    }

    /**
     * Valida HH:mm o HH:mm:ss y además que sea una hora real (00-23, 00-59, 00-59)
     */
    private function validateFlexibleTime(string $attr, $value, $fail): void
    {
        $v = is_string($value) ? trim($value) : '';

        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $v)) {
            $fail("El campo {$attr} debe tener formato HH:mm o HH:mm:ss.");
            return;
        }

        $t = $this->normalizeTime($v);

        try {
            Carbon::createFromFormat('H:i:s', $t);
        } catch (\Throwable $e) {
            $fail("El campo {$attr} no es una hora válida.");
        }
    }

    /**
     * POST /api/solicitudes-extension
     * Crea solicitud para extender la HORA FIN PROGRAMADA
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::error('No autenticado', null, 401);
        }

        $data = $request->validate([
            'tarea_id' => ['required', 'integer', 'exists:tareas,id'],
            'hora_fin_solicitada' => [
                'required',
                function ($attr, $value, $fail) {
                    $this->validateFlexibleTime($attr, $value, $fail);
                },
            ],
            'motivo' => ['nullable', 'string'],
        ]);

        $tarea = Tarea::findOrFail($data['tarea_id']);

        // 1) Permisos
        if (!$this->canAccessTarea($user, $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // 2) Evitar múltiples pendientes
        $yaHayPendiente = DB::table('solicitudes_extension')
            ->where('tarea_id', $tarea->id)
            ->where('estado', 'pendiente')
            ->exists();

        if ($yaHayPendiente) {
            return ApiResponse::error('Ya existe una solicitud pendiente para esta tarea', null, 409);
        }

        // 3) hora_fin_original debe venir de hora_fin_programada
        $horaOriginal = null;

        if (Schema::hasColumn('tareas', 'hora_fin_programada') && !empty($tarea->hora_fin_programada)) {
            $horaOriginal = $this->normalizeTime($tarea->hora_fin_programada);
        }

        // Si por algún motivo no hay hora fin programada, fallback a hora actual
        if (!$horaOriginal) {
            $horaOriginal = now()->format('H:i:s');
        }

        $horaSolicitada = $this->normalizeTime($data['hora_fin_solicitada']);

        // Validar que solicitada sea mayor a original (usando Carbon, no string)
        try {
            $orig = Carbon::createFromFormat('H:i:s', $horaOriginal);
            $sol  = Carbon::createFromFormat('H:i:s', $horaSolicitada);

            if ($sol->lte($orig)) {
                return ApiResponse::error('La hora fin solicitada debe ser mayor a la hora fin original', null, 422);
            }
        } catch (\Throwable $e) {
            return ApiResponse::error('Hora inválida en comparación', null, 422);
        }

        // 4) Insert
        $id = DB::table('solicitudes_extension')->insertGetId([
            'tarea_id'            => $tarea->id,
            'usuario_id'          => $user->id,
            'hora_fin_original'   => $horaOriginal,
            'hora_fin_solicitada' => $horaSolicitada,
            'hora_fin_aprobada'   => null,
            'motivo'              => $data['motivo'] ?? null,
            'estado'              => 'pendiente',
            'aprobado_por'        => null,
            'aprobado_en'         => null,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        $row = DB::table('solicitudes_extension')->where('id', $id)->first();

        return ApiResponse::success($row, 'Solicitud de extensión creada', 201);
    }

    /**
     * PUT /api/extensiones/{solicitud}/aprobar
     * Aprueba y actualiza hora_fin_programada en tareas
     */
    public function aprobar(Request $request, int $solicitud)
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::error('No autenticado', null, 401);
        }

        if (!$this->isAdminOrSupervisor($user)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $row = DB::table('solicitudes_extension')->where('id', $solicitud)->first();
        if (!$row) return ApiResponse::error('Solicitud no encontrada', null, 404);

        if ($row->estado !== 'pendiente') {
            return ApiResponse::error('La solicitud ya fue resuelta', null, 409);
        }

        $data = $request->validate([
            'hora_fin_aprobada' => [
                'nullable',
                function ($attr, $value, $fail) {
                    if ($value === null || $value === '') return;
                    $this->validateFlexibleTime($attr, $value, $fail);
                },
            ],
        ]);

        $horaAprobada = $this->normalizeTime($data['hora_fin_aprobada'] ?? $row->hora_fin_solicitada);

        // validar que aprobada sea mayor a original
        try {
            $orig = Carbon::createFromFormat('H:i:s', (string) $row->hora_fin_original);
            $apr  = Carbon::createFromFormat('H:i:s', (string) $horaAprobada);

            if ($apr->lte($orig)) {
                return ApiResponse::error('La hora fin aprobada debe ser mayor a la hora fin original', null, 422);
            }
        } catch (\Throwable $e) {
            return ApiResponse::error('Hora inválida en comparación', null, 422);
        }

        DB::transaction(function () use ($solicitud, $row, $horaAprobada, $user) {

            // 1) Actualizar solicitud
            DB::table('solicitudes_extension')->where('id', $solicitud)->update([
                'estado'             => 'aprobado',
                'hora_fin_aprobada'  => $horaAprobada,
                'aprobado_por'       => $user->id,
                'aprobado_en'        => now(),
                'updated_at'         => now(),
            ]);

            // 2) Actualizar tarea: hora_fin_programada (NO real)
            if (Schema::hasColumn('tareas', 'hora_fin_programada')) {
                DB::table('tareas')->where('id', $row->tarea_id)->update([
                    'hora_fin_programada' => $horaAprobada,
                    'updated_at' => now(),
                ]);
            }
        });

        $updated = DB::table('solicitudes_extension')->where('id', $solicitud)->first();

        return ApiResponse::success($updated, 'Solicitud aprobada');
    }

    /**
     * PUT /api/extensiones/{solicitud}/rechazar
     */
    public function rechazar(Request $request, int $solicitud)
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::error('No autenticado', null, 401);
        }

        if (!$this->isAdminOrSupervisor($user)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $row = DB::table('solicitudes_extension')->where('id', $solicitud)->first();
        if (!$row) return ApiResponse::error('Solicitud no encontrada', null, 404);

        if ($row->estado !== 'pendiente') {
            return ApiResponse::error('La solicitud ya fue resuelta', null, 409);
        }

        DB::table('solicitudes_extension')->where('id', $solicitud)->update([
            'estado'            => 'rechazado',
            'hora_fin_aprobada' => null,
            'aprobado_por'      => $user->id,
            'aprobado_en'       => now(),
            'updated_at'        => now(),
        ]);

        $updated = DB::table('solicitudes_extension')->where('id', $solicitud)->first();

        return ApiResponse::success($updated, 'Solicitud rechazada');
    }
}
