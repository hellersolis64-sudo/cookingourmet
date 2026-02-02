<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSchedule extends Model
{
    protected $table = 'user_schedules';

    protected $fillable = [
        'usuario_id',
        'type',
        'title',
        'starts_at',
        'ends_at',
        'allow_remote',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'allow_remote' => 'boolean',
    ];
}
