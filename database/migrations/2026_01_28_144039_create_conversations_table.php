<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();

            // direct = chat 1 a 1, group = chat grupal (por si luego lo necesitas)
            $table->string('type', 20)->default('direct');

            // Para evitar duplicar chats 1 a 1: "minId:maxId" (solo usado en direct)
            $table->string('direct_hash', 50)->nullable()->unique();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
