<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Rol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 100);

        $q = User::query()->select(['id','name','email','created_at']);

        if ($search !== '') {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $q->orderBy('name')->paginate(min(max($perPage, 1), 200));

        return response()->json([
            'success' => true,
            'message' => 'Lista de usuarios',
            'data' => $users,
        ]);
    }

    /**
     * POST /api/usuarios
     * Body: { name, email, password, rol }
     */
    public function store(Request $request)
{
    // puede venir por nombre o por id
    $roleName = $request->input('rol') ?? $request->input('role');
    $roleId   = $request->input('rol_id') ?? $request->input('role_id');

    // normalizamos nombre si vino
    if (is_string($roleName)) {
        $roleName = strtolower(trim($roleName));
    } else {
        $roleName = null;
    }

    $data = $request->validate([
        'name'     => ['required', 'string', 'max:120'],
        'email'    => ['required', 'email', 'max:190', Rule::unique('users', 'email')],
        'password' => ['required', 'string', 'min:6'],

        // aceptamos rol por nombre o por id
        'rol'      => ['nullable', 'string'],
        'role'     => ['nullable', 'string'],
        'rol_id'   => ['nullable', 'integer'],
        'role_id'  => ['nullable', 'integer'],
    ]);

    // Validación final del rol
    if (!$roleId && !$roleName) {
        return response()->json([
            'success' => false,
            'message' => 'El rol es requerido',
            'errors' => ['rol' => ['El rol es requerido.']],
        ], 422);
    }

    if ($roleName && !in_array($roleName, ['admin','supervisor','empleado','estudiante'], true)) {
        return response()->json([
            'success' => false,
            'message' => 'Rol inválido',
            'errors' => ['rol' => ['Rol inválido.']],
        ], 422);
    }

    $user = DB::transaction(function () use ($data, $roleId, $roleName) {

        $u = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // buscar rol por id o por nombre
        $rol = null;
        if ($roleId) {
            $rol = Rol::find($roleId);
        } elseif ($roleName) {
            $rol = Rol::where('nombre', $roleName)->first();
        }

        if ($rol) {
            $u->roles()->attach($rol->id);
        }

        return $u;
    });

    return response()->json([
        'success' => true,
        'message' => 'Usuario creado',
        'data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ],
    ], 201);
}

}
