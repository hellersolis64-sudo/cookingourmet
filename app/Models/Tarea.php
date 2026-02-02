<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tarea extends Model
{
    protected $fillable = [
    'usuario_id',
    'titulo',
    'descripcion',
    'estado_id',
    'fecha_programada',
    'hora_inicio_programada',
    'hora_fin_programada',
    'hora_inicio_real',
    'hora_fin_real',
    'comentario_cierre',
    'enviada_en',
];


    public function usuario()
    {
        return $this->belongsTo(User::class);
    }

    public function archivos()
    {
        return $this->hasMany(TareaArchivo::class);
    }

    public function historialEstados()
    {
        return $this->hasMany(TareaHistorialEstado::class);
    }

    public function extensiones()
    {
        return $this->hasMany(SolicitudExtension::class);
    }
}
