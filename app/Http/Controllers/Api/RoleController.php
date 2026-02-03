<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rol;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Rol::query()
            ->select(['id', 'nombre'])
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Roles',
            'data' => $roles,
        ]);
    }
}
