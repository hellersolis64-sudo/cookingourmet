import React from "react";
import PublicTopBar from "./sections/PublicTopBar";
import PublicHeroSlider from "./sections/PublicHeroSlider";
import PublicPrograms from "./sections/PublicPrograms";
import PublicWhy from "./sections/PublicWhy";
import PublicTestimonials from "./sections/PublicTestimonials";
import PublicFAQ from "./sections/PublicFAQ";
import PublicCTA from "./sections/PublicCTA";
import PublicFooter from "./sections/PublicFooter";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <PublicTopBar />
      <PublicHeroSlider />
      <PublicPrograms />
      <PublicWhy />
      <PublicTestimonials />
      <PublicFAQ />
      <PublicCTA />
      <PublicFooter />
    </div>
  );
}
