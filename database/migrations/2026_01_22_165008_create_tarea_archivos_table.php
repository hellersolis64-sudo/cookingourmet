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
        Schema::create('tarea_archivos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tarea_id')->constrained()->cascadeOnDelete();
            $table->string('ruta');
            $table->string('nombre_original');
            $table->string('mime');
            $table->timestamps();
        });
    }



    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tarea_archivos');
    }
};
