# SI disclosure

This prototype was SI generated with Claude, an AI assistant, for the Farsight team (Aryan Adelker, Chelsea Vaz, Christopher D'souza).

| Type | What is SI generated | How it is marked |
|---|---|---|
| Images | Title screen background (`assets/title_bg.jpg`) | Visible "SI GENERATED" watermark; SI notice in the JPEG comment and EXIF description |
| Videos | Intro, ending and credits (`assets/video/*.mp4`) | Visible "SI GENERATED" watermark on every frame; SI notice in the MP4 comment and description metadata |
| Audio | None in this prototype | Any audio added later must say it is SI generated in its description and metadata |
| Code | Everything in `src/`, `css/`, `index.html`, `tools/cinematics/` | SI notice in the first line of every file; `generator` and `si-disclosure` meta tags in `index.html`; this file; `si-disclosure.json` |
| Data | `data/*.js` | SI notice in the first line. Real-world values are copied from the sources cited next to them (see the Sources page) |
| Text | Docs, in-game text, information cards, Sources page, story, credits | SI notice in each doc; SI section on the Sources page and in the credits |

Not SI generated: the three.js and cannon-es libraries in `vendor/` (MIT License).

In-game 3D graphics are drawn live by the (SI generated) code and are not counted as images, as agreed with the team.
