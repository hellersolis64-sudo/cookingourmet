<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; // Asegúrate de que esta línea esté aquí

class User extends Authenticatable
{
    // Añadimos HasApiTokens junto a los otros traits
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Los atributos que se pueden asignar masivamente.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * Los atributos que deben ocultarse para la serialización.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Los atributos que deben ser casteados.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // --- Relaciones de tu Proyecto ---

    public function roles()
    {
        return $this->belongsToMany(
            Rol::class,
            'usuario_roles',
            'usuario_id', 
            'rol_id'
        );
    }

    public function horarios()
    {
        return $this->hasMany(UsuarioHorario::class);
    }

    public function asistencias()
    {
        return $this->hasMany(Asistencia::class);
    }

    public function tareas()
    {
        return $this->hasMany(Tarea::class);
    }

    /**
     * Relación inversa para obtener usuarios por rol (si fuera necesario)
     */
    public function usuarios()
    {
        return $this->belongsToMany(
            User::class,
            'usuario_roles',
            'rol_id',
            'usuario_id'
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


    public function presence()
    {
        return $this->hasOne(\App\Models\UserPresence::class);
    }


}