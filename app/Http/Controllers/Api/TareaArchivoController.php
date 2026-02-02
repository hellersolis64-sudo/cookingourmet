<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Tarea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TareaArchivoController extends Controller
{
    private function isAdminOrSupervisor($user): bool
    {
        return $user && $user->hasAnyRole(['admin', 'supervisor']);
    }

    private function canAccessTarea($user, Tarea $tarea): bool
    {
        return $this->isAdminOrSupervisor($user) || ($user && $tarea->usuario_id === $user->id);
    }

    /**
     * GET /api/tareas/{tarea}/archivos
     */
    public function index(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $perPage = min((int) $request->input('per_page', 10), 50);

        $data = DB::table('tarea_archivos')
            ->where('tarea_id', $tarea->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        // Adjuntamos URL pública para ver/descargar (si tienes storage:link)
        $data->getCollection()->transform(function ($row) {
            $row->url = Storage::disk('public')->url($row->ruta);
            return $row;
        });

        return ApiResponse::success($data, 'Archivos de la tarea');
    }

    /**
     * POST /api/tareas/{tarea}/archivos
     * multipart/form-data
     * - archivo (1)
     * - o files[] (varios)
     */
    public function store(Request $request, Tarea $tarea)
    {
        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        // Validación base
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

            // Guardar en disk public: storage/app/public/tareas/{id}/...
            $storedPath = $file->store("tareas/{$tarea->id}", 'public');

            $id = DB::table('tarea_archivos')->insertGetId([
                'tarea_id' => $tarea->id,
                'ruta' => $storedPath,
                'nombre_original' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType() ?? 'application/octet-stream',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('tarea_archivos')->where('id', $id)->first();
            $row->url = Storage::disk('public')->url($row->ruta);
            $inserted[] = $row;
        }

        return ApiResponse::success($inserted, 'Archivo(s) subido(s)', 201);
    }

    /**
     * GET /api/tarea-archivos/{archivo}/download
     */
    public function download(Request $request, int $archivo)
    {
        $row = DB::table('tarea_archivos')->where('id', $archivo)->first();
        if (!$row) return ApiResponse::error('Archivo no encontrado', null, 404);

        $tarea = Tarea::find($row->tarea_id);
        if (!$tarea) return ApiResponse::error('Tarea no encontrada', null, 404);

        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        if (empty($row->ruta) || !Storage::disk('public')->exists($row->ruta)) {
            return ApiResponse::error('Archivo físico no encontrado', null, 404);
        }

        $filename = $row->nombre_original ?: basename($row->ruta);

        return Storage::disk('public')->download($row->ruta, $filename);
    }

    /**
     * DELETE /api/tarea-archivos/{archivo}
     */
    public function destroy(Request $request, int $archivo)
    {
        $row = DB::table('tarea_archivos')->where('id', $archivo)->first();
        if (!$row) return ApiResponse::error('Archivo no encontrado', null, 404);

        $tarea = Tarea::find($row->tarea_id);
        if (!$tarea) return ApiResponse::error('Tarea no encontrada', null, 404);

        if (!$this->canAccessTarea($request->user(), $tarea)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        if (!empty($row->ruta)) {
            Storage::disk('public')->delete($row->ruta);
        }

        DB::table('tarea_archivos')->where('id', $archivo)->delete();

        return ApiResponse::success(null, 'Archivo eliminado');
    }
}
