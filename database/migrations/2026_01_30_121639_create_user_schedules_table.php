<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::create('user_schedules', function (Blueprint $table) {
      $table->id();
      $table->unsignedBigInteger('usuario_id'); // ✅ coincide con tu sistema

      $table->string('type')->default('attendance'); // attendance, task, etc
      $table->string('title')->nullable();

      $table->dateTime('starts_at');
      $table->dateTime('ends_at');

      $table->boolean('allow_remote')->default(true);
      $table->timestamps();

      $table->index(['usuario_id', 'starts_at', 'ends_at']);
      $table->foreign('usuario_id')->references('id')->on('users')->onDelete('cascade');
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('user_schedules');
  }
};
