<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->id();

            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Para no leídos (cada usuario tiene su último leído por conversación)
            $table->timestamp('last_read_at')->nullable();

            $table->timestamps();

            // Evita que el mismo usuario se meta dos veces al mismo chat
            $table->unique(['conversation_id', 'user_id']);

            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_participants');
    }
};
