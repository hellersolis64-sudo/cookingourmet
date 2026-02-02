<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::table('tareas', function (Blueprint $table) {
      $table->text('comentario_cierre')->nullable()->after('hora_fin_real');
      $table->timestamp('enviada_en')->nullable()->after('comentario_cierre');
    });
  }

  public function down(): void {
    Schema::table('tareas', function (Blueprint $table) {
      $table->dropColumn(['comentario_cierre','enviada_en']);
    });
  }
};
