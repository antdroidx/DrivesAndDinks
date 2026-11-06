# Modern venue artwork, revision 4

Generated with the built-in `image_gen` tool. Active assets are `outdoor-modern-v4.png`, `indoor-modern-v3.png` and `stadium-modern-v3.png`. Older venue plates remain archived and unused.

All plates use a fixed elevated camera and a continuous neutral foreground. The engine paints the live court and lines over the central trapezoid with far corners (350,204), (610,204) and near corners (258,578), (702,578).

## Compositing rule

`SCENE_LAYOUTS` sets `far`, the image fraction where the court baseline lands. It must sit **below** the point where the back barrier meets the ground, so a strip of real ground shows behind the baseline and the players at the far end stand on ground rather than on the barrier. The measured barrier heights are `outdoor .372`, `indoor .399` and `stadium .347`; `test/venue-layout.test.js` fails if a plate is regenerated and `far` is not retuned.

## Shared prompt

Premium stylized 3D game environment with subtle anime background-painting polish, 16:10 landscape, fixed elevated camera centered above the near baseline looking down an empty pickleball court apron. Keep the entire central playing area clear and use one continuous neutral ground material with no court patch, markings, net, mat, border, UI, text, logos or watermark. Place all scenery outside the central trapezoid and keep the area just behind its far end clear of people, objects and harsh shadows.

## Venue prompts

- `outdoor-modern-v4.png`: contemporary blue-hour outdoor racquet-sports park. Strict one-point perspective with a single vanishing point above the frame: side fences, curb lines, paving joints, benches and light poles all converge toward it, and the ground surface lines run diagonally from the bottom corners toward the centre. The back windscreen fence meets the ground at about 37% of the image height, leaving a broad empty paved apron below it. Glass-and-steel pavilion, perforated windscreen fencing, LED court lights, modern benches, geometric planters, low-rise city skyline.
- `indoor-modern-v3.png`: modern indoor pickleball arena with charcoal acoustic baffles, slim steel, linear LED lighting, glass walls, modular seating and clean equipment niches.
- `stadium-modern-v3.png`: current-era championship arena with cantilevered roof, modern seating, restrained crowd behind barriers, unlit digital display surfaces, broadcast lighting and a distant city skyline.

Avoid rustic wood, historic architecture, vintage crowd clothing, old brick clubhouses, visible text and any people on the playing floor.
