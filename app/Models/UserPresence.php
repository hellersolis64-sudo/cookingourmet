<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPresence extends Model
{
    protected $table = 'user_presence';

    protected $fillable = ['user_id', 'is_online', 'last_seen_at'];

    protected $casts = [
        'is_online' => 'boolean',
        'last_seen_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
