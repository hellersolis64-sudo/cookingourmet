import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PROGRAMS } from "../data/programs";
import SlideDots from "../components/SlideDots";

export default function PublicHeroSlider() {
  const nav = useNavigate();
  const slides = useMemo(() => PROGRAMS, []);
  const [i, setI] = useState(0);

  // autoplay elegante
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [slides.length]);

  const s = slides[i];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-extrabold text-white/80">
            <Sparkles className="h-4 w-4" />
            Programas profesionales • Intensivos • Especialidades
          </div>

          <h1 className="mt-4 text-4xl lg:text-5xl font-extrabold leading-tight text-white">
            Aprende cocina con
            <span className="text-[#FE003E]"> método</span>, práctica y resultado real.
          </h1>

          <p className="mt-4 text-white/70 text-base">
            Formación gastronómica con rutas claras: técnica, velocidad, presentación, servicio y gestión.
            Elige tu programa y avanza con una malla estructurada.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => document.getElementById("programas")?.scrollIntoView({ behavior: "smooth" })}
              className="h-11 px-5 rounded-2xl bg-[#FE003E] hover:brightness-95 font-extrabold text-white flex items-center gap-2"
            >
              Ver programas <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => nav("/login")}
              className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/15 font-extrabold text-white"
            >
              Inscribirme
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              ["Clases prácticas", "Método + técnica real"],
              ["Malla clara", "Módulos por niveles"],
              ["Pagos flexibles", "Mensual / módulos / paquetes"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="font-extrabold text-white">{a}</div>
                <div className="text-white/60">{b}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right slider */}
        <div className="relative">
          <div className="absolute -top-10 -left-10 h-56 w-56 rounded-full bg-[#FE003E]/20 blur-[90px]" />
          <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-[110px]" />

          <div className="rounded-[30px] border border-white/10 bg-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm font-extrabold text-white/70">Carreras & Especialidades</div>
              <SlideDots count={slides.length} index={i} onSelect={setI} />
            </div>

            <div className="p-6 min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                >
                  <div className="text-[11px] font-extrabold text-white/60 uppercase tracking-widest">
                    {s.category}
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
                    {s.name} <span className="text-[#FE003E]">•</span>
                  </div>
                  <div className="mt-2 text-white/75 text-sm leading-relaxed">{s.tagline}</div>

                  <div className="mt-5 grid gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs font-extrabold text-white/70">Duración</div>
                      <div className="text-sm text-white/85">{s.duration}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-xs font-extrabold text-white/70">Modalidades</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {s.modalities.slice(0, 3).map((m) => (
                          <span
                            key={m}
                            className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={() => document.getElementById("programas")?.scrollIntoView({ behavior: "smooth" })}
                      className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/15 font-extrabold text-white"
                    >
                      Ver mallas
                    </button>
                    <button
                      onClick={() => nav("/login")}
                      className="h-11 px-5 rounded-2xl bg-[#FE003E] hover:brightness-95 font-extrabold text-white"
                    >
                      Postular
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/50">
              Transiciones suaves • Diseño elegante • Paleta: blanco / negro /{" "}
              <span className="text-[#FE003E] font-extrabold">#FE003E</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
