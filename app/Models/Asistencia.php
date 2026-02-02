<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asistencia extends Model
{
    protected $fillable = [
        'usuario_id',
        'fecha',
        'hora_entrada_real',
        'hora_salida_real',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class);
    }
}
