"""Import the last auto-edit into the open DaVinci Resolve project.

Works in the FREE version: run it from inside Resolve via
Workspace > Scripts > Utility > reel_import. (Free Resolve blocks scripts
launched from outside the app, not scripts launched from its own menu.)

Install by copying this file to:
  Windows: %APPDATA%\\Blackmagic Design\\DaVinci Resolve\\Support\\Fusion\\Scripts\\Utility\\
  macOS:   ~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/
"""
import json
import os


def get_resolve():
    g = globals()
    if g.get("resolve"):
        return g["resolve"]
    if g.get("bmd"):
        return g["bmd"].scriptapp("Resolve")
    if g.get("app"):
        return g["app"].GetResolve()
    import DaVinciResolveScript as dvr  # noqa: only works where external scripting is allowed
    return dvr.scriptapp("Resolve")


def main():
    job_path = os.path.join(os.path.expanduser("~"), ".reel-editor", "last_job.json")
    if not os.path.exists(job_path):
        print("No job found. Run edit_reel.py first.")
        return
    with open(job_path, encoding="utf-8") as f:
        job = json.load(f)

    resolve = get_resolve()
    project = resolve.GetProjectManager().GetCurrentProject()
    pool = project.GetMediaPool()

    timeline = pool.ImportTimelineFromFile(job["fcpxml"], {
        "timelineName": job["name"] + " - auto edit",
        "importSourceClips": True,
    })
    if not timeline:
        print("Timeline import failed. Use File > Import > Timeline instead:", job["fcpxml"])
        return
    project.SetCurrentTimeline(timeline)
    print("Imported timeline:", timeline.GetName())

    subs = pool.ImportMedia([job["srt"]])
    if subs:
        print("Captions added to the Media Pool. Drag the .srt onto the timeline "
              "(it goes on a subtitle track).")
    resolve.OpenPage("edit")


main()
