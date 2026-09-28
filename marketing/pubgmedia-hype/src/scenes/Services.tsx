import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, C, chroma, clamp, fitSize, hit, tw, useLayout, useT, backOut } from "../lib";

/* Six services, 45 frames (3 beats) each. Every scene gets its own colourway,
   wipe direction and a bespoke visual drawn in an 800×800 space. */

type Theme = { bg: string; fg: string; accent: string; muted: string };
const THEMES: Theme[] = [
  { bg: C.ink, fg: C.cream, accent: C.teal, muted: "#26262A" },
  { bg: C.cream, fg: C.ink, accent: C.red, muted: "#DDD5C4" },
  { bg: C.red, fg: C.ink, accent: C.cream, muted: "#D8321A" },
  { bg: C.teal, fg: C.ink, accent: C.cream, muted: "#0C9488" },
  { bg: C.gold, fg: C.ink, accent: C.ink, muted: "#CF9A3C" },
  { bg: C.violet, fg: C.cream, accent: C.gold, muted: "#3A1FD6" },
];
// wipe origins: from left, top, right, bottom, circle, diagonal
const WIPES = [
  (p: number) => `inset(0 ${100 - p * 100}% 0 0)`,
  (p: number) => `inset(0 0 ${100 - p * 100}% 0)`,
  (p: number) => `inset(0 0 0 ${100 - p * 100}%)`,
  (p: number) => `inset(${100 - p * 100}% 0 0 0)`,
  (p: number) => `circle(${p * 75}% at 50% 50%)`,
  (p: number) => `polygon(0 0, ${p * 200}% 0, ${p * 200 - 100}% 100%, 0 100%)`,
];

/* ---------- visuals ---------- */
const SEO: React.FC<{ f: number; th: Theme }> = ({ f, th }) => {
  const query = "digital agency istanbul";
  const typed = query.slice(0, Math.floor(tw(f, [0, 14], [0, query.length], (x) => x)));
  const climb = tw(f, [16, 32], [4, 0]);
  const rows = 5;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 40, right: 40, top: 40, height: 90, borderRadius: 45, border: `4px solid ${th.fg}`, display: "flex", alignItems: "center", padding: "0 36px", gap: 22, fontFamily: "Inter", fontWeight: 500, fontSize: 36, color: th.fg }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, border: `5px solid ${th.accent}` }} />
        {typed}
        <span style={{ opacity: Math.floor(f / 4) % 2 ? 0 : 1 }}>|</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => {
        const ours = i === 0;
        // ours climbs from slot 4 to slot 0; the others step down as it passes
        const base = i - 1;
        const y = ours ? 180 + climb * 118 : 180 + (base + Math.min(1, Math.max(0, base + 1 - climb))) * 118;
        const appear = tw(f, [4 + i * 2, 12 + i * 2], [0, 1]);
        return (
          <div key={i} style={{ position: "absolute", left: 40, right: 40, top: y, height: 96, borderRadius: 18, background: ours ? th.accent : th.muted, opacity: appear, scale: ours ? 1 + 0.06 * hit(f, 32, 10) : 1, display: "flex", alignItems: "center", padding: "0 30px", gap: 22, zIndex: ours ? 2 : 1 }}>
            <div style={{ fontFamily: "Mono", fontSize: 30, color: ours ? C.ink : th.fg, opacity: 0.8 }}>{ours ? `#${Math.round(climb) + 1}` : ""}</div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 16, width: ours ? "70%" : `${50 + ((i * 37) % 35)}%`, background: ours ? C.ink : th.fg, opacity: ours ? 0.9 : 0.25, borderRadius: 8 }} />
              <div style={{ height: 12, width: "45%", marginTop: 14, background: ours ? C.ink : th.fg, opacity: ours ? 0.5 : 0.15, borderRadius: 6 }} />
            </div>
            {ours && <div style={{ fontFamily: "Mono", fontSize: 26, color: C.ink }}>pubgmedia.online</div>}
          </div>
        );
      })}
    </div>
  );
};

const Web: React.FC<{ f: number; th: Theme }> = ({ f, th }) => {
  const pop = (d: number) => tw(f, [d, d + 8], [0, 1], backOut);
  const cx = interpolate(f, [18, 32], [700, 400], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const cy = interpolate(f, [18, 32], [760, 560], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const click = hit(f, 33, 10);
  const phone = tw(f, [20, 32], [500, 0]);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 20, top: 60, width: 640, height: 600, borderRadius: 24, border: `5px solid ${th.fg}`, overflow: "hidden", background: C.cream }}>
        <div style={{ height: 50, borderBottom: `4px solid ${th.fg}`, display: "flex", gap: 12, alignItems: "center", padding: "0 20px" }}>
          {[C.red, C.gold, C.teal].map((c) => <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />)}
        </div>
        <div style={{ margin: 30, height: 190, borderRadius: 16, background: C.ink, scale: `${pop(2)} 1`, transformOrigin: "left" }}>
          <div style={{ padding: 30, fontFamily: "Anton", fontSize: 64, color: C.cream, opacity: pop(8) }}>GROW.</div>
        </div>
        <div style={{ display: "flex", gap: 20, margin: "0 30px" }}>
          {[C.teal, C.gold, C.red].map((c, i) => (
            <div key={c} style={{ flex: 1, height: 130, borderRadius: 14, background: c, scale: pop(6 + i * 3) }} />
          ))}
        </div>
        <div style={{ margin: 30, width: 220, height: 64, borderRadius: 32, background: C.ink, scale: pop(14) * (1 - 0.08 * click), boxShadow: `0 0 0 ${click * 30}px rgba(15,181,166,${click * 0.5})` }} />
      </div>
      <div style={{ position: "absolute", left: 560, top: 250, width: 220, height: 440, borderRadius: 36, border: `5px solid ${th.fg}`, background: C.ink, translate: `${phone}px 0`, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ height: 120, borderRadius: 16, background: C.teal }} />
        <div style={{ height: 60, borderRadius: 12, background: C.gold }} />
        <div style={{ height: 60, borderRadius: 12, background: C.red }} />
        <div style={{ height: 40, width: 120, borderRadius: 20, background: C.cream }} />
      </div>
      <svg width="60" height="60" viewBox="0 0 24 24" style={{ position: "absolute", left: cx, top: cy }}>
        <path d="M3 2l7 19 2.5-7.5L20 11z" fill={C.ink} stroke={C.cream} strokeWidth="1.5" />
      </svg>
    </div>
  );
};

const Ads: React.FC<{ f: number; th: Theme }> = ({ f, th }) => {
  const bars = [0.25, 0.35, 0.3, 0.5, 0.6, 0.78, 0.95];
  const cpa = [0.9, 0.82, 0.7, 0.62, 0.45, 0.35, 0.22];
  const draw = tw(f, [10, 34], [0, 1]);
  const pts = cpa.map((v, i) => `${90 + i * 105},${700 - v * 560}`).join(" ");
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {bars.map((v, i) => (
        <div key={i} style={{ position: "absolute", bottom: 100, left: 50 + i * 105, width: 80, height: 560 * v * tw(f, [i * 2, 12 + i * 2], [0, 1]), background: th.fg, borderRadius: "10px 10px 0 0" }} />
      ))}
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 96, height: 6, background: th.fg }} />
      <svg width="800" height="800" style={{ position: "absolute", inset: 0 }}>
        <polyline points={pts} fill="none" stroke={C.cream} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
      </svg>
      <div style={{ position: "absolute", right: 20, top: 30, padding: "14px 26px", borderRadius: 40, background: C.ink, color: C.cream, fontFamily: "Mono", fontSize: 34, scale: tw(f, [30, 38], [0, 1], backOut) }}>CPA ↓ &nbsp;ROAS ↑</div>
    </div>
  );
};

const Heart: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill={color} /></svg>
);

const Social: React.FC<{ f: number; th: Theme }> = ({ f, th }) => {
  const cols = [C.ink, C.cream, C.gold, C.red, C.ink, C.cream, C.violet, C.gold, C.ink];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 100, top: 100, width: 600, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {cols.map((c, i) => {
          const d = [0, 1, 2, 1, 2, 3, 2, 3, 4][i] * 3;
          const p = tw(f, [d, d + 8], [0, 1], backOut);
          return <div key={i} style={{ aspectRatio: "1", background: c, borderRadius: 14, scale: p, rotate: `${(1 - p) * 30}deg` }} />;
        })}
      </div>
      {Array.from({ length: 7 }).map((_, i) => {
        const start = 12 + i * 3;
        const life = interpolate(f, [start, start + 26], [0, 1], clamp);
        return (
          <div key={i} style={{ position: "absolute", left: 140 + ((i * 97) % 520), top: 700 - life * 520, opacity: life > 0 && life < 1 ? 1 - life * 0.8 : 0, scale: 0.6 + life }}>
            <Heart size={70} color={i % 2 ? C.red : C.cream} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 420, top: 40, padding: "12px 24px", borderRadius: 30, background: C.red, color: C.cream, fontFamily: "Mono", fontSize: 30, display: "flex", gap: 10, alignItems: "center", scale: tw(f, [20, 28], [0, 1], backOut) }}>
        <Heart size={30} color={C.cream} /> +1K
      </div>
      <div style={{ position: "absolute", left: 20, top: 640, padding: "12px 24px", borderRadius: 30, background: C.ink, color: C.cream, fontFamily: "Mono", fontSize: 28, scale: tw(f, [26, 34], [0, 1], backOut), border: `3px solid ${th.accent}` }}>
        ● posting daily
      </div>
    </div>
  );
};

const Branding: React.FC<{ f: number; th: Theme }> = ({ f }) => {
  const m = tw(f, [0, 40], [0, 3], (x) => x);
  const stage = Math.floor(m);
  const k = m - stage;
  const radii = ["50%", "12%", "50% 0 50% 0", "0"];
  const r = k < 0.5 ? radii[stage] : radii[Math.min(3, stage + 1)];
  const rot = interpolate(f, [0, 45], [0, 270]);
  const guide = tw(f, [0, 18], [0, 1]);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width="800" height="800" style={{ position: "absolute", inset: 0 }}>
        {[180, 260, 340].map((rr, i) => (
          <circle key={rr} cx="400" cy="400" r={rr} fill="none" stroke={C.ink} strokeWidth="2" strokeDasharray="8 10" pathLength={1} opacity={0.5} style={{ strokeDasharray: 1, strokeDashoffset: 1 - tw(f, [i * 3, 14 + i * 3], [0, 1]) }} />
        ))}
        <line x1="0" y1="400" x2={800 * guide} y2="400" stroke={C.ink} strokeWidth="2" opacity={0.5} />
        <line x1="400" y1="0" x2="400" y2={800 * guide} stroke={C.ink} strokeWidth="2" opacity={0.5} />
      </svg>
      <div style={{ position: "absolute", left: 220, top: 220, width: 360, height: 360, background: C.ink, borderRadius: r, rotate: `${rot}deg`, scale: 1 + 0.12 * hit(f % BEAT, 0, 8), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Anton", fontSize: 220, color: C.gold, rotate: `${-rot}deg`, opacity: tw(f, [22, 30], [0, 1]) }}>P</div>
      </div>
      {/* bezier handle, like a pen tool */}
      <svg width="800" height="800" style={{ position: "absolute", inset: 0 }}>
        <path d="M 80 700 C 200 520, 600 880, 720 640" fill="none" stroke={C.cream} strokeWidth="8" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - tw(f, [8, 30], [0, 1])} />
        <line x1="80" y1="700" x2="200" y2="520" stroke={C.ink} strokeWidth="3" opacity={tw(f, [8, 12], [0, 1])} />
        <rect x="190" y="510" width="20" height="20" fill={C.cream} stroke={C.ink} strokeWidth="3" opacity={tw(f, [8, 12], [0, 1])} />
        <circle cx="80" cy="700" r="12" fill={C.ink} />
        <circle cx="720" cy="640" r="12" fill={C.ink} opacity={tw(f, [28, 32], [0, 1])} />
      </svg>
    </div>
  );
};

const Automation: React.FC<{ f: number; th: Theme }> = ({ f, th }) => {
  const nodes = [
    { x: 60, y: 340, label: "Trigger", c: C.gold },
    { x: 300, y: 140, label: "AI Agent", c: C.cream },
    { x: 300, y: 540, label: "CRM", c: C.teal },
    { x: 560, y: 340, label: "WhatsApp", c: C.red },
    { x: 560, y: 620, label: "Report", c: C.cream },
  ];
  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4]];
  const W = 190, H = 96;
  const path = (a: number, b: number) => {
    const A = nodes[a], B = nodes[b];
    const x1 = A.x + W, y1 = A.y + H / 2, x2 = B.x, y2 = B.y + H / 2;
    const mx = (x1 + x2) / 2;
    return { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, x1, y1, x2, y2, mx };
  };
  const bez = (p: ReturnType<typeof path>, t: number) => {
    const u = 1 - t;
    return {
      x: u ** 3 * p.x1 + 3 * u * u * t * p.mx + 3 * u * t * t * p.mx + t ** 3 * p.x2,
      y: u ** 3 * p.y1 + 3 * u * u * t * p.y1 + 3 * u * t * t * p.y2 + t ** 3 * p.y2,
    };
  };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width="800" height="800" style={{ position: "absolute", inset: 0 }}>
        {edges.map(([a, b], i) => {
          const p = path(a, b);
          return <path key={i} d={p.d} fill="none" stroke={th.fg} strokeWidth="5" opacity={0.7} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - tw(f, [4 + i * 2, 16 + i * 2], [0, 1])} />;
        })}
        {edges.map(([a, b], i) => {
          const p = path(a, b);
          const t = ((f - 14 - i * 3) / 14) % 1;
          if (f < 14 + i * 3) return null;
          const q = bez(p, t);
          return <circle key={`d${i}`} cx={q.x} cy={q.y} r="12" fill={C.gold} style={{ filter: `drop-shadow(0 0 10px ${C.gold})` }} />;
        })}
      </svg>
      {nodes.map((n, i) => (
        <div key={i} style={{ position: "absolute", left: n.x, top: n.y, width: W, height: H, borderRadius: 20, background: C.ink, border: `4px solid ${n.c}`, display: "flex", alignItems: "center", gap: 14, padding: "0 18px", scale: tw(f, [i * 3, i * 3 + 8], [0, 1], backOut), fontFamily: "Inter", fontWeight: 800, fontSize: 26, color: C.cream }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: n.c, flexShrink: 0 }} />
          {n.label}
        </div>
      ))}
    </div>
  );
};

const VISUALS = [SEO, Web, Ads, Social, Branding, Automation];

/* ---------- frame ---------- */
export const ServiceScene: React.FC<{ index: number }> = ({ index }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { w, h, portrait, landscape } = useLayout();
  const t = useT();
  const th = THEMES[index];
  const s = t.services[index];
  const Visual = VISUALS[index];

  const wipe = tw(f, [0, 7], [0, 1]);
  const clip = WIPES[index](wipe);

  // layout regions
  const pad = portrait ? 80 : 90;
  const box = portrait
    ? { x: 60, y: 330, w: w - 120, h: 860 }
    : landscape
      ? { x: w * 0.5, y: 120, w: w * 0.45, h: h - 240 }
      : { x: w * 0.44, y: h * 0.44, w: w * 0.54, h: h * 0.52 };
  const vs = Math.min(box.w, box.h) / 800;

  const titleMaxW = portrait ? w - pad * 2 : landscape ? w * 0.44 : w * 0.9;
  const titleSize = fitSize(s.title, titleMaxW, portrait ? 330 : landscape ? 380 : 230, t.ar);
  const titleIn = spring({ frame: f - 3, fps, config: { damping: 14, stiffness: 180 } });
  const kickIn = tw(f, [8, 18], [0, 1]);
  const ghost = interpolate(f, [0, 45], [0, -80]);

  const textBlock: React.CSSProperties = portrait
    ? { left: pad, right: pad, top: 1230 }
    : landscape
      ? { left: pad, width: w * 0.42, top: h * 0.22 }
      : { left: pad * 0.7, right: pad * 0.7, top: 110 };

  return (
    <AbsoluteFill style={{ clipPath: clip, background: th.bg, overflow: "hidden" }}>
      {/* ghost number, huge outline, drifts for parallax */}
      <div
        style={{
          position: "absolute",
          right: -40 + ghost,
          bottom: -h * 0.08,
          fontFamily: "Anton",
          fontSize: Math.max(w, h) * 0.55,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `3px ${th.fg}`,
          opacity: 0.18,
        }}
      >
        {`0${index + 1}`}
      </div>

      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 800, height: 800, position: "relative", scale: vs * tw(f, [2, 14], [0.85, 1]), flexShrink: 0, direction: "ltr" }}>
          <Visual f={f} th={th} />
        </div>
      </div>

      <div style={{ position: "absolute", ...textBlock, direction: t.f.dir, textAlign: t.ar ? "right" : "left" }}>
        <div style={{ fontFamily: "Mono", fontSize: 30, color: th.fg, opacity: 0.8, letterSpacing: 2, direction: "ltr", textAlign: t.ar ? "right" : "left" }}>
          ({s.num}) — {`0${index + 1}/06`}
        </div>
        <div
          style={{
            fontFamily: t.f.display,
            fontWeight: 900,
            fontSize: titleSize,
            lineHeight: t.ar ? 1.25 : 1,
            color: th.fg,
            whiteSpace: "nowrap",
            translate: `0 ${(1 - titleIn) * 60}px`,
            opacity: Math.min(1, titleIn * 1.5),
            textShadow: chroma(14 * hit(f, 3, 8)),
          }}
        >
          {s.title}
        </div>
        <div
          style={{
            fontFamily: t.f.heavy,
            fontWeight: 800,
            fontSize: portrait ? 58 : landscape ? 60 : 44,
            lineHeight: 1.2,
            color: th.fg,
            marginTop: 18,
            opacity: kickIn,
            translate: `${(1 - kickIn) * (t.ar ? 40 : -40)}px 0`,
          }}
        >
          {s.kicker}
        </div>
      </div>
    </AbsoluteFill>
  );
};
