import React, { createContext, useContext } from "react";
import { Easing, interpolate, staticFile, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import { COPY, Copy, Lang } from "./copy";

loadFont({ family: "Anton", url: staticFile("anton-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: "Inter", url: staticFile("inter-latin-500-normal.woff2"), weight: "500" });
loadFont({ family: "Inter", url: staticFile("inter-latin-800-normal.woff2"), weight: "800" });
loadFont({ family: "Inter", url: staticFile("inter-latin-900-normal.woff2"), weight: "900" });
loadFont({ family: "Mono", url: staticFile("jetbrains-mono-latin-500-normal.woff2"), weight: "500" });
loadFont({ family: "CairoAr", url: staticFile("cairo-arabic-900-normal.woff2"), weight: "900" });
loadFont({ family: "CairoAr", url: staticFile("cairo-arabic-800-normal.woff2"), weight: "800" });
loadFont({ family: "CairoLat", url: staticFile("cairo-latin-900-normal.woff2"), weight: "900" });

// 120 BPM @ 30fps: one beat = 15 frames, one bar = 60 frames.
export const FPS = 30;
export const BEAT = 15;
export const BAR = 60;
export const TOTAL = 900;

// Scene boundaries (frames). Mirrored by scripts/gen_music.py.
export const T = {
  hook: 0,
  words: 60,
  brand: 120,
  services: 240,
  showcase: 510,
  trusted: 630,
  finale: 720,
  end: 810,
} as const;
export const SERVICE_LEN = 45;

export const C = {
  ink: "#0A0A0B",
  cream: "#F3EDE1",
  teal: "#0FB5A6",
  gold: "#E8B04B",
  red: "#FF3B1F",
  violet: "#4B2BFF",
  grey: "#676561",
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.83, 0, 0.17, 1);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);

export const tw = (f: number, i: [number, number], o: [number, number], e = expo) =>
  interpolate(f, i, o, { ...clamp, easing: e });

// 1 on the hit, decays to 0 over `len` frames.
export const hit = (f: number, at: number, len = 8) =>
  f < at ? 0 : interpolate(f - at, [0, len], [1, 0], { ...clamp, easing: Easing.out(Easing.quad) });

export const useLayout = () => {
  const { width: w, height: h } = useVideoConfig();
  const portrait = h > w * 1.2;
  const landscape = w > h * 1.2;
  return { w, h, portrait, landscape, square: !portrait && !landscape, vmin: Math.min(w, h) };
};

const LangCtx = createContext<Lang>("en");
export const LangProvider: React.FC<{ lang: Lang; children: React.ReactNode }> = ({ lang, children }) => (
  <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>
);

export type Fonts = { display: string; heavy: string; body: string; mono: string; dir: "ltr" | "rtl" };
export const useT = (): Copy & { ar: boolean; f: Fonts } => {
  const lang = useContext(LangCtx);
  const ar = lang === "ar";
  return {
    ...COPY[lang],
    ar,
    f: ar
      ? { display: "CairoLat, CairoAr", heavy: "CairoLat, CairoAr", body: "CairoAr, Inter", mono: "CairoAr, Mono", dir: "rtl" }
      : { display: "Anton", heavy: "Inter", body: "Inter", mono: "Mono", dir: "ltr" },
  };
};

// Estimated advance width per character, in em. Arabic words are short in
// characters but wide in ink, hence the larger factor.
export const fitSize = (text: string, maxW: number, maxH: number, ar: boolean, factor?: number) => {
  const k = factor ?? (ar ? 0.72 : 0.46);
  return Math.min(maxH, maxW / Math.max(1, text.length * k));
};

export const chroma = (a: number) =>
  a < 0.2 ? "none" : `${a}px 0 rgba(255,40,80,0.85), ${-a}px 0 rgba(0,220,255,0.85)`;
