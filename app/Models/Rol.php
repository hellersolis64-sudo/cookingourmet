<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rol extends Model
{
    protected $table = 'roles';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function usuarios()
    {
        // pivot: usuario_roles(usuario_id, rol_id)
        return $this->belongsToMany(
            \App\Models\User::class,
            'usuario_roles',
            'rol_id',     // FK del rol en el pivot
            'usuario_id'  // FK del usuario en el pivot
        );
    }
}
