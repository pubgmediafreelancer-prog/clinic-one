# PUBGMEDIA — 30s hype reel

Code-built motion piece (Remotion). 120 BPM, one beat = 15 frames, so every cut, slam and colour flip lands on the kick.

**Renders** (`renders/`): EN and AR in 9:16 (1080×1920), 1:1 (1080×1080) and 16:9 (1920×1080), 30fps, H.264 + AAC.

## Timeline
| Time | Scene | Technique |
|---|---|---|
| 0–2s | Hook: INVISIBLE? → UNMISSABLE. | glitch slices, RGB split, colour invert, zoom-through |
| 2–4s | SEEN. CLICKED. CHOSEN. GROWN. | one word per beat, shape play, 4 colourways |
| 4–8s | Wordmark + "We grow your ___" | shapes lock into the mark, slot-machine ticker |
| 8–17s | 6 services (SEO, Web, Ads, Social, Brand, AI + n8n) | wipes, bespoke visual per service, drop |
| 17–21s | Clinic One showcase | 3D dashboard with camera move, half-time |
| 21–24s | Trusted by | tilted marquee, accelerating into the riser |
| 24–27s | READY? LET'S MAKE IT GROW. | colour strobe on 16ths |
| 27–30s | End card | pubgmedia.online · WhatsApp |

Copy lives in `src/copy.ts` (EN + AR). Scene timings in `src/lib.tsx` (`T`) mirror `scripts/gen_music.py`.

## Rebuild
```
npm i
python3 scripts/gen_music.py      # regenerates public/music.wav (needs numpy)
npx remotion studio               # preview
npx remotion render Hype-EN-9x16 renders/PUBGMEDIA-hype-EN-9x16.mp4 --crf=18
```
Compositions: `Hype-{EN,AR}-{9x16,1x1,16x9}`.
