import React from "react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-sm text-white/60">© {new Date().getFullYear()} Cooking Gourmet</div>
        <div className="text-sm text-white/60">Blanco • Negro • <span className="text-[#FE003E] font-extrabold">#FE003E</span></div>
      </div>
    </footer>
  );
}
