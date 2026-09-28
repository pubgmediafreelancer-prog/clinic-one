import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CLIENTS } from "../copy";
import { BEAT, C, chroma, clamp, fitSize, hit, inOut, tw, useLayout, useT, backOut } from "../lib";
import { Grid, ShapeRow, Wordmark } from "./Opening";

/* ---------- Scene 5 · SHOWCASE (510–630) ----------
   Clinic One, from the clinic-one repo: a 3D dashboard with a camera move. */
const TEETH = 16;
const STATUS = [C.teal, C.gold, C.red, C.cream];

const Dashboard: React.FC<{ f: number }> = ({ f }) => {
  const menu = ["Dashboard", "Patients", "Appointments", "Invoices", "Prescriptions", "Specialty"];
  const kpis = [
    { k: "Patients", v: 1284, c: C.teal },
    { k: "Today", v: 36, c: C.gold },
    { k: "Plans", v: 212, c: C.red },
  ];
  return (
    <div style={{ width: 1100, height: 680, borderRadius: 28, background: "#111114", border: "2px solid #2A2A30", display: "flex", overflow: "hidden", fontFamily: "Inter", color: C.cream, boxShadow: `0 60px 120px rgba(0,0,0,0.6), 0 0 120px rgba(15,181,166,0.25)` }}>
      <div style={{ width: 250, background: "#0C0C0E", padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.teal }} />
          <div style={{ fontWeight: 900, fontSize: 24 }}>Clinic One</div>
        </div>
        {menu.map((m, i) => (
          <div key={m} style={{ padding: "12px 16px", borderRadius: 12, fontWeight: 500, fontSize: 19, background: i === Math.floor(f / 30) % 6 ? "rgba(15,181,166,0.18)" : "transparent", color: i === Math.floor(f / 30) % 6 ? C.teal : "#9A978F" }}>
            {m}
          </div>
        ))}
        <div style={{ marginTop: "auto", fontFamily: "CairoAr", fontWeight: 800, fontSize: 22, color: "#9A978F", direction: "rtl" }}>كلينك ون</div>
      </div>
      <div style={{ flex: 1, padding: 34, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", gap: 20 }}>
          {kpis.map((k, i) => (
            <div key={k.k} style={{ flex: 1, padding: 22, borderRadius: 18, background: "#18181C", borderTop: `4px solid ${k.c}`, scale: tw(f, [4 + i * 3, 14 + i * 3], [0.6, 1], backOut) }}>
              <div style={{ fontSize: 17, color: "#9A978F" }}>{k.k}</div>
              <div style={{ fontWeight: 900, fontSize: 44 }}>{Math.round(k.v * tw(f, [4, 40], [0, 1])).toLocaleString("en-US")}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 24, borderRadius: 18, background: "#18181C" }}>
          <div style={{ fontSize: 18, color: "#9A978F", marginBottom: 16 }}>Dental chart · treatment plan</div>
          {[0, 1].map((row) => (
            <div key={row} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {Array.from({ length: TEETH }).map((_, i) => {
                const idx = row * TEETH + i;
                const on = f > 20 + ((idx * 7) % 32) * 1.6;
                const col = on && idx % 3 !== 0 ? STATUS[idx % 4] : "#2A2A30";
                return <div key={i} style={{ flex: 1, height: 58, borderRadius: row ? "6px 6px 18px 18px" : "18px 18px 6px 6px", background: col, scale: on ? 1 : 0.85 }} />;
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Dental", "OB/GYN", "Pediatrics", "Dermatology"].map((s, i) => (
            <div key={s} style={{ padding: "10px 20px", borderRadius: 30, border: `2px solid ${STATUS[i]}`, fontSize: 18, fontWeight: 800, color: STATUS[i], opacity: tw(f, [30 + i * 4, 38 + i * 4], [0, 1]) }}>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Showcase: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h, portrait, landscape } = useLayout();
  const t = useT();

  const rx = interpolate(f, [0, 120], [34, 10], { ...clamp, easing: inOut });
  const ry = interpolate(f, [0, 120], [-32, -8], { ...clamp, easing: inOut });
  const rz = interpolate(f, [0, 120], [8, 0], { ...clamp, easing: inOut });
  const dashScale = (portrait ? w * 1.2 : landscape ? w * 0.52 : w * 0.8) / 1100;
  const enter = tw(f, [0, 16], [0, 1]);

  const headSize = fitSize(t.showcaseHead, portrait ? w * 0.86 : landscape ? w * 0.38 : w * 0.86, portrait ? 150 : 140, t.ar, t.ar ? 0.5 : 0.44);
  const chip = Math.min(t.showcaseChips.length - 1, Math.floor(f / 24));
  const chipLocal = f - chip * 24;

  const headStyle: React.CSSProperties = portrait
    ? { left: 70, right: 70, top: 300 }
    : landscape
      ? { left: 110, width: w * 0.36, top: h * 0.26 }
      : { left: 60, right: 60, top: 90 };
  const dashPos: React.CSSProperties = portrait
    ? { left: w / 2, top: h * 0.64 }
    : landscape
      ? { left: w * 0.7, top: h * 0.54 }
      : { left: w / 2, top: h * 0.64 };

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", top: "55%", width: 1400, height: 1400, translate: "-50% -50%", background: `radial-gradient(circle, rgba(15,181,166,0.35), transparent 60%)`, scale: 0.8 + 0.2 * Math.sin(f / 10) }} />
      <Grid opacity={0.05} />

      <div style={{ position: "absolute", ...dashPos, perspective: 1800 }}>
        <div style={{ translate: "-50% -50%", scale: dashScale * (0.7 + 0.3 * enter), rotate: `${rz}deg`, transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, transformStyle: "preserve-3d", opacity: enter }}>
          <Dashboard f={f} />
          {/* floating feature chip, one per half-time beat */}
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -50,
              transform: `translateZ(${120 + 60 * hit(chipLocal, 0, 12)}px)`,
              padding: "20px 34px",
              borderRadius: 40,
              background: C.gold,
              color: C.ink,
              fontFamily: t.f.heavy,
              fontWeight: 900,
              fontSize: 40,
              direction: t.f.dir,
              scale: tw(chipLocal, [0, 8], [0.4, 1], backOut),
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
            }}
          >
            ✓ {t.showcaseChips[chip]}
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", ...headStyle, direction: t.f.dir, textAlign: t.ar ? "right" : "left" }}>
        <div style={{ fontFamily: t.f.display, fontWeight: 900, fontSize: headSize, lineHeight: t.ar ? 1.3 : 1.02, color: C.cream, textShadow: chroma(10 * hit(f, 0, 8)) }}>
          {(landscape ? t.showcaseHead.split(" ") : [t.showcaseHead]).map((wd, i) => (
            <span key={i} style={{ display: landscape ? "block" : "inline", opacity: tw(f, [i * 3, i * 3 + 8], [0, 1]) }}>
              {wd}{" "}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: t.f.mono, fontWeight: 800, fontSize: portrait ? 32 : 28, color: C.teal, marginTop: 20, opacity: tw(f, [10, 20], [0, 1]), letterSpacing: t.ar ? 0 : 1 }}>
          {t.showcaseSub}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 6 · TRUSTED BY (630–720) ----------
   Marquee rows in opposite directions, tilted camera, speeds up into the riser. */
export const Trusted: React.FC = () => {
  const f = useCurrentFrame();
  const { h, portrait } = useLayout();
  const t = useT();
  const rowH = portrait ? h / 7 : h / 4.2;
  const speed = (x: number) => x * 14 + Math.max(0, x - 50) ** 2 * 1.2; // accelerates in the last second
  const line = CLIENTS.join("  ·  ") + "  ·  ";
  const darken = f >= 75;
  const bg = darken ? C.ink : C.cream;
  const fg = darken ? C.cream : C.ink;
  const tilt = interpolate(f, [0, 90], [-10, -4]);
  const push = interpolate(f, [0, 90], [1.05, 1.25], { ...clamp, easing: inOut });
  const rows = portrait ? 7 : 5;

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ rotate: `${tilt}deg`, scale: push, justifyContent: "center" }}>
        {Array.from({ length: rows }).map((_, r) => {
          const dir = r % 2 ? 1 : -1;
          const x = ((speed(f) + r * 300) % 4000) * dir;
          const outline = r % 2 === 1;
          return (
            <div
              key={r}
              style={{
                whiteSpace: "nowrap",
                fontFamily: "Anton",
                fontSize: rowH * 0.8,
                lineHeight: 1.1,
                color: outline ? "transparent" : fg,
                WebkitTextStroke: outline ? `3px ${fg}` : undefined,
                translate: `${x - 2000}px 0`,
                filter: f > 60 ? `blur(${(f - 60) * 0.12}px)` : undefined,
                opacity: r === Math.floor(rows / 2) ? 0.25 : 1,
                direction: "ltr",
              }}
            >
              {line.repeat(3)}
            </div>
          );
        })}
      </AbsoluteFill>
      {/* the band */}
      <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "50%", translate: "0 -50%", rotate: "4deg", background: C.teal, padding: `${portrait ? 26 : 20}px 0`, display: "flex", justifyContent: "center", gap: 40, alignItems: "baseline", scale: `1 ${tw(f, [2, 10], [0, 1])}`, direction: t.f.dir }}>
        <div style={{ fontFamily: t.f.display, fontWeight: 900, fontSize: portrait ? 110 : 120, lineHeight: t.ar ? 1.3 : 1.05, color: C.ink, textShadow: chroma(8 * hit(f, 30, 6) + 8 * hit(f, 60, 6)) }}>{t.trusted}</div>
        {!portrait && <div style={{ fontFamily: t.f.mono, fontWeight: 800, fontSize: 34, color: C.ink }}>{t.reach}</div>}
      </div>
      {portrait && (
        <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.5 + 150, textAlign: "center", fontFamily: t.f.mono, fontWeight: 800, fontSize: 38, color: C.ink, background: C.gold, padding: "12px 0", rotate: "4deg", direction: t.f.dir, opacity: tw(f, [10, 18], [0, 1]) }}>
          {t.reach}
        </div>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: hit(f, 75, 6) * 0.7 }} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 7 · FINALE (720–810) ----------
   One word per beat with a colour shift, then the full line strobing into the end card. */
const FIN = [
  { bg: C.red, fg: C.ink },
  { bg: C.ink, fg: C.gold },
  { bg: C.teal, fg: C.ink },
  { bg: C.cream, fg: C.ink },
];

export const Finale: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h, portrait } = useLayout();
  const t = useT();
  const S = Math.min(w, h);

  if (f < 60) {
    const i = Math.floor(f / BEAT);
    const l = f - i * BEAT;
    const p = FIN[i];
    const word = t.finale[i];
    const size = fitSize(word, w * 0.86, portrait ? h * 0.22 : h * 0.45, t.ar);
    const styles: React.CSSProperties[] = [
      { scale: tw(l, [0, 6], [0.2, 1], backOut) },
      { color: "transparent", WebkitTextStroke: `${Math.max(3, size * 0.02)}px ${p.fg}`, scale: tw(l, [0, 8], [1.5, 1]) },
      { scale: `1 ${tw(l, [0, 8], [0.1, 1.25], backOut)}` },
      { skewX: t.ar ? undefined : "-10deg", scale: tw(l, [0, 6], [3, 1]) } as React.CSSProperties,
    ];
    return (
      <AbsoluteFill style={{ background: p.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {[0, 1, 2].map((k) => {
          const r = tw(l, [k * 2, 14 + k * 2], [0, 1]);
          return <div key={k} style={{ position: "absolute", width: S * 1.6 * r, height: S * 1.6 * r, borderRadius: i % 2 ? "12%" : "50%", rotate: `${i * 22}deg`, border: `${10 - k * 3}px solid ${p.fg}`, opacity: (1 - r) * 0.6 }} />;
        })}
        <div style={{ fontFamily: t.f.display, fontWeight: 900, fontSize: size, lineHeight: t.ar ? 1.3 : 1.05, color: p.fg, direction: t.f.dir, whiteSpace: "nowrap", textShadow: chroma(14 * hit(l, 0, 6)), ...styles[i] }}>
          {word}
        </div>
      </AbsoluteFill>
    );
  }

  // 16th-note strobe under a full-line build
  const l = f - 60;
  const strobe = Math.floor(l / 4) % 4;
  const bgs = [C.ink, C.red, C.ink, C.teal];
  const words = t.finaleLine.split(" ");
  const size = fitSize(words.reduce((a, b) => (a.length > b.length ? a : b)), w * 0.8, portrait ? h * 0.13 : h * 0.19, t.ar);
  const build = interpolate(l, [0, 30], [1, 1.25], { ...clamp, easing: (x) => x * x });
  return (
    <AbsoluteFill style={{ background: bgs[strobe], alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", scale: build, direction: t.f.dir }}>
        {words.map((wd, i) => (
          <div key={i} style={{ fontFamily: t.f.display, fontWeight: 900, fontSize: size, lineHeight: t.ar ? 1.25 : 0.98, color: i === strobe % words.length ? C.gold : C.cream, textShadow: chroma(6 + (l % 4) * 3), whiteSpace: "nowrap", opacity: tw(l, [i * 2, i * 2 + 4], [0, 1]) }}>
            {wd}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 8 · END CARD (810–900) ---------- */
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const { w, h, portrait } = useLayout();
  const t = useT();
  const size = Math.min((w * 0.84) / (9 * 0.47), h * 0.24);
  const push = interpolate(f, [0, 90], [1, 1.06]);
  const out = interpolate(f, [82, 90], [1, 0], clamp);
  const services = t.ar ? "سيو · مواقع · إعلانات · سوشيال · هوية · أتمتة" : "SEO · WEB · ADS · SOCIAL · BRANDING · AI AUTOMATION";

  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: out }}>
      <Grid opacity={0.06} />
      <AbsoluteFill style={{ background: "#fff", opacity: hit(f, 0, 8) }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: portrait ? 44 : 30, scale: push }}>
        <ShapeRow size={size * 0.24} f={f} enterAt={4} spread={Math.max(w, h) * 0.5} />
        <div style={{ textShadow: chroma(16 * hit(f, 0, 10)) }}>
          <Wordmark size={size} f={f} start={0} />
        </div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: portrait ? 58 : 50, color: C.cream, opacity: tw(f, [12, 22], [0, 1]), letterSpacing: 1 }}>
          pubgmedia.online
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", padding: "16px 34px", borderRadius: 60, background: C.cream, color: C.ink, fontFamily: t.f.heavy, fontWeight: 900, fontSize: portrait ? 40 : 34, scale: tw(f, [18, 28], [0.5, 1], backOut), opacity: tw(f, [18, 24], [0, 1]), direction: t.f.dir }}>
          <span>{t.whatsapp}</span>
          <span style={{ direction: "ltr", fontFamily: "Inter" }}>+90 553 704 5811</span>
        </div>
        <div style={{ fontFamily: t.f.mono, fontWeight: 800, fontSize: portrait ? 26 : 24, color: C.teal, letterSpacing: t.ar ? 0 : 3, opacity: tw(f, [26, 36], [0, 1]), direction: t.f.dir, textAlign: "center", maxWidth: w * 0.9 }}>
          {services}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
