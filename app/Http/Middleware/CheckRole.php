<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$allowedRoles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado'
            ], 401);
        }

        if (empty($allowedRoles)) {
            return $next($request);
        }

        $allowedRoles = array_map(
            fn ($r) => strtolower($r),
            $allowedRoles
        );

        $userRoles = DB::table('usuario_roles as ur')
            ->join('roles as r', 'r.id', '=', 'ur.rol_id') // ✅ CORRECTO
            ->where('ur.usuario_id', $user->id)
            ->pluck('r.nombre')
            ->map(fn ($r) => strtolower($r))
            ->values()
            ->all();

        if (empty(array_intersect($allowedRoles, $userRoles))) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado'
            ], 403);
        }

        return $next($request);
    }
}
