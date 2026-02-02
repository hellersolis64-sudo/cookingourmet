<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));

/**
 * ✅ FIX: evita "Route [login] not defined" cuando sanctum/auth redirige.
 * Esto es WEB.
 */
Route::get('/login', fn () => response()->json([
    'success' => false,
    'message' => 'No autenticado',
], 401))->name('login');
