<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SolicitudExtension extends Model
{
    protected $table = 'solicitudes_extension';

    protected $fillable = [
        'tarea_id',
        'usuario_id',
        'hora_fin_original',
        'hora_fin_solicitada',
        'hora_fin_aprobada',
        'motivo',
        'estado',
        'aprobado_por',
        'aprobado_en',
    ];

    protected $casts = [
        'aprobado_en' => 'datetime',
    ];

    public function tarea()
    {
        return $this->belongsTo(Tarea::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class);
    }
}
