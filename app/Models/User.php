<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Rol;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // ✅ Roles del usuario (pivot: usuario_roles(usuario_id, rol_id))
    public function roles()
    {
        return $this->belongsToMany(
            Rol::class,
            'usuario_roles',
            'usuario_id', // FK del usuario en el pivot
            'rol_id'      // FK del rol en el pivot
        );
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('nombre', $role)->exists();
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()->whereIn('nombre', $roles)->exists();
    }

    // --- Relaciones de tu proyecto (deja estas como están si existen esos modelos) ---
    public function horarios()
    {
        return $this->hasMany(\App\Models\UsuarioHorario::class);
    }

    public function asistencias()
    {
        return $this->hasMany(\App\Models\Asistencia::class);
    }

    public function tareas()
    {
        return $this->hasMany(\App\Models\Tarea::class);
    }

    public function presence()
    {
        return $this->hasOne(\App\Models\UserPresence::class);
    }
}
