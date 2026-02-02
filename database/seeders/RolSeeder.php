<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rol;

class RolSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['nombre' => 'admin', 'descripcion' => 'Administrador del sistema'],
            ['nombre' => 'supervisor', 'descripcion' => 'Supervisor de equipo'],
            ['nombre' => 'empleado', 'descripcion' => 'Empleado'],
        ];

        foreach ($roles as $rol) {
            Rol::firstOrCreate(
                ['nombre' => $rol['nombre']],
                $rol
            );
        }
    }
}
