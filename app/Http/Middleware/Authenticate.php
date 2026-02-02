<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request): ?string
    {
        // Si es API o espera JSON, NO redirigir (que devuelva 401)
        if ($request->is('api/*') || $request->expectsJson()) {
            return null;
        }

        return '/login';
    }
}
