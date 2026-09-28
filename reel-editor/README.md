# Reel Editor

Auto-edits talking-head Reels for the **free** version of DaVinci Resolve. The edit also imports into Premiere and Final Cut.

Drop in a raw video and you get:

- Silences and long pauses cut
- Filler words removed ("um", "uh", "امم", "ııı"…)
- Bad takes removed: when you restart a sentence, it keeps the last try
- A punch-in zoom on every second cut
- Clean audio: noise reduction, compression, loudness at -14 LUFS (the Instagram/TikTok level)
- Short, uppercase captions (3 words at a time) as an `.srt` file
- A timeline file (`.fcpxml`) you import into Resolve
- Optional: a finished MP4 rendered with ffmpeg, with the captions burned in

## Why this works on free Resolve

Free Resolve blocks scripts that control it from **outside** the app. It doesn't block importing timeline files, and it doesn't block scripts run from its own **Workspace → Scripts** menu. This tool uses both of those routes.

## One-time setup

1. **Python 3.10+**: https://www.python.org/downloads/ (on Windows, tick "Add Python to PATH").
2. **ffmpeg**:
   - Windows: `winget install Gyan.FFmpeg`
   - Mac: `brew install ffmpeg`
3. **Whisper** (the transcription model), from inside this folder:
   ```
   pip install -r requirements.txt
   ```
4. **Optional, the Resolve import button.** Copy `resolve/reel_import.py` to:
   - Windows: `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\`
   - Mac: `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/`

## Edit a Reel

```
python edit_reel.py "C:\Videos\my_reel.mov"
```

The results go to `my_reel_edit/` next to your video.

Then in Resolve:

1. Open a project.
2. **File → Import → Timeline** and pick `my_reel.fcpxml`. If Resolve asks, keep "Automatically import source clips into media pool" ticked.
3. **File → Import → Subtitle** and pick `my_reel.srt`, then drag it onto the timeline.
4. Style the captions in the Inspector (font, size, stroke), then export.

Or, if you installed step 4 of the setup, do steps 2–3 with one click: **Workspace → Scripts → Utility → reel_import**.

To skip Resolve and get a finished MP4 directly:

```
python edit_reel.py my_reel.mov --burn
```

## Useful options

| Option | What it does |
|---|---|
| `--language ar` | Set the spoken language (`en`, `ar`, `tr`…). Faster and more accurate than auto-detect. |
| `--model medium` | Better transcription, but slower. The default is `small`. `large-v3` is the most accurate. |
| `--max-gap 0.25` | Cut pauses more tightly (the default is 0.35 s). A lower value gives a faster pace. |
| `--zoom 1` | Turn off punch-in zooms. `--zoom 1.2` zooms in harder. |
| `--keep-fillers` / `--keep-retakes` | Don't remove fillers or retakes. |
| `--cfr` | Use this if the audio drifts out of sync in Resolve. Phone footage is often variable frame rate, and this converts it. |
| `--render` | Also render the MP4, without captions burned in. |
| `--burn` | Render the MP4 with captions burned in. |
| `--transcript my_reel_edit/transcript.json` | Re-run the edit with different settings, without transcribing again. |

## Using it with Claude Code

Open Claude Code in this folder and say something like "edit `C:\Videos\my_reel.mov`, Arabic, fast pace". The skill in `.claude/skills/reel-edit` tells Claude how to run the tool.

## Known limits

- Transcription runs on your computer. With a CPU only, the `small` model takes about 1 minute per minute of video.
- Bad-take detection matches the first 3 words of a sentence. If a retake starts with different words, it won't be caught. Use `--keep-retakes` if it cuts something you wanted.
- Caption styling isn't carried into the `.srt`. Set the look once in Resolve, or use `--burn`.
