<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserListController extends Controller
{
    public function index(Request $request)
    {
        $me = $request->user();
        $search = trim((string) $request->query('search', ''));

        $q = User::query()
            ->where('id', '!=', $me->id)
            ->select(['id', 'name', 'email', 'created_at']);

        if ($search !== '') {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // presence
        $q->with(['presence' => function ($p) {
            $p->select(['id', 'user_id', 'is_online', 'last_seen_at']);
        }]);

        $users = $q->orderBy('name')->limit(200)->get();

        // Normalizamos "online" por last_seen_at (más confiable)
        $now = now();
        $out = $users->map(function ($u) use ($now) {
            $last = $u->presence?->last_seen_at;
            $online = $last ? $last->diffInSeconds($now) <= 40 : false;

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_online' => $online,
                'last_seen_at' => $last?->toISOString(),
            ];
        });

        return response()->json(['success' => true, 'data' => $out]);
    }
}
