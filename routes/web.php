<?php

use Illuminate\Support\Facades\Route;

// Home del backend (API). Ya no mostramos la vista welcome.
Route::get('/', fn () => response()->json([
    'success' => true,
    'app' => 'cookingourmet api',
]));

/**
 * ✅ FIX: evita "Route [login] not defined" cuando sanctum/auth redirige.
 * Esto es WEB.
 */
Route::get('/login', fn () => response()->json([
    'success' => false,
    'message' => 'No autenticado',
], 401))->name('login');
