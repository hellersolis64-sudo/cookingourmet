<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireFullOrTempAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // ✅ Admin/Supervisor NO se bloquean por modo visor
        if ($user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'supervisor'])) {
            return $next($request);
        }

        $mode = $request->attributes->get('access_mode', 'viewer');

        if (!in_array($mode, ['full', 'temp_full'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Modo visor: no tienes permiso para realizar cambios fuera de la institución.',
                'data' => ['mode' => $mode],
            ], 403);
        }

        return $next($request);
    }
}
