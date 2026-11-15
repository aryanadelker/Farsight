# Cinematics source

The intro, ending and credits videos and the title background are drawn by these Python scripts (Pillow + NumPy + ffmpeg). No outside images or logos are used.

- `python3 scenes.py intro` / `outro` / `credits`: renders the videos (into `/home/claude/cine` paths set at the top of `cine.py`; change `OUT` to suit your machine).
- `python3 scenes.py titlebg`: renders the title screen background.
- `python3 scenes.py frames`: renders a few still frames for checking.

The credits text is the `CREDITS` list in `scenes.py`. After re-rendering, re-compress for the web, e.g.:
`ffmpeg -i farsight_credits.mp4 -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart -an ../../assets/video/credits.mp4`
