import React from "react";
import { ArrowRight } from "lucide-react";
import type { Program } from "../data/programs";

export default function ProgramCard({
  p,
  onOpen,
}: {
  p: Program;
  onOpen: (p: Program) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p)}
      className="text-left group rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-extrabold text-white/60 uppercase tracking-widest">{p.category}</div>
          <div className="mt-1 text-lg font-extrabold text-white">{p.name}</div>
        </div>

        {p.badge ? (
          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-extrabold text-white/80">
            {p.badge}
          </div>
        ) : null}
      </div>

      <div className="mt-2 text-sm text-white/65">{p.short}</div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-white/55">
          <span className="font-extrabold text-white/80">Duración:</span> {p.duration}
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-white group-hover:text-[#FE003E] transition">
          Ver detalles <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}
