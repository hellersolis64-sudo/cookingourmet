<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TareaController;
use App\Http\Controllers\Api\TareaEstadoController;
use App\Http\Controllers\Api\AsistenciaController;
use App\Http\Controllers\Api\SolicitudExtensionController;
use App\Http\Controllers\Api\SolicitudExtensionQueryController;
use App\Http\Controllers\Api\TareaArchivoController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController; // ✅ ACTIVADO
use App\Http\Controllers\Api\UserListController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\PresenceController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\ScheduleArchivoController; // ✅ NUEVO

/**
 * Rutas de la API - Proyecto PHP 8.2 / Laravel 12
 */
Route::middleware(['throttle:300,1'])->group(function () {

    // ✅ Preflight CORS
    Route::options('/{any}', fn () => response()->noContent(204))->where('any', '.*');

    // ✅ Health check público
    Route::get('/health', fn () => response()->json(['ok' => true]));

    // ---------------- PUBLIC ----------------
    Route::post('/login', [AuthController::class, 'login']);

    // ---------------- PROTECTED ----------------
    Route::middleware(['auth:sanctum', 'resolve.access'])->group(function () {

        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);

        // ✅ info de acceso para el frontend
        Route::get('/auth/access-mode', function (\Illuminate\Http\Request $request) {
            return response()->json([
                'success' => true,
                'message' => 'ok',
                'data' => [
                    'mode'       => $request->attributes->get('access_mode'),
                    'reason'     => $request->attributes->get('access_reason'),
                    'ip'         => $request->attributes->get('access_ip'),
                    'expires_at' => $request->attributes->get('access_expires_at'),
                ],
            ]);
        });

        // ================= ADMIN / SUPERVISOR =================
        Route::middleware('role:admin,supervisor')->group(function () {

            // ✅ Lectura
            Route::get('/usuarios', [UserController::class, 'index']);
            Route::get('/roles', [RoleController::class, 'index']);
            Route::get('/tareas', [TareaController::class, 'index']);
            Route::get('/usuarios/{usuario}/tareas', [TareaController::class, 'tareasPorUsuario'])->whereNumber('usuario');
            Route::get('/asistencias', [AsistenciaController::class, 'index']);
            Route::get('/extensiones', [SolicitudExtensionQueryController::class, 'index']);
            Route::get('/schedules', [ScheduleController::class, 'index']);

            // ✅ Escritura (Bloqueada si el modo de acceso es 'viewer')
            Route::middleware('require.full')->group(function () {
                Route::post('/usuarios', [UserController::class, 'store']);
                Route::put('/extensiones/{solicitud}/aprobar', [SolicitudExtensionController::class, 'aprobar']);
                Route::put('/extensiones/{solicitud}/rechazar', [SolicitudExtensionController::class, 'rechazar']);

                // ✅ Horarios
                Route::post('/schedules', [ScheduleController::class, 'store']);
                Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy'])->whereNumber('id');

                // ✅ Asistencias - ELIMINAR
                Route::delete('/asistencias/{id}', [AsistenciaController::class, 'destroy'])->whereNumber('id');
            });
        });
        ;

        // ================= EMPLEADO / ADMIN / SUPERVISOR =================
        Route::middleware('role:empleado,admin,supervisor')->group(function () {

            // --------- LECTURA (Acceso permitido a todos los modos) ---------
            Route::get('/usuarios-chat', [UserListController::class, 'index']);
            Route::get('/conversations', [ChatController::class, 'conversations']);
            Route::get('/conversations/{conversation}/messages', [ChatController::class, 'messages']);
            Route::get('/typing', [PresenceController::class, 'whoTyping']);

            Route::get('/tarea-estados', [TareaEstadoController::class, 'index']);
            Route::get('/mi/tareas', [TareaController::class, 'misTareas']);
            Route::get('/tareas/{tarea}/historial-estados', [TareaController::class, 'historialEstados'])->whereNumber('tarea');

            // ✅ Archivos tareas
            Route::get('/tareas/{tarea}/archivos', [TareaArchivoController::class, 'index'])->whereNumber('tarea');
            Route::get('/tarea-archivos/{archivo}/download', [TareaArchivoController::class, 'download'])->whereNumber('archivo');

            Route::get('/mi/asistencia/hoy', [AsistenciaController::class, 'miHoy']);
            Route::get('/mi/asistencia', [AsistenciaController::class, 'misRegistros']);

            Route::get('/mi/extensiones', [SolicitudExtensionQueryController::class, 'mine']);

            // ✅ Schedules (mis actividades)
            Route::get('/mi/schedules', [ScheduleController::class, 'my']);

            // ✅ Schedules archivos (lectura)
            Route::get('/schedules/{id}/archivos', [ScheduleArchivoController::class, 'index'])->whereNumber('id');
            Route::get('/schedule-archivos/{archivo}/download', [ScheduleArchivoController::class, 'download'])->whereNumber('archivo');

            // --------- ESCRITURA (Requiere modo FULL) ---------
            Route::middleware('require.full')->group(function () {

                // Chat / Presence
                Route::post('/conversations/direct', [ChatController::class, 'direct']);
                Route::post('/conversations/{conversation}/messages', [ChatController::class, 'send']);
                Route::post('/conversations/{conversation}/read', [ChatController::class, 'read']);
                Route::post('/presence/ping', [PresenceController::class, 'ping']);
                Route::post('/typing', [PresenceController::class, 'typing']);

                // Tareas
                Route::apiResource('tareas', TareaController::class)->except(['index']);
                Route::patch('/tareas/{tarea}/enviar', [TareaController::class, 'enviar'])->whereNumber('tarea');
                Route::patch('/tareas/{tarea}/estado', [TareaController::class, 'cambiarEstado'])->whereNumber('tarea');

                // Archivos tareas
                Route::post('/tareas/{tarea}/archivos', [TareaArchivoController::class, 'store'])->whereNumber('tarea');
                Route::delete('/tarea-archivos/{archivo}', [TareaArchivoController::class, 'destroy'])->whereNumber('archivo');

                // ✅ Schedules como tareas (acciones + evidencias)
                Route::put('/schedules/{id}', [ScheduleController::class, 'update'])->whereNumber('id');
                Route::patch('/schedules/{id}/enviar', [ScheduleController::class, 'enviar'])->whereNumber('id');

                // Archivos schedules
                Route::post('/schedules/{id}/archivos', [ScheduleArchivoController::class, 'store'])->whereNumber('id');
                Route::delete('/schedule-archivos/{archivo}', [ScheduleArchivoController::class, 'destroy'])->whereNumber('archivo');

                // Extensiones
                Route::post('/solicitudes-extension', [SolicitudExtensionController::class, 'store']);
            });

            // ✅ Asistencia (Escritura): Requiere FULL + Regla de Asistencia
            Route::middleware('require.attendance')->group(function () {
                Route::post('/asistencias/entrada', [AsistenciaController::class, 'entrada']);
                Route::post('/asistencias/salida', [AsistenciaController::class, 'salida']);
            });
        });
    });
});
