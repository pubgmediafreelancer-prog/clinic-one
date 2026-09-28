// Usage: node scripts/stills.mjs <compId> <frame,frame,...> <outPrefix>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [id, frames, prefix] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const ids = id.split(",");
for (const cid of ids) {
  const composition = await selectComposition({ serveUrl, id: cid, browserExecutable });
  for (const fr of frames.split(",").map(Number)) {
    await renderStill({ serveUrl, composition, frame: fr, output: `${prefix}${cid}-${String(fr).padStart(3, "0")}.jpg`, imageFormat: "jpeg", browserExecutable, scale: 0.4 });
  }
}
console.log("done");
