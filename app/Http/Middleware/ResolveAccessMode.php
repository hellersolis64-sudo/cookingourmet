<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\UserSchedule;

class ResolveAccessMode
{
    private function officeIps(): array
    {
        // ✅ Lee directo desde .env (OFFICE_IPS)
        $raw = (string) env('OFFICE_IPS', '');
        $ips = array_filter(array_map('trim', explode(',', $raw)));

        // fallback seguro (por si alguien olvida setear env)
        return $ips;
    }

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user) return $next($request);

        $ip = $request->ip();
        $officeIps = $this->officeIps();
        $inOffice = in_array($ip, $officeIps, true);

        $now = now();

        $active = UserSchedule::query()
            ->where('usuario_id', $user->id)
            ->where('allow_remote', true)
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>=', $now)
            ->orderBy('ends_at', 'asc')
            ->first();

        $mode = 'viewer';
        $reason = 'NO_ACTIVITY_OUTSIDE';
        $expiresAt = null;

        if ($inOffice) {
            $mode = 'full';
            $reason = 'IN_OFFICE_IP';
        } elseif ($active) {
            $mode = 'temp_full';
            $reason = 'HAS_SCHEDULED_ACTIVITY';
            $expiresAt = optional($active->ends_at)->toIso8601String();
        }

        $request->attributes->set('access_mode', $mode);
        $request->attributes->set('access_reason', $reason);
        $request->attributes->set('access_ip', $ip);
        $request->attributes->set('access_expires_at', $expiresAt);

        return $next($request);
    }
}
