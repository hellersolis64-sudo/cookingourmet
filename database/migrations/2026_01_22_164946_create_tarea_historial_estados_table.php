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
        Schema::create('tarea_historial_estados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tarea_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tarea_estado_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cambiado_por')->constrained('users');
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tarea_historial_estados');
    }
};
