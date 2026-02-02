import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function PublicCTA() {
  const nav = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#FE003E]/20 blur-[90px]" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-[110px]" />

        <div className="relative">
          <div className="text-sm font-extrabold text-white/70">¿Listo para empezar?</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Elige tu programa y agenda tu inscripción.
          </div>
          <div className="mt-2 text-sm text-white/70 max-w-2xl">
            Gastronomía, Pastelería, Bar, Barismo, Sommelier, Cocina Acelerada o Cursos Personalizados.
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => document.getElementById("programas")?.scrollIntoView({ behavior: "smooth" })}
              className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/15 font-extrabold text-white"
            >
              Ver programas
            </button>
            <button
              onClick={() => nav("/login")}
              className="h-11 px-5 rounded-2xl bg-[#FE003E] hover:brightness-95 font-extrabold text-white flex items-center gap-2"
            >
              Inscribirme <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 text-[11px] text-white/45">
            * La información final (horarios, costos y malla completa) se confirma al momento de inscripción.
          </div>
        </div>
      </div>
    </section>
  );
}
