<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('horario_plantillas', function (Blueprint $table) {
            $table->id();
            $table->time('hora_entrada');
            $table->time('hora_salida');
            $table->time('hora_almuerzo_inicio')->nullable();
            $table->time('hora_almuerzo_fin')->nullable();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('horario_plantillas');
    }
};
