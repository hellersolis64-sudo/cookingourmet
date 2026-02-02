<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    // Lista mis conversaciones (ordenadas por último mensaje)
    public function conversations(Request $request)
{
    $me = $request->user();

    $convs = Conversation::query()
        ->whereHas('participants', fn ($q) => $q->where('user_id', $me->id))
        ->with([
            'lastMessage' => function ($q) {
                $q->select([
                    'messages.id',
                    'messages.conversation_id',
                    'messages.sender_id',
                    'messages.body',
                    'messages.created_at',
                ]);
            },
            'participants.user:id,name,email',
        ])
        ->orderByDesc(
            Message::select('messages.created_at')
                ->whereColumn('messages.conversation_id', 'conversations.id')
                ->latest('messages.id')
                ->take(1)
        )
        ->limit(50)
        ->get();

    return response()->json(['success' => true, 'data' => $convs]);
}


    // Crea / obtiene conversación directa (1 a 1)
    public function direct(Request $request)
    {
        $me = $request->user();

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $otherId = (int) $data['user_id'];
        if ($otherId === $me->id) {
            return response()->json(['success' => false, 'message' => 'No puedes chatear contigo mismo.'], 422);
        }

        $min = min($me->id, $otherId);
        $max = max($me->id, $otherId);
        $hash = "{$min}:{$max}";

        $conv = Conversation::where('direct_hash', $hash)->first();

        if (!$conv) {
            $conv = Conversation::create([
                'type' => 'direct',
                'direct_hash' => $hash,
                'created_by' => $me->id,
            ]);

            ConversationParticipant::create(['conversation_id' => $conv->id, 'user_id' => $me->id]);
            ConversationParticipant::create(['conversation_id' => $conv->id, 'user_id' => $otherId]);
        }

        return response()->json(['success' => true, 'data' => $conv]);
    }

    // Mensajes de una conversación
    public function messages(Request $request, Conversation $conversation)
    {
        $me = $request->user();

        $isMember = $conversation->participants()->where('user_id', $me->id)->exists();
        if (!$isMember) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $msgs = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        return response()->json(['success' => true, 'data' => $msgs]);
    }

    // Enviar mensaje
    public function send(Request $request, Conversation $conversation)
    {
        $me = $request->user();

        $isMember = $conversation->participants()->where('user_id', $me->id)->exists();
        if (!$isMember) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $msg = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $me->id,
            'body' => $data['body'],
        ]);

        return response()->json(['success' => true, 'data' => $msg]);
    }

    // Marcar leído (actualiza last_read_at)
    public function read(Request $request, Conversation $conversation)
    {
        $me = $request->user();

        $row = $conversation->participants()->where('user_id', $me->id)->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $row->last_read_at = now();
        $row->save();

        return response()->json(['success' => true]);
    }
}
