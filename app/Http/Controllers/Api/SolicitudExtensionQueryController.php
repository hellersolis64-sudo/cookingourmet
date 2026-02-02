<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SolicitudExtensionQueryController extends Controller
{
    // GET /api/extensiones?estado=&usuario_id=&from=&to=&per_page=
    public function index(Request $request)
    {
        $q = DB::table('solicitudes_extension');

        if ($request->filled('usuario_id')) $q->where('usuario_id', (int)$request->usuario_id);
        if ($request->filled('estado')) $q->where('estado', $request->input('estado'));

        if ($request->filled('from')) $q->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))   $q->whereDate('created_at', '<=', $request->input('to'));

        $q->orderByDesc('id');

        $perPage = min((int)$request->input('per_page', 10), 50);
        $data = $q->paginate($perPage);

        return ApiResponse::success($data, 'Extensiones');
    }

    // GET /api/mi/extensiones?from=&to=&per_page=
    public function mine(Request $request)
    {
        $u = $request->user();

        $q = DB::table('solicitudes_extension')
            ->where('usuario_id', $u->id);

        if ($request->filled('from')) $q->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))   $q->whereDate('created_at', '<=', $request->input('to'));

        $q->orderByDesc('id');

        $perPage = min((int)$request->input('per_page', 10), 50);
        $data = $q->paginate($perPage);

        return ApiResponse::success($data, 'Mis extensiones');
    }
}
