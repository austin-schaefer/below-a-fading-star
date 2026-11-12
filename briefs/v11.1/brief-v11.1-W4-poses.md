# Brief: v11.1 W4, three poses and the bell's glow

Goal: two leftovers from v11's critic fixes. (1) The Go-to map's poses for the Cutting, the Tumbling Water and the Unfinished Prospect are still poor: a visitor who picks one should arrive standing on ground, facing the thing, with it filling a good part of the frame. Render all 66 with `tools/goto-views.mjs`, fix those three, and fix any other that is plainly bad. (2) At the bell's strike a faint glow still shows against the Span's wall (`tools/bell-frames.mjs`): find what draws it and remove or soften it so the strike reads as sound made visible, not as a light on the wall.

Read: `plans/wilderness-v11.md` Status (F2's entry). Files: the Go-to table in the settings code, the bell's sprites (find them from F2's commit, `git log --grep=1106`).
Done when: before/after frames of the three poses and the bell's strike; `ONLY=settings,acts tools/suite.sh <port>` green.
