<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'direct_hash',
        'created_by',
    ];

    protected $casts = [
        'created_by' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function participants()
    {
        return $this->hasMany(ConversationParticipant::class, 'conversation_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'conversation_id');
    }

    public function lastMessage()
    {
        return $this->hasOne(Message::class, 'conversation_id')
            ->latestOfMany()
            ->select('messages.*'); // ✅ FIX: evita ambigüedad
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
