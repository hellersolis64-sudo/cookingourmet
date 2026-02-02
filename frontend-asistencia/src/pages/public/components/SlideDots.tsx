import React from "react";

export default function SlideDots({
  count,
  index,
  onSelect,
}: {
  count: number;
  index: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={[
            "h-2.5 rounded-full transition-all",
            i === index ? "w-9 bg-[#FE003E]" : "w-2.5 bg-white/25 hover:bg-white/40",
          ].join(" ")}
          aria-label={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );
}
