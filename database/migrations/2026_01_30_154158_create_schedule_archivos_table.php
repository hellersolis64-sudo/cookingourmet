<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('schedule_archivos', function (Blueprint $table) {
            $table->id();

            // Igual que tarea_archivos pero apuntando a user_schedules
            $table->unsignedBigInteger('schedule_id');

            $table->string('ruta');
            $table->string('nombre_original');
            $table->string('mime');

            $table->timestamps();

            $table->index('schedule_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_archivos');
    }
};
