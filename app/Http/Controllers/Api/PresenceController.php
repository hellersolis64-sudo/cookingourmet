<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPresence;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    public function ping(Request $request)
    {
        $user = $request->user();

        UserPresence::updateOrCreate(
            ['user_id' => $user->id],
            ['is_online' => true, 'last_seen_at' => now()]
        );

        return response()->json(['success' => true]);
    }
    public function typing(Request $request)
    {
        $data = $request->validate([
            'conversation_id' => 'required|integer',
            'typing' => 'required|boolean',
        ]);

        $userId = $request->user()->id;
        $key = "typing:{$data['conversation_id']}";

        $current = cache()->get($key, []);

        if ($data['typing']) {
            $current[$userId] = now()->timestamp;
        } else {
            unset($current[$userId]);
        }

        cache()->put($key, $current, now()->addSeconds(5));

        return response()->json(['success' => true]);
    }

    public function whoTyping(Request $request)
    {
        $conversationId = $request->query('conversation_id');
        $me = $request->user()->id;

        $key = "typing:{$conversationId}";
        $users = cache()->get($key, []);

        // quitamos al propio usuario
        unset($users[$me]);

        return response()->json([
            'success' => true,
            'data' => array_keys($users),
        ]);
    }

}
