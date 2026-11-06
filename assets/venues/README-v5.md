# Modern venue artwork, revision 5

Generated with the built-in `image_gen` tool. Active assets are `outdoor-modern-v7.png`, `indoor-modern-v6.png`, `stadium-modern-v6.png` and the sideline replay backdrop `replay-sideline.png`. Older venue plates remain archived and unused.

All plates use a fixed elevated camera and a continuous neutral foreground. The engine paints the live court and lines over the central trapezoid with far corners (350,204), (610,204) and near corners (258,578), (702,578).

## Compositing rule

`SCENE_LAYOUTS` sets `far`, the image fraction where the court baseline lands. It must sit **below** the point where the back barrier meets the ground, so a strip of real ground shows behind the baseline and the players at the far end stand on ground rather than on the barrier. `test/venue-layout.test.js` fails if a plate is regenerated and `far` is not retuned.

The stage is a fixed 960x600 design and the camera only shows virtual rows 80 to 600, so the plate also has to cover that band and leave the backdrop visible above the court's near baseline. `npm run venue:perspective` measures the barrier height of the active plates and prints the placement that satisfies both rules.

The measured barrier heights are `outdoor .356`, `indoor .3145` and `stadium .2661`.

## Shared prompt

Premium stylized 3D game environment with subtle anime background-painting polish, 16:10 landscape, fixed elevated camera centred above the near baseline looking down an empty court apron. Keep the entire central playing area clear and use one continuous neutral ground material with no court patch, markings, net, mat, border, UI, text, logos or watermark.

Every ground line has to stay above the court. The venue backdrop fills the upper band of the image and the rest is one unbroken empty apron, so no fence, curb, railing or paving joint ever crosses the court and the court's sidelines never fight the backdrop.

## Venue prompts

- `outdoor-modern-v7.png`: contemporary blue-hour outdoor sports park. A low modern fence with slim posts and a horizontal top rail stands at the ground line with the tree canopy and the city skyline immediately above it, a glass-and-steel pavilion at the left, LED court lights, metal benches and geometric planters. The back barrier meets the ground at 29.8% of the image height.
- `indoor-modern-v6.png`: modern indoor pickleball arena with charcoal acoustic baffles, slim steel, linear LED lighting, glass walls, modular seating, equipment niches and a dark scoreboard. The back wall meets the floor at 31.5% of the image height.
- `stadium-modern-v6.png`: current-era championship arena with cantilevered roof, modern seating, restrained crowd behind the barrier, unlit digital display surfaces, broadcast lighting and a distant city skyline. The barrier meets the floor at 26.6% of the image height.
- `replay-sideline.png`: the venue seen from the sideline replay camera. The floor line runs level across the frame at 50% of the image height with the arena structure above it, so the replay can place that line on the replay camera's horizon.

Avoid rustic wood, historic architecture, vintage crowd clothing, old brick clubhouses, visible text and any people on the playing floor.

