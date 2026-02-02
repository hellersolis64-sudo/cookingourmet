<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TareaHistorialEstado extends Model
{
    protected $fillable = [
        'tarea_id',
        'tarea_estado_id',
        'cambiado_por',
    ];

    public function tarea()
    {
        return $this->belongsTo(Tarea::class);
    }

    public function estado()
    {
        return $this->belongsTo(TareaEstado::class, 'tarea_estado_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'cambiado_por');
    }
}
