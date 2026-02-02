<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('user_schedules', function (Blueprint $table) {
            // Campos reales tipo tareas
            $table->time('hora_inicio_real')->nullable()->after('ends_at');
            $table->time('hora_fin_real')->nullable()->after('hora_inicio_real');

            $table->dateTime('inicio_real_at')->nullable()->after('hora_fin_real');
            $table->dateTime('fin_real_at')->nullable()->after('inicio_real_at');

            $table->text('comentario_cierre')->nullable()->after('fin_real_at');
            $table->dateTime('enviada_en')->nullable()->after('comentario_cierre');
        });
    }

    public function down(): void
    {
        Schema::table('user_schedules', function (Blueprint $table) {
            $table->dropColumn([
                'hora_inicio_real',
                'hora_fin_real',
                'inicio_real_at',
                'fin_real_at',
                'comentario_cierre',
                'enviada_en',
            ]);
        });
    }
};
