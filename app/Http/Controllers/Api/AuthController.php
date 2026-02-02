<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Http\Responses\ApiResponse;

class AuthController extends Controller
{
    /**
     * ✅ Genera el payload del usuario con roles normalizados.
     */
    private function userPayload(User $user): array
    {
        $roles = DB::table('usuario_roles as ur')
            ->join('roles as r', 'r.id', '=', 'ur.rol_id') // ✅ Ajustado a tu estructura
            ->where('ur.usuario_id', $user->id)
            ->pluck('r.nombre')
            ->map(fn ($r) => strtolower(trim((string)$r)))
            ->values()
            ->all();

        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'roles' => $roles, // ✅ Siempre un array de strings: ["admin", "empleado"]
        ];
    }

    /**
     * ✅ Lógica de asistencia automática al loguearse.
     */
    private function marcarEntradaSiCorresponde(int $userId): array
    {
        $fecha = now()->toDateString();
        $hora  = now()->format('H:i:s');

        $row = DB::table('asistencias')
            ->where('usuario_id', $userId)
            ->where('fecha', $fecha)
            ->first();

        if (!$row) {
            DB::table('asistencias')->insert([
                'usuario_id' => $userId,
                'fecha' => $fecha,
                'hora_entrada_real' => $hora,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return ['marked' => true, 'fecha' => $fecha, 'hora_entrada' => $hora];
        }

        return [
            'marked' => false, 
            'fecha' => $fecha, 
            'hora_entrada' => $row->hora_entrada_real ?? $hora
        ];
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return ApiResponse::error('Credenciales inválidas', null, 401);
        }

        // Registrar asistencia (opcional, no bloquea el login)
        $checkin = null;
        try {
            $checkin = $this->marcarEntradaSiCorresponde($user->id);
        } catch (\Exception $e) { 
            \Log::error("Error asistencia: " . $e->getMessage());
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return ApiResponse::success([
            'user'    => $this->userPayload($user),
            'token'   => $token,
            'checkin' => $checkin,
        ], 'Login correcto');
    }

    public function me(Request $request)
    {
        return ApiResponse::success([
            'user' => $this->userPayload($request->user()),
        ], 'Usuario autenticado');
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()->delete();
        return ApiResponse::success(null, 'Logout correcto');
    }

    public function logoutAll(Request $request)
    {
        $request->user()?->tokens()->delete();
        return ApiResponse::success(null, 'Sesiones cerradas en todos los dispositivos');
    }
}