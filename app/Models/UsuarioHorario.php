<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsuarioHorario extends Model
{
    protected $fillable = [
        'usuario_id',
        'horario_plantilla_id',
        'fecha_inicio',
        'fecha_fin',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class);
    }

    public function plantilla()
    {
        return $this->belongsTo(HorarioPlantilla::class, 'horario_plantilla_id');
    }
}
