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
        Schema::create('solicitudes_extension', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tarea_id')->constrained()->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users');
            $table->time('hora_fin_original');
            $table->time('hora_fin_solicitada');
            $table->time('hora_fin_aprobada')->nullable();
            $table->text('motivo')->nullable();
            $table->string('estado');
            $table->foreignId('aprobado_por')->nullable()->constrained('users');
            $table->timestamp('aprobado_en')->nullable();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('solicitudes_extension');
    }
};
