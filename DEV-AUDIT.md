# DEV audit and next steps

Implemented: automatic poach initiative (IQ/volley/aggression); no manual override; keyboard hints; range controls; separate designer view within the setup modal; randomized visual dimensions/hair independent of archetype; modern casual kits, directional fabric shading, exertion sweat and transient rally reactions; procedural full-viewport recreation environments. Public main source is not promoted.

Replay limitation: camera movement is a crop/pan/zoom, not a change of court projection. True sideline replay needs side/three-quarter head and torso geometry, paddle occlusion and a unified world-to-camera projection for feet, net, ball and contact markers. Do this before offering angle switches.

Priorities from code inspection:
1. Forecast contacts with acceleration/braking and stamina, matching live movement. tactics currently approximates travel with speed times time, which can overestimate interceptions.
2. Separate cosmetic randomness from gameplay RNG. Dust cooldown currently consumes the match RNG, so changing visual effects can alter later shot decisions. Seed an independent effects stream.
3. Replay snapshots sample at 30 Hz. Interpolate positions and camera targets while preserving exact hit/fault timestamps; do not interpolate ball positions through collisions.
4. Human automatic poaching should keep manual shot timing. Test this at multiple skill levels before adding stronger interception incentives.
5. Expand three-quarter character views with shoulder/hip yaw, consistent volume shading and direction-aware hair/paddle occlusion. Current fabric lighting adds volume but is still procedural 2.5D.
6. Consolidate accumulated CSS overrides into layout components. Add actual desktop ultrawide and phone visual regression coverage; Node canvas mocks cannot verify composition or touch ergonomics.

Browser gesture protection covers the game canvas wheel/touch gestures and in-game keyboard zoom shortcuts. Browser UI zoom and OS gestures remain under browser/OS control. Dialogs deliberately retain scrolling and zoom accessibility outside gameplay.

Validation: Node suite 214 passing. Physical touch-device and visual browser review still needed.
