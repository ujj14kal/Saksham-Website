"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * The people this service is built for — cut-out figures standing directly in
 * the hero gradient rather than boxed inside a card, so the page reads as one
 * surface instead of a panel bolted onto it.
 *
 * Expects a transparent PNG at public/hero-beneficiary.png containing only the
 * person. Until that file exists this renders nothing rather than a broken
 * image or an empty frame: a hero with no photo yet looks deliberate, a hero
 * with a grey box looks broken.
 */
export function HeroPortrait() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="relative flex justify-center">
      <Image
        src="/hero-beneficiary.png"
        alt="Three rural craftspeople looking at Saksham on a phone together"
        width={1400}
        height={1000}
        priority
        onError={() => setFailed(true)}
        // object-contain, never cover: a cut-out figure must not be cropped at
        // the edges the way a scenic photo can be
        className="h-auto w-full max-w-none object-contain drop-shadow-xl lg:w-[112%] lg:-translate-x-[5%] lg:mb-[-8%]"
        // The generated image ends in a hard horizontal cut across their legs.
        // With no ground or shadow under them that edge reads as a mistake, so
        // fade the last stretch out into the gradient instead of showing it.
        style={{
          maskImage: "linear-gradient(to bottom, #000 78%, transparent 97%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 97%)",
        }}
      />

    </div>
  );
}
