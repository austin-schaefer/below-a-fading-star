# v17.1 Q1, the map (#70): report

**For Q2 (the gamepad), the panel's focus api** (`ctx.settings`, also `window.__fp.settings`), in place from this branch:

- `focusNext(dx, dy)`: moves focus in the open panel by direction (dx, dy in -1..1; the d-pad or a stick past its dead zone). Inside the map it moves between marks by where they lie; elsewhere it moves to the nearest control that way; on a focused slider dx steps the value. The map's focused mark says its plain line under the map. Returns true when focus moved.
- `activate()`: does what the focused control does (a mark: go there at once; a button: click it). Returns true when something happened.
- `back()`: shuts the panel (as Escape or "Back to the moor"). `focused()` returns the focused element or null.

The report proper follows when the work is done.
