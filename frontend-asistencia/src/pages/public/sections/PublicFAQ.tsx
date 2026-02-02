import React, { useState } from "react";
import SectionHeading from "../components/SectionHeading";
import { ChevronDown } from "lucide-react";

const FAQ = [
  { q: "¿Qué modalidad de pago manejan?", a: "Depende del programa: mensual, por módulos o paquetes. Lo ves en cada detalle." },
  { q: "¿Cuánto dura cada programa?", a: "Hay rutas intensivas y profesionales. La duración aparece por programa y modalidad." },
  { q: "¿Tienen cursos personalizados?", a: "Sí. Puedes armar un plan 1 a 1 o para grupos pequeños, con horario flexible." },
  { q: "¿Incluye malla curricular?", a: "Sí. Cada programa muestra una malla resumida. La versión completa se confirma al inscribirte." },
];

export default function PublicFAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <SectionHeading eyebrow="FAQ" title="Preguntas frecuentes" desc="Resolvemos lo más común antes de inscribirte." />
      <div className="mt-6 space-y-3">
        {FAQ.map((f, idx) => {
          const isOpen = open === idx;
          return (
            <button
              key={f.q}
              type="button"
              onClick={() => setOpen(isOpen ? null : idx)}
              className="w-full text-left rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-extrabold text-white">{f.q}</div>
                <ChevronDown className={["h-5 w-5 text-white/60 transition", isOpen ? "rotate-180" : ""].join(" ")} />
              </div>
              {isOpen && <div className="mt-3 text-sm text-white/70 leading-relaxed">{f.a}</div>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
