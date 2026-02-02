import React, { useMemo, useState } from "react";
import SectionHeading from "../components/SectionHeading";
import ProgramCard from "../components/ProgramCard";
import ProgramModal from "../components/ProgramModal";
import { PROGRAMS, type Program } from "../data/programs";

export default function PublicPrograms() {
  const items = useMemo(() => PROGRAMS, []);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Program | null>(null);

  return (
    <section id="programas" className="mx-auto max-w-6xl px-4 pb-16">
      <SectionHeading
        eyebrow="Programas"
        title="Elige tu ruta de aprendizaje"
        desc="Carreras y especialidades con malla curricular, duración y opciones de pago. Haz clic en un programa para ver detalles."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <ProgramCard
            key={p.id}
            p={p}
            onOpen={(x) => {
              setSel(x);
              setOpen(true);
            }}
          />
        ))}
      </div>

      <ProgramModal open={open} program={sel} onClose={() => setOpen(false)} />
    </section>
  );
}
