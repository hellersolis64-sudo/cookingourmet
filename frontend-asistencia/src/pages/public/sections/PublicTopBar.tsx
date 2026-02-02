import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function PublicTopBar() {
  const nav = useNavigate();

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f19]/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#FE003E]" />
          <div className="min-w-0">
            <div className="font-extrabold leading-tight text-white">Cooking Gourmet</div>
            <div className="text-xs text-white/60">Escuela de gastronomía</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => nav("/login")}
            className="h-10 px-4 rounded-2xl bg-white/10 hover:bg-white/15 font-extrabold text-white"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => nav("/login")}
            className="h-10 px-4 rounded-2xl bg-[#FE003E] hover:brightness-95 font-extrabold text-white flex items-center gap-2"
          >
            Postular <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
