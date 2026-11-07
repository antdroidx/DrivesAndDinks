# Venue artwork

The active environment plates are `outdoor-modern-v7.png`, `indoor-modern-v6.png`, `stadium-modern-v6.png`, and the sideline replay backdrop `replay-sideline.png`. The game aligns each fixed elevated camera and paints the live court, lines, players, ball, and net over a continuous neutral apron.

## Compositing rule

`SCENE_LAYOUTS` records the image fraction where each court baseline lands. It must sit below the back barrier's ground line so the far players stand on visible ground. `test/venue-layout.test.js` enforces this, and `npm run venue:perspective` measures the active plates.

The gameplay stage is 960 by 600 virtual units. The current measured barrier heights are outdoor 0.2984, indoor 0.3145, and stadium 0.2661.

## Asset roles

- `outdoor-modern-v7.png`: blue-hour outdoor sports park.
- `indoor-modern-v6.png`: modern indoor pickleball arena.
- `stadium-modern-v6.png`: current-era championship arena.
- `replay-sideline.png`: matching arena seen from the replay sideline camera, with its floor line at half height.
