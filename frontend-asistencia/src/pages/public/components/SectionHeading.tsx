import React from "react";

export default function SectionHeading({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        {eyebrow && <div className="text-xs font-extrabold tracking-widest text-white/60 uppercase">{eyebrow}</div>}
        <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h2>
        {desc && <p className="mt-2 text-sm text-white/65 max-w-2xl">{desc}</p>}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
