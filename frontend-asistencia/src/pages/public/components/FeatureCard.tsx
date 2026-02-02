import React from "react";

export default function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="h-10 w-10 rounded-2xl bg-black/[0.04] border border-black/10 grid place-items-center">
        {icon}
      </div>
      <div className="mt-3 font-extrabold text-black">{title}</div>
      <div className="mt-1 text-sm text-black/60">{desc}</div>
    </div>
  );
}
