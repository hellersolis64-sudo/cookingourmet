import React, { useEffect } from "react";
import { X, CalendarDays, CreditCard, ListChecks, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Program } from "../data/programs";

export default function ProgramModal({
  open,
  program,
  onClose,
}: {
  open: boolean;
  program: Program | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && program && (
        <motion.div
          className="fixed inset-0 z-[99999] bg-black/70 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0b0f19] text-white overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-white/60 uppercase tracking-widest">
                  {program.category}
                </div>
                <div className="text-2xl font-extrabold tracking-tight">{program.name}</div>
                <div className="mt-1 text-sm text-white/70">{program.tagline}</div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 grid place-items-center"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 grid gap-4 lg:grid-cols-3">
              {/* quick facts */}
              <div className="lg:col-span-1 space-y-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold">
                    <CalendarDays className="h-4 w-4 text-white/70" />
                    Duración
                  </div>
                  <div className="mt-2 text-white/80">{program.duration}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold">
                    <Sparkles className="h-4 w-4 text-white/70" />
                    Modalidades
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {program.modalities.map((m) => (
                      <span
                        key={m}
                        className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 border border-white/10"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold">
                    <CreditCard className="h-4 w-4 text-white/70" />
                    Pagos
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-white/75 list-disc pl-5">
                    {program.payment.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* curriculum + outcomes */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold">
                    <ListChecks className="h-4 w-4 text-white/70" />
                    Malla curricular (resumen)
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {program.curriculum.map((c) => (
                      <div
                        key={c}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-extrabold">Lo que lograrás</div>
                  <ul className="mt-2 space-y-1 text-sm text-white/75 list-disc pl-5">
                    {program.outcomes.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <a
                    href="/login"
                    className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/15 font-extrabold inline-flex items-center justify-center"
                  >
                    Solicitar información
                  </a>
                  <a
                    href="/login"
                    className="h-11 px-5 rounded-2xl bg-[#FE003E] hover:brightness-95 font-extrabold inline-flex items-center justify-center"
                  >
                    Inscribirme
                  </a>
                </div>

                <div className="text-[11px] text-white/45">
                  * La malla y precios pueden ajustarse según edición/horarios. Se confirma al inscribirse.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
