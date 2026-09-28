#!/usr/bin/env python3
"""Auto-edit a talking-head Reel for the FREE version of DaVinci Resolve.

Pipeline:
  1. Probe the video and clean the audio (ffmpeg).
  2. Transcribe with word timestamps (faster-whisper).
  3. Cut silences, filler words and bad takes (keeps the last take).
  4. Write an FCPXML timeline (File > Import > Timeline in Resolve)
     with punch-in zooms on alternating cuts, plus an SRT of short captions.
  5. Optionally render an MP4 straight away with ffmpeg (--render).

No Resolve API is needed, so it works with free Resolve, Premiere and Final Cut.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path
from xml.sax.saxutils import escape

FILLERS = {
    # English
    "um", "umm", "uh", "uhh", "uhm", "erm", "er", "ah", "ahh", "hmm", "mm", "mhm",
    # Arabic
    "امم", "اممم", "ااه", "آه", "اه", "ممم", "إمم",
    # Turkish
    "ıı", "ııı", "şey", "hmm",
}
# Whisper tends to skip fillers; priming it with some makes it transcribe them.
FILLER_PROMPT = "Umm, uh, so, uh, I mean, like, hmm. Okay."

LAST_JOB = Path.home() / ".reel-editor" / "last_job.json"


# ---------------------------------------------------------------- helpers

def run(cmd, cwd=None):
    print("  $", " ".join(str(c) for c in cmd[:6]), "..." if len(cmd) > 6 else "")
    res = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True,
                         encoding="utf-8", errors="replace")
    if res.returncode != 0:
        sys.exit(f"Command failed:\n{res.stderr[-2000:]}")
    return res


def norm_word(w):
    return re.sub(r"[^\w؀-ۿ]+", "", w.lower())


def fps_fraction(value):
    """'30000/1001' or '29.97' -> Fraction, snapped to common NTSC rates."""
    f = Fraction(value) if "/" in str(value) else Fraction(str(value))
    for ntsc in (Fraction(24000, 1001), Fraction(30000, 1001), Fraction(60000, 1001)):
        if abs(float(f) - float(ntsc)) < 0.01:
            return ntsc
    if abs(float(f) - round(float(f))) < 0.01:
        return Fraction(round(float(f)))
    return f.limit_denominator(1001)


def probe(path):
    """Return dict with width, height, fps (Fraction), duration, has_audio."""
    if shutil.which("ffprobe"):
        out = run(["ffprobe", "-v", "error", "-print_format", "json",
                   "-show_streams", "-show_format", path]).stdout
        data = json.loads(out)
        v = next(s for s in data["streams"] if s["codec_type"] == "video")
        w, h = int(v["width"]), int(v["height"])
        rot = 0
        for sd in v.get("side_data_list", []):
            rot = int(float(sd.get("rotation", rot)))
        rot = int(v.get("tags", {}).get("rotate", rot))
        fps = fps_fraction(v.get("avg_frame_rate") if v.get("avg_frame_rate", "0/0") != "0/0"
                           else v["r_frame_rate"])
        dur = float(data["format"]["duration"])
        has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    else:  # parse `ffmpeg -i` output
        err = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path)], capture_output=True,
                             text=True, encoding="utf-8", errors="replace").stderr
        hh, mm, ss = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups()
        dur = int(hh) * 3600 + int(mm) * 60 + float(ss)
        vline = next(l for l in err.splitlines() if "Video:" in l)
        w, h = map(int, re.search(r"(\d{2,5})x(\d{2,5})", vline).groups())
        fps = fps_fraction(re.search(r"([\d.]+) fps", vline).group(1))
        m = re.search(r"rotation of (-?[\d.]+)", err)
        rot = int(float(m.group(1))) if m else 0
        has_audio = "Audio:" in err
    if abs(rot) % 180 == 90:
        w, h = h, w
    return {"width": w, "height": h, "fps": fps, "duration": dur, "has_audio": has_audio}


# ---------------------------------------------------------------- steps

def prepare_media(src, out_dir, info, clean_audio, cfr):
    """Write <name>_prep.mp4 with cleaned, loudness-normalised audio (-14 LUFS)."""
    if not clean_audio and not cfr:
        return src
    dst = out_dir / f"{src.stem}_prep.mp4"
    cmd = ["ffmpeg", "-y", "-i", src]
    if cfr:
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
                "-r", str(info["fps"]), "-fps_mode", "cfr"]
    else:
        cmd += ["-c:v", "copy"]
    if info["has_audio"]:
        if clean_audio:
            cmd += ["-af", "highpass=f=80,afftdn=nf=-25,"
                           "acompressor=threshold=-20dB:ratio=3:attack=5:release=120,"
                           "loudnorm=I=-14:TP=-1.5:LRA=11"]
        cmd += ["-c:a", "aac", "-b:a", "256k", "-ar", "48000"]
    cmd += ["-movflags", "+faststart", dst]
    print("Preparing media (audio cleanup{})...".format(", constant frame rate" if cfr else ""))
    run(cmd)
    return dst


def transcribe(media, out_dir, model_name, language):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper is missing. Run: pip install -r requirements.txt")
    print(f"Transcribing with Whisper '{model_name}' (first run downloads the model)...")
    wav = out_dir / "_audio16k.wav"
    run(["ffmpeg", "-y", "-i", media, "-vn", "-ac", "1", "-ar", "16000", wav])
    model = WhisperModel(model_name, device="auto", compute_type="auto")
    segments, meta = model.transcribe(
        str(wav), language=language, word_timestamps=True,
        initial_prompt=FILLER_PROMPT, vad_filter=False, condition_on_previous_text=False)
    words, sents = [], []
    for seg in segments:
        sent = []
        for w in seg.words or []:
            words.append({"text": w.word.strip(), "start": round(w.start, 3),
                          "end": round(w.end, 3), "sent": len(sents)})
            sent.append(len(words) - 1)
        if sent:
            sents.append(sent)
        print(f"  [{seg.start:6.1f}s] {seg.text.strip()}")
    wav.unlink(missing_ok=True)
    data = {"language": meta.language, "words": words}
    (out_dir / "transcript.json").write_text(json.dumps(data, ensure_ascii=False, indent=1),
                                             encoding="utf-8")
    return data


def find_retakes(words, lookahead=3, match=3):
    """Sentence indexes to drop because a later sentence restarts with the same words."""
    sents = {}
    for i, w in enumerate(words):
        sents.setdefault(w["sent"], []).append(i)
    order = sorted(sents)
    heads = {s: [norm_word(words[i]["text"]) for i in sents[s]] for s in order}
    heads = {s: [t for t in h if t and t not in FILLERS][:match] for s, h in heads.items()}
    drop = set()
    for k, s in enumerate(order):
        if len(heads[s]) < match:
            continue
        for later in order[k + 1:k + 1 + lookahead]:
            if heads[later] == heads[s]:
                drop.add(s)
                break
    return drop


def plan_cuts(words, duration, fps, max_gap, pad_in, pad_out, min_len,
              cut_fillers, cut_retakes):
    """Return (segments, kept_words). Segments are (start, end) in source seconds."""
    retakes = find_retakes(words) if cut_retakes else set()
    kept = []
    for w in words:
        if cut_fillers and norm_word(w["text"]) in FILLERS:
            continue
        if w["sent"] in retakes:
            continue
        if w["end"] - w["start"] <= 0:
            continue
        kept.append(w)
    if retakes:
        print(f"  Dropped {len(retakes)} bad take(s).")

    segs = []
    for w in kept:
        if segs and w["start"] - segs[-1][1] <= max_gap and not _dropped_between(
                words, segs[-1][1], w["start"], kept):
            segs[-1][1] = w["end"]
        else:
            segs.append([w["start"], w["end"]])

    # pad, clamp, snap to frames, merge overlaps
    frame = 1 / float(fps)
    out = []
    for s, e in segs:
        s = max(0.0, s - pad_in)
        e = min(duration, e + pad_out)
        s = round(s / frame) * frame
        e = round(e / frame) * frame
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        elif e - s >= min_len:
            out.append([s, e])
    return [tuple(x) for x in out], kept


def _dropped_between(words, t0, t1, kept):
    kept_ids = {id(k) for k in kept}
    return any(t0 <= w["start"] < t1 and id(w) not in kept_ids for w in words)


def to_timeline(t, segs):
    """Map a source time to timeline time; None if it was cut."""
    acc = 0.0
    for s, e in segs:
        if s <= t <= e:
            return acc + (t - s)
        acc += e - s
    return None


def build_captions(kept, segs, max_words, max_chars, max_dur, upper):
    cues, cur = [], []

    def flush():
        if not cur:
            return
        a, b = to_timeline(cur[0]["start"], segs), to_timeline(cur[-1]["end"], segs)
        if a is not None and b is not None and b > a:
            text = " ".join(w["text"] for w in cur)
            cues.append([a, b, text.upper() if upper else text])
        cur.clear()

    for w in kept:
        if cur:
            text_len = len(" ".join(x["text"] for x in cur + [w]))
            new_seg = to_timeline(w["start"], segs) is None or _seg_of(w["start"], segs) != \
                _seg_of(cur[-1]["end"], segs)
            if (len(cur) >= max_words or text_len > max_chars
                    or w["end"] - cur[0]["start"] > max_dur or new_seg):
                flush()
        cur.append(w)
        if re.search(r"[.!?,;:،؟]$", w["text"]):
            flush()
    flush()
    # close tiny gaps so captions don't flicker
    for i in range(len(cues) - 1):
        if cues[i + 1][0] - cues[i][1] < 0.25:
            cues[i][1] = cues[i + 1][0]
    return cues


def _seg_of(t, segs):
    for i, (s, e) in enumerate(segs):
        if s <= t <= e:
            return i
    return -1


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def write_srt(cues, path):
    lines = []
    for i, (a, b, text) in enumerate(cues, 1):
        lines += [str(i), f"{srt_time(a)} --> {srt_time(b)}", text, ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def write_fcpxml(media, info, segs, zoom, path, name):
    fps = info["fps"]
    fd = 1 / fps  # frame duration as Fraction

    def rt(seconds):
        frames = round(Fraction(seconds).limit_denominator(100000) / fd)
        v = frames * fd
        return f"{v.numerator}/{v.denominator}s" if v.denominator != 1 else f"{v.numerator}s"

    src_dur = rt(info["duration"])
    uri = Path(media).resolve().as_uri()
    clips, offset = [], Fraction(0)
    for i, (s, e) in enumerate(segs):
        start_f = round(Fraction(s).limit_denominator(100000) / fd)
        len_f = round(Fraction(e).limit_denominator(100000) / fd) - start_f
        if len_f <= 0:
            continue
        transform = ""
        if zoom and zoom != 1 and i % 2 == 1:
            transform = f'\n          <adjust-transform scale="{zoom:g} {zoom:g}"/>'
        clips.append(
            f'        <asset-clip ref="r2" offset="{rt(offset)}" name="{escape(name)}" '
            f'start="{rt(start_f * fd)}" duration="{rt(len_f * fd)}" format="r1" '
            f'tcFormat="NDF">{transform}\n        </asset-clip>')
        offset += len_f * fd
    audio = ('hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000" '
             if info["has_audio"] else "")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="Reel {info['width']}x{info['height']}" frameDuration="{rt(fd)}" width="{info['width']}" height="{info['height']}"/>
    <asset id="r2" name="{escape(name)}" start="0s" duration="{src_dur}" hasVideo="1" {audio}format="r1">
      <media-rep kind="original-media" src="{escape(uri)}"/>
    </asset>
  </resources>
  <library>
    <event name="Reel Editor">
      <project name="{escape(name)} - auto edit">
        <sequence format="r1" duration="{rt(offset)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
{chr(10).join(clips)}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
"""
    path.write_text(xml, encoding="utf-8")
    return float(offset)


def render(media, info, segs, zoom, srt, out_path, burn):
    """Render the edit with ffmpeg. Runs inside out_path's folder so the
    subtitles filter can use a plain relative filename (no path escaping)."""
    w, h = info["width"], info["height"]
    parts, labels = [], []
    for i, (s, e) in enumerate(segs):
        v = f"[0:v]trim=start={s:.4f}:end={e:.4f},setpts=PTS-STARTPTS"
        if zoom and zoom != 1 and i % 2 == 1:
            v += f",scale=iw*{zoom}:ih*{zoom},crop={w}:{h}"
        v += f",scale={w}:{h},setsar=1[v{i}]"
        parts.append(v)
        labels.append(f"[v{i}]")
        if info["has_audio"]:
            parts.append(f"[0:a]atrim=start={s:.4f}:end={e:.4f},asetpts=PTS-STARTPTS,"
                         f"afade=t=in:d=0.01,afade=t=out:st={max(0, e - s - 0.01):.4f}:d=0.01[a{i}]")
            labels.append(f"[a{i}]")
    n, a = len(segs), 1 if info["has_audio"] else 0
    concat = "".join(labels) + f"concat=n={n}:v=1:a={a}[vc]" + ("[ac]" if a else "")
    parts.append(concat)
    vout = "[vc]"
    if burn:
        style = ("Fontname=Arial,Fontsize=13,Bold=1,PrimaryColour=&H00FFFFFF,"
                 "OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,"
                 "Alignment=2,MarginV=70")
        parts.append(f"[vc]subtitles={srt.name}:force_style='{style}'[vs]")
        vout = "[vs]"
    script = out_path.parent / "_filter.txt"
    script.write_text(";\n".join(parts), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-i", Path(media).resolve(), "-filter_complex_script", script.name,
           "-map", vout]
    if a:
        cmd += ["-map", "[ac]", "-c:a", "aac", "-b:a", "192k"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
            "-r", str(info["fps"]), "-movflags", "+faststart", out_path.name]
    print("Rendering MP4...")
    run(cmd, cwd=out_path.parent)
    script.unlink(missing_ok=True)


# ---------------------------------------------------------------- main

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video", type=Path)
    p.add_argument("-o", "--out", type=Path, help="output folder (default: <video>_edit)")
    p.add_argument("--model", default="small", help="whisper model: tiny/base/small/medium/large-v3")
    p.add_argument("--language", default=None, help="e.g. en, ar, tr (default: auto-detect)")
    p.add_argument("--transcript", type=Path, help="reuse a transcript.json, skip Whisper")
    p.add_argument("--max-gap", type=float, default=0.35, help="pauses longer than this are cut (s)")
    p.add_argument("--pad-in", type=float, default=0.06)
    p.add_argument("--pad-out", type=float, default=0.10)
    p.add_argument("--min-len", type=float, default=0.25, help="drop clips shorter than this (s)")
    p.add_argument("--zoom", type=float, default=1.12, help="punch-in on every 2nd cut; 1 = off")
    p.add_argument("--keep-fillers", action="store_true")
    p.add_argument("--keep-retakes", action="store_true")
    p.add_argument("--no-clean-audio", action="store_true")
    p.add_argument("--cfr", action="store_true",
                   help="re-encode to constant frame rate (fixes audio drift from phone footage)")
    p.add_argument("--caption-words", type=int, default=3)
    p.add_argument("--caption-chars", type=int, default=22)
    p.add_argument("--no-upper", action="store_true", help="don't uppercase captions")
    p.add_argument("--render", action="store_true", help="also render final.mp4 with ffmpeg")
    p.add_argument("--burn", action="store_true", help="burn captions into final.mp4")
    args = p.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found. Install it first (see README).")
    src = args.video.resolve()
    if not src.exists():
        sys.exit(f"Not found: {src}")
    out = (args.out or src.with_name(src.stem + "_edit")).resolve()
    out.mkdir(parents=True, exist_ok=True)

    info = probe(src)
    print(f"Video: {info['width']}x{info['height']} @ {float(info['fps']):.3f} fps, "
          f"{info['duration']:.1f}s")
    media = prepare_media(src, out, info, not args.no_clean_audio and info["has_audio"], args.cfr)

    if args.transcript:
        data = json.loads(args.transcript.read_text(encoding="utf-8"))
    else:
        if not info["has_audio"]:
            sys.exit("Video has no audio track to transcribe.")
        data = transcribe(media, out, args.model, args.language)
    words = data["words"]
    if not words:
        sys.exit("No speech found.")

    segs, kept = plan_cuts(words, info["duration"], info["fps"], args.max_gap, args.pad_in,
                           args.pad_out, args.min_len, not args.keep_fillers, not args.keep_retakes)
    cues = build_captions(kept, segs, args.caption_words, args.caption_chars, 1.6,
                          not args.no_upper)

    name = src.stem
    fcpxml = out / f"{name}.fcpxml"
    srt = out / f"{name}.srt"
    new_len = write_fcpxml(media, info, segs, args.zoom, fcpxml, name)
    write_srt(cues, srt)
    (out / "cuts.json").write_text(json.dumps({"segments": segs}, indent=1), encoding="utf-8")

    job = {"fcpxml": str(fcpxml), "srt": str(srt), "media": str(Path(media).resolve()),
           "name": name}
    LAST_JOB.parent.mkdir(parents=True, exist_ok=True)
    LAST_JOB.write_text(json.dumps(job, indent=1), encoding="utf-8")

    if args.render or args.burn:
        render(media, info, segs, args.zoom, srt, out / f"{name}_final.mp4", args.burn)

    saved = info["duration"] - new_len
    print(f"\nDone. {info['duration']:.1f}s -> {new_len:.1f}s "
          f"({saved:.1f}s cut, {len(segs)} clips, {len(cues)} captions)")
    print(f"  Timeline: {fcpxml}\n  Captions: {srt}")
    if args.render or args.burn:
        print(f"  Video:    {out / (name + '_final.mp4')}")
    print("In Resolve: File > Import > Timeline > pick the .fcpxml, then "
          "File > Import > Subtitle > pick the .srt\n"
          "  (or run Workspace > Scripts > Utility > reel_import)")


if __name__ == "__main__":
    main()
