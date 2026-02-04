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
    /**
     * GET /api/usuarios
     */
    public function index(Request $request)
    {
        $search  = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 100);

        $q = User::query()
            ->select(['id', 'name', 'email', 'created_at', 'email_verified_at'])
            ->with(['roles:id,nombre']); // ✅ trae roles (id,nombre)

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
     * GET /api/usuarios/{id}
     * ✅ Para tu vista UsuarioShow.tsx
     */
    public function show($id)
    {
        $user = User::query()
            ->select(['id', 'name', 'email', 'created_at', 'email_verified_at'])
            ->with(['roles:id,nombre'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Perfil de usuario',
            'data' => $user,
        ]);
    }

    /**
     * POST /api/usuarios
     */
    public function store(Request $request)
    {
        $roleName = $request->input('rol') ?? $request->input('role');
        $roleId   = $request->input('rol_id') ?? $request->input('role_id');

        if (is_string($roleName)) $roleName = strtolower(trim($roleName));
        else $roleName = null;

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email', 'max:190', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:6'],

            'rol'      => ['nullable', 'string'],
            'role'     => ['nullable', 'string'],
            'rol_id'   => ['nullable', 'integer'],
            'role_id'  => ['nullable', 'integer'],

            // opcional (si luego quieres marcar verificado)
            'email_verified' => ['nullable', 'boolean'],
        ]);

        if (!$roleId && !$roleName) {
            return response()->json([
                'success' => false,
                'message' => 'El rol es requerido',
                'errors' => ['rol' => ['El rol es requerido.']],
            ], 422);
        }

        $user = DB::transaction(function () use ($data, $roleId, $roleName) {
            $u = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            // marcar verificado si se desea (opcional)
            if (array_key_exists('email_verified', $data)) {
                $u->email_verified_at = $data['email_verified'] ? now() : null;
                $u->save();
            }

            $rol = $this->resolveRol($roleId, $roleName);
            if ($rol) {
                // ✅ 1 rol (si quieres multirol luego lo ajustamos)
                $u->roles()->sync([$rol->id]);
            }

            return $u;
        });

        $user->load('roles:id,nombre');

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado',
            'data' => $user,
        ], 201);
    }

    /**
     * PUT /api/usuarios/{id}
     * Body: { name?, email?, password?, rol_id? / rol?, email_verified? }
     */
    public function update(Request $request, $id)
    {
        $user = User::query()->findOrFail($id);

        $roleName = $request->input('rol') ?? $request->input('role');
        $roleId   = $request->input('rol_id') ?? $request->input('role_id');

        if (is_string($roleName)) $roleName = strtolower(trim($roleName));
        else $roleName = null;

        $data = $request->validate([
            'name'     => ['sometimes', 'required', 'string', 'max:120'],
            'email'    => ['sometimes', 'required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],

            'rol'      => ['nullable', 'string'],
            'role'     => ['nullable', 'string'],
            'rol_id'   => ['nullable', 'integer'],
            'role_id'  => ['nullable', 'integer'],

            // ✅ para verificar / desverificar correo desde tu UI si quieres
            'email_verified' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($user, $data, $roleId, $roleName) {

            if (array_key_exists('name', $data)) $user->name = $data['name'];
            if (array_key_exists('email', $data)) $user->email = $data['email'];

            if (array_key_exists('password', $data) && $data['password']) {
                $user->password = Hash::make($data['password']);
            }

            if (array_key_exists('email_verified', $data)) {
                $user->email_verified_at = $data['email_verified'] ? now() : null;
            }

            $user->save();

            // ✅ si mandan rol_id o rol, lo actualizamos
            if ($roleId || $roleName) {
                $rol = $this->resolveRol($roleId, $roleName);
                if ($rol) $user->roles()->sync([$rol->id]);
            }
        });

        $user->load('roles:id,nombre');

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado',
            'data' => $user,
        ]);
    }

    /**
     * DELETE /api/usuarios/{id}
     */
    public function destroy($id)
    {
        $user = User::query()->findOrFail($id);

        DB::transaction(function () use ($user) {
            // ✅ limpia pivot primero
            $user->roles()->detach();
            $user->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado',
            'data' => ['id' => (int) $id],
        ]);
    }

    // -------------------- helpers --------------------

    private function resolveRol($roleId, ?string $roleName): ?Rol
    {
        if ($roleId) return Rol::find($roleId);
        if ($roleName) return Rol::where('nombre', $roleName)->first();
        return null;
    }
}
