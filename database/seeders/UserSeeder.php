<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Rol;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $usuarios = [
            [
                'name' => 'Admin',
                'email' => 'admin@demo.com',
                'password' => Hash::make('password'),
                'rol' => 'admin',
            ],
            [
                'name' => 'Supervisor',
                'email' => 'supervisor@demo.com',
                'password' => Hash::make('password'),
                'rol' => 'supervisor',
            ],
            [
                'name' => 'Empleado',
                'email' => 'empleado@demo.com',
                'password' => Hash::make('password'),
                'rol' => 'empleado',
            ],
        ];

        foreach ($usuarios as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => $data['password'],
                ]
            );

            $rol = Rol::where('nombre', $data['rol'])->first();

            if ($rol && !$user->roles()->where('rol_id', $rol->id)->exists()) {
                $user->roles()->attach($rol->id);
            }
        }
    }
}
