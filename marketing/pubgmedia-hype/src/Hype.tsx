import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { Lang } from "./copy";
import { BEAT, C, LangProvider, SERVICE_LEN, T, TOTAL, clamp, useLayout, useT } from "./lib";
import { BeatWords, Brand, Hook } from "./scenes/Opening";
import { ServiceScene } from "./scenes/Services";
import { EndCard, Finale, Showcase, Trusted } from "./scenes/Closing";

export type HypeProps = { lang: Lang };

// Frames where the kick lands (mirrors scripts/gen_music.py).
const isKick = (beatStart: number) => {
  const s = beatStart / 30;
  if (s < 2 || s >= 27) return false;
  if (s >= 17 && s < 21) return (beatStart - T.showcase) % 60 === 0;
  return true;
};

// Camera punch on every kick: quick scale bump plus a small deterministic jolt.
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const beatStart = Math.floor(f / BEAT) * BEAT;
  const l = f - beatStart;
  const k = isKick(beatStart) ? interpolate(l, [0, 7], [1, 0], clamp) : 0;
  const drop = f >= T.services && f < T.showcase ? 1.6 : 1;
  const jx = (random(`x${beatStart}`) - 0.5) * 18 * k * drop;
  const jy = (random(`y${beatStart}`) - 0.5) * 18 * k * drop;
  return (
    <AbsoluteFill style={{ scale: 1 + 0.03 * k * drop, translate: `${jx}px ${jy}px` }}>{children}</AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{ opacity: 0.09, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`n${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Showreel HUD: brand, section, timecode, coordinates. Difference-blended so it reads on any colour.
const Hud: React.FC = () => {
  const f = useCurrentFrame();
  const t = useT();
  const { portrait } = useLayout();
  if (f < T.words || f >= T.end) return null;
  const section =
    f < T.brand ? t.sections[0] : f < T.services ? t.sections[1] : f < T.showcase ? t.sections[2] : f < T.trusted ? t.sections[3] : f < T.finale ? t.sections[4] : t.sections[5];
  const s = Math.floor(f / 30);
  const tc = `00:00:${String(s).padStart(2, "0")}:${String(f % 30).padStart(2, "0")}`;
  const m = portrait ? 70 : 50;
  const base: React.CSSProperties = { position: "absolute", fontFamily: "Mono", fontSize: 24, color: "#fff", letterSpacing: 2 };
  return (
    <AbsoluteFill style={{ mixBlendMode: "difference", pointerEvents: "none" }}>
      <div style={{ ...base, top: m, left: m, fontFamily: "Inter", fontWeight: 900, fontSize: 28, letterSpacing: 4 }}>PUBGMEDIA</div>
      <div style={{ ...base, top: m, right: m, fontFamily: t.f.mono, fontWeight: 800, direction: t.f.dir, letterSpacing: t.ar ? 0 : 2 }}>{section}</div>
      <div style={{ ...base, bottom: m, left: m }}>{tc}</div>
      <div style={{ ...base, bottom: m, right: m }}>41.0082°N 28.9784°E</div>
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${(f / TOTAL) * 100}%`, background: "#fff" }} />
    </AbsoluteFill>
  );
};

export const Hype: React.FC<HypeProps> = ({ lang }) => (
  <LangProvider lang={lang}>
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile("music.wav")} />
      <Camera>
        <Sequence from={T.hook} durationInFrames={T.words - T.hook} name="Hook"><Hook /></Sequence>
        <Sequence from={T.words} durationInFrames={T.brand - T.words} name="Beat words"><BeatWords /></Sequence>
        <Sequence from={T.brand} durationInFrames={T.services - T.brand} name="Brand"><Brand /></Sequence>
        {Array.from({ length: 6 }).map((_, i) => (
          <Sequence
            key={i}
            from={T.services + i * SERVICE_LEN}
            // overlap so the next scene's wipe reveals over the previous one
            durationInFrames={i === 5 ? SERVICE_LEN : SERVICE_LEN + 8}
            name={`Service ${i + 1}`}
          >
            <ServiceScene index={i} />
          </Sequence>
        ))}
        <Sequence from={T.showcase} durationInFrames={T.trusted - T.showcase} name="Showcase"><Showcase /></Sequence>
        <Sequence from={T.trusted} durationInFrames={T.finale - T.trusted} name="Trusted by"><Trusted /></Sequence>
        <Sequence from={T.finale} durationInFrames={T.end - T.finale} name="Finale"><Finale /></Sequence>
        <Sequence from={T.end} durationInFrames={TOTAL - T.end} name="End card"><EndCard /></Sequence>
      </Camera>
      <Hud />
      <Grain />
    </AbsoluteFill>
  </LangProvider>
);
