<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HorarioPlantilla extends Model
{
    protected $fillable = [
        'hora_entrada',
        'hora_salida',
        'hora_almuerzo_inicio',
        'hora_almuerzo_fin',
    ];

    public function usuarios()
    {
        return $this->hasMany(UsuarioHorario::class);
    }
}
