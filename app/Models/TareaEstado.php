<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TareaEstado extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'orden',
    ];
}
