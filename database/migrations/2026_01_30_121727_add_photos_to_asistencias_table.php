<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::table('asistencias', function (Blueprint $table) {
      // ✅ fotos
      $table->string('entry_photo_path')->nullable()->after('hora_entrada_real');
      $table->string('exit_photo_path')->nullable()->after('hora_salida_real');

      // ✅ ip + modo (full/temp_full)
      $table->string('entry_ip', 45)->nullable()->after('entry_photo_path');
      $table->string('exit_ip', 45)->nullable()->after('exit_photo_path');

      $table->string('entry_mode', 20)->nullable()->after('entry_ip');
      $table->string('exit_mode', 20)->nullable()->after('exit_ip');
    });
  }

  public function down(): void
  {
    Schema::table('asistencias', function (Blueprint $table) {
      $table->dropColumn([
        'entry_photo_path',
        'exit_photo_path',
        'entry_ip',
        'exit_ip',
        'entry_mode',
        'exit_mode',
      ]);
    });
  }
};
