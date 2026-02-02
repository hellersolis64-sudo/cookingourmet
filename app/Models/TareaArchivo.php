<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TareaArchivo extends Model
{
    protected $fillable = [
        'tarea_id',
        'ruta',
        'nombre_original',
        'mime',
    ];

    public function tarea()
    {
        return $this->belongsTo(Tarea::class);
    }
}
