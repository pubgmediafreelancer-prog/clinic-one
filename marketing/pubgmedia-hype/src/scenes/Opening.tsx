import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { BEAT, C, chroma, clamp, fitSize, hit, inOut, tw, useLayout, useT, backOut } from "../lib";

/* ---------- Scene 1 · HOOK (0–60) ----------
   Frame 0 is already a full-bleed slam: the thumbnail frame. */
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h, portrait } = useLayout();
  const t = useT();
  const flipped = f >= 30;
  const word = flipped ? t.hookB : t.hookA;
  const size = fitSize(word, w * 0.84, portrait ? h * 0.2 : h * 0.42, t.ar);

  const local = flipped ? f - 30 : f;
  const slam = tw(local, [0, 7], [flipped ? 1.5 : 1.12, 1]);
  const ab = 26 * hit(local, 0, 12) + (f > 22 && f < 30 ? 14 : 0);
  // zoom-through in the last 8 frames
  const zoom = interpolate(f, [52, 60], [1, 14], { ...clamp, easing: inOut });

  const bg = flipped ? C.cream : C.ink;
  const fg = flipped ? C.ink : C.cream;

  // glitch slices: frames where the word tears horizontally
  const glitching = (f >= 2 && f < 10) || (f >= 22 && f < 30) || (f >= 44 && f < 48);
  const slices = 7;

  const text = (dx: number, clip?: string, key?: number) => (
    <div
      key={key}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        clipPath: clip,
        translate: `${dx}px 0`,
      }}
    >
      <div
        style={{
          fontFamily: t.f.display,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1,
          color: fg,
          direction: t.f.dir,
          whiteSpace: "nowrap",
          textShadow: chroma(ab),
          letterSpacing: t.ar ? 0 : -2,
        }}
      >
        {word}
      </div>
    </div>
  );

  // red bar slicing through right before the flip
  const barX = interpolate(f, [18, 30], [-1.2, 1.2], clamp);
  // expanding ring behind the second word
  const ring = tw(f, [30, 50], [0, 1]);

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: zoom, transformOrigin: "50% 50%" }}>
        {flipped && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: Math.max(w, h) * 1.4 * ring,
              height: Math.max(w, h) * 1.4 * ring,
              translate: "-50% -50%",
              borderRadius: "50%",
              border: `${40 * (1 - ring) + 4}px solid ${C.teal}`,
              opacity: 1 - ring * 0.6,
            }}
          />
        )}
        <AbsoluteFill style={{ scale: slam }}>
          {glitching
            ? Array.from({ length: slices }).map((_, i) => {
                const top = (i / slices) * 100;
                const bot = 100 - ((i + 1) / slices) * 100;
                const dx = (random(`g${Math.floor(f / 2)}-${i}`) - 0.5) * w * 0.12;
                return text(dx, `inset(${top}% 0 ${bot}% 0)`, i);
              })
            : text(0)}
        </AbsoluteFill>
        {f >= 16 && f < 30 && (
          <div
            style={{
              position: "absolute",
              left: `${barX * 100}%`,
              top: "44%",
              width: "120%",
              height: size * 0.18,
              background: C.red,
              rotate: "-8deg",
              mixBlendMode: "difference",
            }}
          />
        )}
      </AbsoluteFill>
      {/* impact flash, never fully white so frame 0 still reads */}
      <AbsoluteFill style={{ background: "#fff", opacity: (f === 0 ? 0 : 0.45 * hit(f, 1, 4)) + 0.5 * hit(f, 30, 5) }} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 2 · BEAT WORDS (60–120) ----------
   One word per beat, each with its own colour, shape and entrance. */
const PALETTES = [
  { bg: C.red, fg: C.ink, shape: C.gold },
  { bg: C.teal, fg: C.ink, shape: C.cream },
  { bg: C.gold, fg: C.ink, shape: C.red },
  { bg: C.ink, fg: C.cream, shape: C.teal },
];

export const BeatWords: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h, portrait } = useLayout();
  const t = useT();
  const i = Math.min(3, Math.floor(f / BEAT));
  const l = f - i * BEAT;
  const p = PALETTES[i];
  const word = t.beats[i];
  const size = fitSize(word, w * 0.86, portrait ? h * 0.22 : h * 0.4, t.ar);
  const S = Math.min(w, h);

  let style: React.CSSProperties = {};
  if (i === 0) style = { scale: tw(l, [0, 6], [2.4, 1]) };
  if (i === 1) style = { translate: `0 ${tw(l, [0, 7], [110, 0])}%` };
  if (i === 2)
    style = t.ar
      ? { filter: `blur(${tw(l, [0, 7], [30, 0])}px)`, scale: tw(l, [0, 7], [0.7, 1]) }
      : { letterSpacing: `${tw(l, [0, 8], [0.6, -0.01])}em` };
  if (i === 3) style = { rotate: `${tw(l, [0, 8], [-18, 0], backOut)}deg`, scale: tw(l, [0, 8], [0.4, 1], backOut) };

  const spin = l * 3 + i * 40;
  const shapeSize = S * tw(l, [0, 10], [0.2, 0.95]);
  const shapes: React.CSSProperties[] = [
    { borderRadius: "50%" },
    { borderRadius: 0, rotate: `${spin}deg` },
    { clipPath: "polygon(50% 0, 100% 100%, 0 100%)", rotate: `${-spin}deg` },
    { borderRadius: "50%", background: "transparent", border: `${S * 0.05}px solid ${p.shape}` },
  ];

  return (
    <AbsoluteFill style={{ background: p.bg, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          width: shapeSize,
          height: shapeSize,
          background: p.shape,
          opacity: 0.9,
          ...shapes[i],
        }}
      />
      {/* tiny counter, like a take number */}
      <div
        style={{
          position: "absolute",
          top: h * 0.5 + size * 0.75,
          fontFamily: "Mono",
          fontSize: 28,
          color: p.fg,
          letterSpacing: 4,
        }}
      >
        {`0${i + 1} / 04`}
      </div>
      <div style={{ position: "relative", overflow: i === 1 ? "hidden" : "visible", padding: "0 20px" }}>
        <div
          style={{
            fontFamily: t.f.display,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.05,
            color: p.fg,
            direction: t.f.dir,
            whiteSpace: "nowrap",
            textShadow: chroma(12 * hit(l, 0, 6)),
            ...style,
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 3 · BRAND (120–240) ----------
   0–60: shapes fly in and lock into the wordmark.
   60–120: "We grow your ___" slot-machine on the beat. */
const MARK_SHAPES = [
  { c: C.teal, r: "50%", from: [-1, -1] },
  { c: C.gold, r: "0", from: [1, -1] },
  { c: C.red, r: "tri", from: [-1, 1] },
  { c: C.cream, r: "8%", from: [1, 1] },
];

export const ShapeRow: React.FC<{ size: number; f: number; enterAt?: number; spread: number }> = ({ size, f, enterAt = 0, spread }) => (
  <div style={{ display: "flex", gap: size * 0.35 }}>
    {MARK_SHAPES.map((s, i) => {
      const p = tw(f, [enterAt + i * 2, enterAt + 14 + i * 2], [0, 1]);
      return (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            background: s.c,
            borderRadius: s.r === "tri" ? 0 : s.r,
            clipPath: s.r === "tri" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
            translate: `${s.from[0] * spread * (1 - p)}px ${s.from[1] * spread * (1 - p)}px`,
            rotate: `${(1 - p) * 360 * (i % 2 ? 1 : -1)}deg`,
            scale: 0.3 + 0.7 * p,
          }}
        />
      );
    })}
  </div>
);

export const Wordmark: React.FC<{ size: number; f: number; start: number; color?: string }> = ({ size, f, start, color = C.cream }) => {
  const letters = "PUBGMEDIA".split("");
  return (
    <div style={{ display: "flex", fontFamily: "Anton", fontSize: size, lineHeight: 1.05, color, overflow: "hidden", direction: "ltr" }}>
      {letters.map((ch, i) => {
        const p = tw(f, [start + i * 1.5, start + 10 + i * 1.5], [0, 1]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              translate: `0 ${(1 - p) * 110}%`,
              color: i >= 4 ? C.teal : color,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const Brand: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h, portrait } = useLayout();
  const t = useT();

  if (f < 60) {
    const size = Math.min(w * 0.9 / (9 * 0.47), h * 0.3);
    const push = interpolate(f, [0, 60], [1, 1.1]);
    const tilt = interpolate(f, [0, 60], [-4, 0]);
    return (
      <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Grid />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: push, rotate: `${tilt}deg`, gap: size * 0.2 }}>
          <ShapeRow size={size * 0.28} f={f} spread={Math.max(w, h) * 0.6} />
          <Wordmark size={size} f={f} start={12} />
          <div
            style={{
              fontFamily: t.f.mono,
              fontWeight: 800,
              fontSize: portrait ? 30 : 32,
              letterSpacing: t.ar ? 0 : 6,
              color: C.cream,
              opacity: tw(f, [30, 42], [0, 1]),
              direction: t.f.dir,
            }}
          >
            {t.tagline}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const l = f - 60;
  const i = Math.min(3, Math.floor(l / BEAT));
  const bl = l - i * BEAT;
  const bgs = [C.cream, C.cream, C.ink, C.ink];
  const fg = i < 2 ? C.ink : C.cream;
  const accent = [C.red, C.teal, C.gold, C.teal][i];
  const longest = t.growWords.reduce((a, b) => (a.length > b.length ? a : b));
  const big = fitSize(longest, w * 0.88, portrait ? h * 0.16 : h * 0.3, t.ar);
  const lead = big * 0.42;
  const roll = tw(bl, [0, 7], [1, 0]);

  return (
    <AbsoluteFill style={{ background: bgs[i], alignItems: "center", justifyContent: "center", overflow: "hidden", direction: t.f.dir }}>
      <div
        style={{
          position: "absolute",
          width: w * 1.5,
          height: big * 1.25,
          background: accent,
          rotate: "-6deg",
          scale: `${tw(bl, [0, 8], [0, 1])} 1`,
        }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ fontFamily: t.f.heavy, fontWeight: 900, fontSize: lead, color: fg, letterSpacing: t.ar ? 0 : -1 }}>{t.growLead}</div>
        <div style={{ height: big * 1.15, overflow: "hidden", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: t.f.display,
              fontWeight: 900,
              fontSize: big,
              lineHeight: 1.15,
              color: i < 2 ? C.ink : C.cream,
              translate: `0 ${roll * 100}%`,
              textShadow: chroma(10 * hit(bl, 0, 6)),
              whiteSpace: "nowrap",
            }}
          >
            {t.growWords[i]}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Grid: React.FC<{ color?: string; opacity?: number }> = ({ color = C.cream, opacity = 0.07 }) => (
  <AbsoluteFill
    style={{
      opacity,
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: "90px 90px",
      backgroundPosition: "center center",
    }}
  />
);

