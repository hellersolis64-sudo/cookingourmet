<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TareaEstado;

class TareaEstadoSeeder extends Seeder
{
    public function run(): void
    {
        $estados = [
            ['nombre' => 'pendiente', 'orden' => 1],
            ['nombre' => 'en_progreso', 'orden' => 2],
            ['nombre' => 'pausada', 'orden' => 3],
            ['nombre' => 'completada', 'orden' => 4],
        ];

        foreach ($estados as $estado) {
            TareaEstado::firstOrCreate(
                ['nombre' => $estado['nombre']],
                $estado
            );
        }
    }
}
