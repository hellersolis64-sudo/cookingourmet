<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceCors
{
    private function allowedOrigins(): array
    {
        return array_values(array_filter([
            env('FRONTEND_URL'),
            'http://localhost:5173',
        ]));
    }

    private function resolveOrigin(?string $origin): ?string
    {
        if (!$origin) return env('FRONTEND_URL') ?: null;

        $allowed = $this->allowedOrigins();
        return in_array($origin, $allowed, true) ? $origin : (env('FRONTEND_URL') ?: null);
    }

    private function applyCors($response, ?string $origin): void
    {
        if ($origin) {
            // ✅ fuerza el origin correcto (sobreescribe el que haya)
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Vary', 'Origin');
        }

        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-TOKEN');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Max-Age', '86400');
    }

    public function handle(Request $request, Closure $next)
    {
        $origin = $request->headers->get('Origin');
        $chosen = $this->resolveOrigin($origin);

        // ✅ Preflight
        if ($request->isMethod('OPTIONS')) {
            $resp = response('', 204);
            $this->applyCors($resp, $chosen);
            return $resp;
        }

        $response = $next($request);

        // ✅ Para API aplica siempre
        if ($request->is('api/*')) {
            $this->applyCors($response, $chosen);
        }

        return $response;
    }
}
