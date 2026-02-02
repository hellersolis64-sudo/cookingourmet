<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireAttendanceAccess
{
  public function handle(Request $request, Closure $next)
  {
    $mode = $request->attributes->get('access_mode', 'viewer');

    if (!in_array($mode, ['full', 'temp_full'], true)) {
      return response()->json([
        'success' => false,
        'message' => 'Modo visor: no tienes actividad programada para marcar asistencia fuera de la institución.',
        'data' => ['mode' => $mode],
      ], 403);
    }

    return $next($request);
  }
}
