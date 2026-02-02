import React from "react";
import SectionHeading from "../components/SectionHeading";
import { CheckCircle2, Flame, Timer, ShieldCheck } from "lucide-react";

const ITEMS = [
  { icon: <Flame className="h-5 w-5 text-white/70" />, t: "100% práctica", d: "Clases enfocadas en técnica + repetición + control." },
  { icon: <Timer className="h-5 w-5 text-white/70" />, t: "Ritmo real", d: "Aprendes a producir con orden, tiempo y consistencia." },
  { icon: <ShieldCheck className="h-5 w-5 text-white/70" />, t: "Método", d: "Malla clara por módulos: base → intermedio → avanzado." },
  { icon: <CheckCircle2 className="h-5 w-5 text-white/70" />, t: "Resultados", d: "Portafolio, técnica y criterio para trabajar o emprender." },
];

export default function PublicWhy() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <SectionHeading eyebrow="Metodología" title="Una escuela que te hace avanzar" desc="Enfoque práctico, medible y con ruta real." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((x) => (
          <div key={x.t} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
              {x.icon}
            </div>
            <div className="mt-3 font-extrabold text-white">{x.t}</div>
            <div className="mt-1 text-sm text-white/65">{x.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
