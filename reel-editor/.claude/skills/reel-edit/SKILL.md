---
name: reel-edit
description: Auto-edit a talking-head Reel/TikTok/Short for free DaVinci Resolve, Premiere or Final Cut. Use when the user asks to edit, cut, clean up or caption a video, or mentions "11 second edit", jump cuts, silences, filler words, bad takes or captions.
---

# Reel edit

The tool is `edit_reel.py` in the project root. It needs ffmpeg and `pip install -r requirements.txt`.

1. Get the video path from the user. Ask for the spoken language only if they haven't given it.
2. Run: `python edit_reel.py "<video>" --language <code>`
   - "Fast pace" or "tight": add `--max-gap 0.25`. "Relaxed": add `--max-gap 0.5`.
   - "No zoom": add `--zoom 1`.
   - "Just give me the video" or "no Resolve": add `--burn`.
   - Audio out of sync in Resolve: re-run with `--cfr`.
3. To change settings after a run, reuse the transcript: `--transcript "<video>_edit/transcript.json"`.
4. Tell the user the before/after length and what to do in Resolve:
   File → Import → Timeline (the `.fcpxml`), then File → Import → Subtitle (the `.srt`),
   or Workspace → Scripts → Utility → reel_import.
5. If the user complains about a cut, read `transcript.json` and `cuts.json` to see what was removed.
