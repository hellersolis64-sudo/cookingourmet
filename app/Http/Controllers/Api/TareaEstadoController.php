<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Support\Facades\DB;

class TareaEstadoController extends Controller
{
    public function index()
    {
        // Devuelve lista simple para frontend (id, nombre/slug si existen)
        $estados = DB::table('tarea_estados')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($estados, 'Estados de tarea');
    }
}
