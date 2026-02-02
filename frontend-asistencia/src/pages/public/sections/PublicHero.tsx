import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export default function PublicHero() {
  const nav = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-extrabold text-white/80">
            <Sparkles className="h-4 w-4" />
            Acceso remoto temporal + control en tiempo real
          </div>

          <h1 className="mt-4 text-4xl lg:text-5xl font-extrabold leading-tight text-white">
            Asistencia, tareas y calendario
            <span className="text-[#FE003E]"> en un solo lugar</span>
          </h1>

          <p className="mt-4 text-white/70 text-base">
            TimeFlow ayuda a tu equipo a registrar asistencia, ejecutar tareas con evidencias y administrar acceso remoto
            temporal cuando hay actividades programadas.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => nav("/login")}
              className="h-11 px-5 rounded-2xl bg-[#FE003E] hover:brightness-95 font-extrabold text-white flex items-center gap-2"
            >
              Iniciar sesión <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/15 font-extrabold text-white"
            >
              Ver funciones
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="font-extrabold text-white">Evidencias</div>
              <div className="text-white/60">Imágenes / PDF</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="font-extrabold text-white">Calendario</div>
              <div className="text-white/60">Semanal 24h</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="font-extrabold text-white">Acceso</div>
              <div className="text-white/60">full / temp_full / viewer</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="text-sm font-extrabold text-white/70">Qué resuelve</div>
          <ul className="mt-4 space-y-3 text-white/80">
            {[
              "Registro automático de entrada y confirmación de salida.",
              "Tareas con iniciar → evidencias → enviar/finalizar (bloqueo).",
              "Actividades programadas que habilitan acceso remoto temporal.",
              "Dashboard con métricas y ranking (admin).",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#FE003E] mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
