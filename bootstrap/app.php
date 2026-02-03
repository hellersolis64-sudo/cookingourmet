<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // ✅ Registro de Aliases
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'resolve.access' => \App\Http\Middleware\ResolveAccessMode::class,
            'require.attendance' => \App\Http\Middleware\RequireAttendanceAccess::class,
            'require.full' => \App\Http\Middleware\RequireFullOrTempAccess::class, // ✅ NUEVO
        ]);

        // ✅ Configuración de Seguridad
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // ✅ Configuración del stack API
        $middleware->api(prepend: [
            'throttle:api',
        ]);

        // ✅ CORS global (ForceCors debe ir primero para que se aplique al final en la respuesta)
        $middleware->append(\App\Http\Middleware\ForceCors::class);
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);


    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
