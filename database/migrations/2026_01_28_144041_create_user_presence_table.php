<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_presence', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_online')->default(false);
            $table->timestamp('last_seen_at')->nullable();

            $table->timestamps();

            $table->unique(['user_id']);
            $table->index(['is_online']);
            $table->index(['last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_presence');
    }
};
