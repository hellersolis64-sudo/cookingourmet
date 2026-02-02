<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 100);

        $q = User::query()->select(['id','name','email','created_at']);

        if ($search !== '') {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $q->orderBy('name')->paginate(min(max($perPage, 1), 200));

        return response()->json([
            'success' => true,
            'message' => 'Lista de usuarios',
            'data' => $users,
        ]);
    }
}
