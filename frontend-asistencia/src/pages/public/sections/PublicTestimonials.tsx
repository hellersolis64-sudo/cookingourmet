import React from "react";
import SectionHeading from "../components/SectionHeading";

const T = [
  { n: "Andrea M.", t: "Pastelería", d: "Aprendí técnica real. Mis postres salieron consistentes y con buena presentación." },
  { n: "Luis R.", t: "Gastronomía", d: "Lo mejor fue el orden y el mise en place. Cocino más rápido y con menos errores." },
  { n: "Valeria S.", t: "Barismo", d: "Ahora calibro espresso y entiendo extracción. Subí de nivel en la cafetería." },
];

export default function PublicTestimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <SectionHeading eyebrow="Testimonios" title="Resultados reales" desc="Lo que dicen nuestros estudiantes." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {T.map((x) => (
          <div key={x.n} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-extrabold text-white">{x.n}</div>
            <div className="text-xs text-white/55 mt-1">{x.t}</div>
            <div className="mt-3 text-sm text-white/70 leading-relaxed">“{x.d}”</div>
          </div>
        ))}
      </div>
    </section>
  );
}
