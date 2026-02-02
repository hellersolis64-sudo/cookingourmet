<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ScheduleArchivoController extends Controller
{
    private function isAdminOrSupervisor($user): bool
    {
        return $user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'supervisor']);
    }

    private function canAccessSchedule($user, object $schedule): bool
    {
        return $this->isAdminOrSupervisor($user) || ($user && (int)$schedule->usuario_id === (int)$user->id);
    }

    private function findSchedule(int $id): ?object
    {
        return DB::table('user_schedules')->where('id', $id)->first();
    }

    /**
     * GET /api/schedules/{id}/archivos
     */
    public function index(Request $request, int $id)
    {
        $schedule = $this->findSchedule($id);
        if (!$schedule) return ApiResponse::error('Schedule no encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $schedule)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $perPage = min((int) $request->input('per_page', 10), 50);

        $data = DB::table('schedule_archivos')
            ->where('schedule_id', $id)
            ->orderByDesc('id')
            ->paginate($perPage);

        $data->getCollection()->transform(function ($row) {
            $row->url = Storage::disk('public')->url($row->ruta);
            return $row;
        });

        return ApiResponse::success($data, 'Archivos del schedule');
    }

    /**
     * POST /api/schedules/{id}/archivos
     * multipart/form-data
     * - archivo (1)
     * - o files[] (varios)
     */
    public function store(Request $request, int $id)
    {
        $schedule = $this->findSchedule($id);
        if (!$schedule) return ApiResponse::error('Schedule no encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $schedule)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $request->validate([
            'archivo' => ['nullable', 'file', 'max:10240'], // 10MB
            'files.*' => ['nullable', 'file', 'max:10240'],
        ]);

        $files = [];

        if ($request->hasFile('archivo')) {
            $files[] = $request->file('archivo');
        }
        if ($request->hasFile('files')) {
            $files = array_merge($files, $request->file('files'));
        }

        if (empty($files)) {
            return ApiResponse::error('Debes enviar archivo o files[]', null, 422);
        }

        $inserted = [];

        foreach ($files as $file) {
            if (!$file->isValid()) continue;

            // Guardar en disk public: storage/app/public/schedules/{id}/...
            $storedPath = $file->store("schedules/{$id}", 'public');

            $newId = DB::table('schedule_archivos')->insertGetId([
                'schedule_id' => $id,
                'ruta' => $storedPath,
                'nombre_original' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType() ?? 'application/octet-stream',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('schedule_archivos')->where('id', $newId)->first();
            $row->url = Storage::disk('public')->url($row->ruta);
            $inserted[] = $row;
        }

        return ApiResponse::success($inserted, 'Archivo(s) subido(s)', 201);
    }

    /**
     * GET /api/schedule-archivos/{archivo}/download
     */
    public function download(Request $request, int $archivo)
    {
        $row = DB::table('schedule_archivos')->where('id', $archivo)->first();
        if (!$row) return ApiResponse::error('Archivo no encontrado', null, 404);

        $schedule = $this->findSchedule((int)$row->schedule_id);
        if (!$schedule) return ApiResponse::error('Schedule no encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $schedule)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        if (empty($row->ruta) || !Storage::disk('public')->exists($row->ruta)) {
            return ApiResponse::error('Archivo físico no encontrado', null, 404);
        }

        $filename = $row->nombre_original ?: basename($row->ruta);

        return Storage::disk('public')->download($row->ruta, $filename);
    }

    /**
     * DELETE /api/schedule-archivos/{archivo}
     */
    public function destroy(Request $request, int $archivo)
    {
        $row = DB::table('schedule_archivos')->where('id', $archivo)->first();
        if (!$row) return ApiResponse::error('Archivo no encontrado', null, 404);

        $schedule = $this->findSchedule((int)$row->schedule_id);
        if (!$schedule) return ApiResponse::error('Schedule no encontrado', null, 404);

        if (!$this->canAccessSchedule($request->user(), $schedule)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        if (!empty($row->ruta)) {
            Storage::disk('public')->delete($row->ruta);
        }

        DB::table('schedule_archivos')->where('id', $archivo)->delete();

        return ApiResponse::success(null, 'Archivo eliminado');
    }
}
