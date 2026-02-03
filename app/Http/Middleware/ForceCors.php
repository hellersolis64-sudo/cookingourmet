<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceCors
{
    private function allowedOrigins(): array
    {
        return array_values(array_filter([
            env('FRONTEND_URL'), // ✅ en Railway pon FRONTEND_URL=https://eloquent-recreation-production.up.railway.app
            'http://localhost:5173', // ✅ dev local
        ]));
    }

    private function pickOrigin(?string $origin): ?string
    {
        if (!$origin) return null;
        return in_array($origin, $this->allowedOrigins(), true) ? $origin : null;
    }

    public function handle(Request $request, Closure $next)
    {
        $origin = $request->headers->get('Origin');
        $allowOrigin = $this->pickOrigin($origin);

        // Preflight OPTIONS (antes de auth)
        if ($request->getMethod() === 'OPTIONS') {
            $resp = response('', 204)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Allow-Credentials', 'true');

            if ($allowOrigin) {
                $resp->headers->set('Access-Control-Allow-Origin', $allowOrigin);
                $resp->headers->set('Vary', 'Origin');
            }

            return $resp;
        }

        $response = $next($request);

        // Solo para API
        if ($request->is('api/*')) {
            if ($allowOrigin) {
                $response->headers->set('Access-Control-Allow-Origin', $allowOrigin);
                $response->headers->set('Vary', 'Origin');
            }

            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
