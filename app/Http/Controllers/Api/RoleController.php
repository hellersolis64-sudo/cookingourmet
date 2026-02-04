<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Rol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * GET /api/roles
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->input('q', ''));

        $roles = Rol::query()
            ->select(['id', 'nombre', 'descripcion', 'created_at', 'updated_at'])
            ->when($q !== '', function ($w) use ($q) {
                $w->where('nombre', 'like', "%{$q}%")
                  ->orWhere('descripcion', 'like', "%{$q}%");
            })
            ->orderBy('nombre')
            ->get();

        return ApiResponse::success($roles, 'Roles');
    }

    /**
     * POST /api/roles
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:60', 'regex:/^[a-zA-Z0-9_\-\s]+$/', 'unique:roles,nombre'],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ], [
            'nombre.regex' => 'El nombre solo puede tener letras, números, espacios, guiones o underscore.',
        ]);

        $role = Rol::create([
            'nombre' => trim($data['nombre']),
            'descripcion' => $data['descripcion'] ?? null,
        ]);

        return ApiResponse::success($role, 'Rol creado', 201);
    }

    /**
     * PUT /api/roles/{id}
     */
    public function update(Request $request, $id)
    {
        $role = Rol::find($id);
        if (!$role) return ApiResponse::error('Rol no existe', null, 404);

        $data = $request->validate([
            'nombre' => [
                'required', 'string', 'max:60', 'regex:/^[a-zA-Z0-9_\-\s]+$/',
                Rule::unique('roles', 'nombre')->ignore($role->id),
            ],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ], [
            'nombre.regex' => 'El nombre solo puede tener letras, números, espacios, guiones o underscore.',
        ]);

        $role->update([
            'nombre' => trim($data['nombre']),
            'descripcion' => $data['descripcion'] ?? null,
        ]);

        return ApiResponse::success($role->fresh(), 'Rol actualizado');
    }

    /**
     * DELETE /api/roles/{id}
     */
    public function destroy($id)
    {
        $role = Rol::find($id);
        if (!$role) return ApiResponse::error('Rol no existe', null, 404);

        // ✅ Protege roles base
        $protected = ['admin', 'supervisor'];
        if (in_array(strtolower((string) $role->nombre), $protected, true)) {
            return ApiResponse::error('No puedes eliminar este rol', null, 409);
        }

        // ✅ No borrar si está asignado
        $assigned = DB::table('usuario_roles')->where('role_id', $role->id)->exists();
        if ($assigned) {
            return ApiResponse::error('No puedes eliminar: rol asignado a usuarios', null, 409);
        }

        $role->delete();

        return ApiResponse::success(['id' => (int) $id], 'Rol eliminado');
    }
}
