<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AsistenciaController extends Controller
{
    private string $table = 'asistencias';

    private function pickCol(array $candidates): ?string
    {
        foreach ($candidates as $c) {
            if (Schema::hasColumn($this->table, $c)) return $c;
        }
        return null;
    }

    private function colType(string $col): ?string
    {
        try {
            return Schema::getColumnType($this->table, $col);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function formatForColumn(string $col, Carbon $dt, string $kind): string
    {
        $type = $this->colType($col);

        if ($kind === 'date') {
            if (in_array($type, ['datetime', 'timestamp'])) return $dt->startOfDay()->toDateTimeString();
            return $dt->toDateString();
        }

        if ($kind === 'time') {
            if (in_array($type, ['datetime', 'timestamp'])) return $dt->toDateTimeString();
            return $dt->format('H:i:s');
        }

        return $dt->toDateTimeString();
    }

    private function colsOrFail(): array
    {
        $userCol = $this->pickCol(['usuario_id', 'user_id']);
        $dateCol = $this->pickCol(['fecha', 'dia', 'date']);

        $inCol   = $this->pickCol(['hora_entrada_real', 'hora_entrada', 'entrada', 'entrada_at', 'hora_inicio', 'hora_inicio_real']);
        $outCol  = $this->pickCol(['hora_salida_real', 'hora_salida', 'salida', 'salida_at', 'hora_fin', 'hora_fin_real']);

        if (!$userCol || !$dateCol || !$inCol || !$outCol) {
            abort(500, "Config columnas asistencias incompleta. user={$userCol}, date={$dateCol}, in={$inCol}, out={$outCol}");
        }

        return compact('userCol', 'dateCol', 'inCol', 'outCol');
    }

    private function isAdminOrSupervisor($user): bool
    {
        return $user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'supervisor']);
    }

    private function pickUserLastNameCol(): ?string
    {
        foreach (['apellido', 'apellidos', 'last_name', 'lastname'] as $c) {
            if (Schema::hasColumn('users', $c)) return $c;
        }
        return null;
    }

    /** POST /api/asistencias/entrada */
    /** POST /api/asistencias/entrada */
public function entrada(Request $request)
{
    $u = $request->user();
    $now = now();

    // ✅ Foto obligatoria
    if (!$request->hasFile('photo')) {
        return ApiResponse::error('Debes enviar una foto (photo) para marcar entrada.', null, 422);
    }
    $request->validate([
        'photo' => ['required', 'image', 'max:5120'], // 5MB
    ]);

    $cols = $this->colsOrFail();
    $userCol = $cols['userCol'];
    $dateCol = $cols['dateCol'];
    $inCol   = $cols['inCol'];
    $outCol  = $cols['outCol'];

    $todayKey = $this->formatForColumn($dateCol, Carbon::today(), 'date');

    // ✅ datos de seguridad
    $ip = $request->ip();
    $mode = (string) $request->attributes->get('access_mode', 'viewer');

    // ✅ guardar foto (public/attendance)
    $photoPath = $request->file('photo')->store('attendance', 'public');

    try {
        $result = DB::transaction(function () use (
            $u, $now, $todayKey,
            $userCol, $dateCol, $inCol, $outCol,
            $photoPath, $ip, $mode
        ) {
            $row = DB::table($this->table)
                ->where($userCol, $u->id)
                ->where($dateCol, $todayKey)
                ->lockForUpdate()
                ->first();

            if ($row) {
                $outVal = $row->{$outCol} ?? null;

                if (!empty($row->{$inCol}) && empty($outVal)) {
                    return ['ok' => false, 'code' => 409, 'msg' => 'Ya marcaste entrada hoy. Falta salida.'];
                }

                return ['ok' => false, 'code' => 409, 'msg' => 'Ya registraste asistencia completa hoy.'];
            }

            $insert = [
                $userCol => $u->id,
                $dateCol => $todayKey,
                $inCol   => $this->formatForColumn($inCol, $now, 'time'),
                $outCol  => null,
            ];

            // ✅ si existen columnas nuevas, guardarlas (no rompe si faltan)
            if (Schema::hasColumn($this->table, 'entry_photo_path')) $insert['entry_photo_path'] = $photoPath;
            if (Schema::hasColumn($this->table, 'entry_ip'))        $insert['entry_ip'] = $ip;
            if (Schema::hasColumn($this->table, 'entry_mode'))      $insert['entry_mode'] = $mode;

            if (Schema::hasColumn($this->table, 'created_at')) $insert['created_at'] = now();
            if (Schema::hasColumn($this->table, 'updated_at')) $insert['updated_at'] = now();

            $id = DB::table($this->table)->insertGetId($insert);

            $created = DB::table($this->table)->where('id', $id)->first();
            return ['ok' => true, 'data' => $created];
        });

        if (!$result['ok']) {
            // si falló por conflicto, borra la foto guardada
            Storage::disk('public')->delete($photoPath);
            return ApiResponse::error($result['msg'], null, $result['code']);
        }

        return ApiResponse::success($result['data'], 'Entrada registrada');

    } catch (\Throwable $e) {
        // si algo explotó, borra la foto para no dejar basura
        Storage::disk('public')->delete($photoPath);
        return ApiResponse::error('Error registrando entrada', null, 500);
    }
}


    /** POST /api/asistencias/salida */
    /** POST /api/asistencias/salida */
public function salida(Request $request)
{
    $u = $request->user();
    $now = now();

    // ✅ Foto obligatoria
    if (!$request->hasFile('photo')) {
        return ApiResponse::error('Debes enviar una foto (photo) para marcar salida.', null, 422);
    }
    $request->validate([
        'photo' => ['required', 'image', 'max:5120'], // 5MB
    ]);

    $cols = $this->colsOrFail();
    $userCol = $cols['userCol'];
    $dateCol = $cols['dateCol'];
    $inCol   = $cols['inCol'];
    $outCol  = $cols['outCol'];

    $todayKey = $this->formatForColumn($dateCol, Carbon::today(), 'date');

    // ✅ datos de seguridad
    $ip = $request->ip();
    $mode = (string) $request->attributes->get('access_mode', 'viewer');

    // ✅ guardar foto (public/attendance)
    $photoPath = $request->file('photo')->store('attendance', 'public');

    try {
        $result = DB::transaction(function () use (
            $u, $now, $todayKey,
            $userCol, $dateCol, $inCol, $outCol,
            $photoPath, $ip, $mode
        ) {
            $row = DB::table($this->table)
                ->where($userCol, $u->id)
                ->where($dateCol, $todayKey)
                ->lockForUpdate()
                ->first();

            if (!$row || empty($row->{$inCol})) {
                return ['ok' => false, 'code' => 409, 'msg' => 'No puedes marcar salida sin entrada hoy.'];
            }

            if (!empty($row->{$outCol})) {
                return ['ok' => false, 'code' => 409, 'msg' => 'Ya marcaste salida hoy.'];
            }

            $update = [
                $outCol => $this->formatForColumn($outCol, $now, 'time'),
            ];

            // ✅ si existen columnas nuevas, guardarlas (no rompe si faltan)
            if (Schema::hasColumn($this->table, 'exit_photo_path')) $update['exit_photo_path'] = $photoPath;
            if (Schema::hasColumn($this->table, 'exit_ip'))         $update['exit_ip'] = $ip;
            if (Schema::hasColumn($this->table, 'exit_mode'))       $update['exit_mode'] = $mode;

            if (Schema::hasColumn($this->table, 'updated_at')) $update['updated_at'] = now();

            DB::table($this->table)->where('id', $row->id)->update($update);

            $updated = DB::table($this->table)->where('id', $row->id)->first();
            return ['ok' => true, 'data' => $updated];
        });

        if (!$result['ok']) {
            Storage::disk('public')->delete($photoPath);
            return ApiResponse::error($result['msg'], null, $result['code']);
        }

        return ApiResponse::success($result['data'], 'Salida registrada');

    } catch (\Throwable $e) {
        Storage::disk('public')->delete($photoPath);
        return ApiResponse::error('Error registrando salida', null, 500);
    }
}


    /** GET /api/mi/asistencia/hoy */
    public function miHoy(Request $request)
    {
        $u = $request->user();
        $cols = $this->colsOrFail();
        $todayKey = $this->formatForColumn($cols['dateCol'], Carbon::today(), 'date');

        $row = DB::table($this->table)
            ->where($cols['userCol'], $u->id)
            ->where($cols['dateCol'], $todayKey)
            ->first();

        return ApiResponse::success($row, 'Asistencia de hoy');
    }

    /** GET /api/mi/asistencia?from=YYYY-MM-DD&to=YYYY-MM-DD&page= */
    public function misRegistros(Request $request)
    {
        $u = $request->user();
        $cols = $this->colsOrFail();

        $q = DB::table($this->table)->where($cols['userCol'], $u->id);

        if ($request->filled('from')) $q->whereDate($cols['dateCol'], '>=', $request->input('from'));
        if ($request->filled('to'))   $q->whereDate($cols['dateCol'], '<=', $request->input('to'));

        $q->orderByDesc('id');

        $perPage = min((int)$request->input('per_page', 10), 50);
        $data = $q->paginate($perPage);

        return ApiResponse::success($data, 'Mis asistencias');
    }

    /**
     * GET /api/asistencias (admin/supervisor)
     * Params:
     * - usuario: texto (nombre/apellido/email)  ✅
     * - usuario_id: int (opcional)
     * - from / to  (o fecha_from / fecha_to)   ✅
     * - per_page, page
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrSupervisor($user)) {
            return ApiResponse::error('No autorizado', null, 403);
        }

        $cols = $this->colsOrFail();
        $lastNameCol = $this->pickUserLastNameCol();

        // compat: from/to o fecha_from/fecha_to
        $from = $request->input('from') ?? $request->input('fecha_from');
        $to   = $request->input('to')   ?? $request->input('fecha_to');

        // texto usuario (nombre/apellido/email) — si está vacío => TODOS ✅
        $usuarioQ = trim((string)($request->input('usuario') ?? ''));

        $q = DB::table($this->table)
            ->join('users', 'users.id', '=', "{$this->table}.{$cols['userCol']}")
            ->select(
                "{$this->table}.*",
                'users.name as usuario_nombre',
                'users.email as usuario_email'
            );

        if ($lastNameCol) {
            $q->addSelect("users.$lastNameCol as usuario_apellido");
        }

        // usuario_id opcional
        if ($request->filled('usuario_id')) {
            $q->where("{$this->table}.{$cols['userCol']}", (int) $request->input('usuario_id'));
        }

        // filtro por texto (si viene). Si no viene => TODOS
        if ($usuarioQ !== '') {
            $q->where(function ($w) use ($usuarioQ, $lastNameCol) {
                $w->where('users.name', 'like', "%{$usuarioQ}%")
                  ->orWhere('users.email', 'like', "%{$usuarioQ}%");

                if ($lastNameCol) {
                    $w->orWhere("users.$lastNameCol", 'like', "%{$usuarioQ}%");
                }
            });
        }

        // fechas
        if ($from) $q->whereDate("{$this->table}.{$cols['dateCol']}", '>=', $from);
        if ($to)   $q->whereDate("{$this->table}.{$cols['dateCol']}", '<=', $to);

        $q->orderByDesc("{$this->table}.id");

        $perPage = min((int)$request->input('per_page', 50), 200);
        $data = $q->paginate($perPage);

        return ApiResponse::success($data, 'Asistencias');
    }
}
