On Animated Video: A Working Philosophy
Before any timeline, any easing curve, any frame — there is a question. Why does this need to move? Motion is expensive. It costs the viewer attention, it costs you craft, and it costs the medium its credibility when used poorly. So everything that follows is downstream of one belief: motion must earn its place by saying something that stillness cannot.

This is what I think about when I make animated video.

I. Story is the substrate
Every animation is a story, even a 6-second product loop. Stories have a shape: a beginning that establishes, a middle that complicates, an end that resolves. If I can't articulate that shape in one sentence — "a cursor learns to fly," "a number grows until it breaks the screen," "two ideas argue and one wins" — I'm not ready to animate.

The trap is starting with visuals. I'll have a logo that does this cool thing, then some text flies in, then… That's not a story, it's a choreography of unrelated gestures. Audiences forgive bad easing; they do not forgive being bored. Story first, always.

The smaller the piece, the more brutal the editing. A 15-second video has room for one idea, expressed three ways: setup, escalation, payoff. Trying to cram two ideas into 15 seconds produces something where neither lands.

The arc, concretely
Establish. Where are we? Who or what is the protagonist? What's the world like? This can be half a second — a wide shot of an empty desktop, a single word fading in — but it must exist. Without it, the viewer spends the first third of the video orienting instead of engaging.
Complicate. Something happens. Tension, change, surprise, contradiction. The number goes up. The cursor hits a wall. The two shapes meet. This is where motion does its real work, because change is what motion is for.
Resolve. A landing. A held beat. A final state that feels inevitable in retrospect. The worst ending is one that just stops; the best ending is one that the viewer feels coming a half-second before it arrives.
If I find myself unable to identify which moment is the establish, the complication, and the resolve, I rewrite the script before touching code.

II. Show, don't tell — but know when to tell
The default failure mode of explainer animation is narration as crutch. Big text appears: "INTRODUCING OUR NEW FEATURE." Then a graphic. Then more text: "IT'S FAST." Then a graphic of a fast thing. The text is doing all the work; the visuals are decoration.

The opposite extreme is also a failure: pure visual metaphor with no anchoring, where the viewer admires the craft but has no idea what was communicated.

The right balance:

Visuals carry the meaning. If the animation is about speed, things should be fast — not labeled "fast."
Text anchors and punctuates. A single word at the right moment is worth a paragraph at the wrong one. Use type as an instrument, not as a transcript.
Captions are for what visuals genuinely cannot show — proper nouns, specific numbers, abstract claims. Not for narrating what the viewer is already seeing.
When text does appear, it gets weight. It gets time. It is not a passing decoration; it is a beat.

III. The shot is a unit of thought
Borrow from film: the shot is the atomic unit of an animation, not the keyframe. Every shot has:

A subject (what the viewer's eye should land on)
A frame (where in the canvas the subject lives)
A duration (long enough to read, short enough to not stall)
A relationship to the next shot (cut, dissolve, match, contrast)
Most beginner animations have no shots — just a single static frame in which things happen. This is exhausting to watch because the eye has nowhere to go and no rhythm to follow.

Camera moves I reach for
Establishing wide → push in. Shows the world, then directs attention. The classic open.
Ken Burns on stills. Any image held longer than a beat must drift, scale, or pan. A static photo for two seconds reads as a bug.
Following. The camera tracks a moving element (cursor, ball, line). The viewer's attention is given to them rather than demanded of them.
Hard cut to detail. After establishing, snap close. This is the visual equivalent of a sentence break.
Rack focus / depth shift. Background blurs as foreground sharpens. Communicates "look here now."
The held beat. Camera stops moving. Element stops moving. Something in the frame still has life — a cursor blink, a slow exhale of scale. The frame breathes.
The held beat is the most underused tool in motion design. After a busy passage, two seconds of near-stillness is not dead air — it is the silence that lets the previous moment land. But it requires something alive in the frame, even if it's just the slow scale of a single element. A truly frozen frame reads as a crash.

IV. Always be moving (but not always loudly)
This sounds contradictory with the held beat, and it isn't. The principle: the frame is never inert. Motion exists at multiple amplitudes:

Loud motion: a card flying in, a number ticking up, a transition.
Medium motion: text settling, a hover state, an icon pulsing.
Quiet motion: a slow drift, a breathing scale (1.00 → 1.02 → 1.00 over 4 seconds), a parallax background, a cursor's idle micro-jitter.
Quiet motion is what makes a frame feel alive during the held beats. It's the difference between a paused video and a cinematic still. Add it everywhere. A background gradient that drifts. A subject that breathes. A shadow that sways.

V. The Disney principles, applied with restraint
The twelve principles are foundational, but motion design is not Saturday-morning cartoons. The ones that translate directly:

Anticipation. Before any major motion, a tiny counter-motion. A button about to fly right scoots left 4px first. This is the single biggest difference between animation that feels "produced" and animation that feels "tweened."
Follow-through and overshoot. Things don't stop on a dime. A card flying in arrives at 105% scale and settles to 100%. A number ticking up to 100 briefly hits 102 before settling. Overshoot is signature. It's how confident motion looks.
Easing. Linear motion is the mark of an unfinished animation. Almost everything wants ease-out (fast start, slow end) for arrivals, ease-in (slow start, fast end) for exits. ease-in-out for transitions between states. Spring physics for anything organic. Linear is reserved for mechanical things and continuous loops.
Squash and stretch. Used sparingly in UI motion — a button pressed compresses 2%, a notification arriving stretches 5% on the long axis. Communicates physicality without being cartoony.
Staging. One thing at a time. If five elements are arriving, they arrive in sequence (50–100ms apart), not simultaneously. The eye can only track one priority at a time.
Secondary action. When the hero element moves, the surrounding world responds. The card scales up; the shadow softens. The cursor moves; the screen subtly parallaxes. Secondary action is what makes the world feel coherent.
Exaggeration. In a 1920×1080 frame, a 4px move is invisible. Exaggerate beyond what feels right in code, then dial back. The first instinct of every animator is too subtle.
The principles I use less in motion design: straight-ahead vs pose-to-pose (irrelevant), solid drawing (irrelevant), appeal (subjective), arcs (use sparingly — UI motion often wants linear paths).

VI. Timing is the whole game
You can have a perfect concept, perfect easing, perfect typography, and a video that's unwatchable because the timing is wrong. Timing is harder than any other aspect of animation because there are no rules — only feel, developed by watching back, hating it, adjusting, watching again.

Heuristics I trust
Text needs reading time. ~250ms per word, minimum. A 5-word headline needs at least 1.25s on screen after it has finished animating in. People will say "show it longer than feels right." They are correct.
Big motion is faster than you think; small motion is slower than you think. A card flying across the screen: 400–600ms. A subtle scale from 1.0 to 1.05: 800–1200ms. Fast moves on small things look twitchy; slow moves on big things feel sluggish.
Sequences need rhythm, not metronome. If five elements arrive 100ms apart, the result is mechanical. If they arrive at 80, 100, 90, 130, 100 — a slight irregularity — it feels musical. (This requires care; chaos isn't rhythm either.)
The first frame matters more than any other. It establishes the visual language, the energy, the trust. Spend disproportionate time on the first second.
The last frame is the second most important. It's what the viewer leaves with. Hold it. Let it settle. Don't cut while motion is still in progress.
The "watch it 30 times" rule
I do not trust my judgment on timing in fewer than ~30 viewings. The first 5 viewings, my brain is still parsing what's happening. Viewings 5–15, I'm noticing the obvious problems. 15–30 is where I start to feel the cadence — the moments that drag, the moments that rush, the transitions that feel cheap. Anyone who ships an animation after 3 reviews is shipping a draft.

VII. Composition and frame craft
Animation inherits everything from graphic design and cinematography. The frame at any given moment must be compositionally sound as a still — because the viewer will pause, scrub, screenshot.

Negative space is alive. An element in a frame full of breathing room reads as confident. The same element crowded reads as anxious.
Hierarchy is enforced by scale, contrast, and isolation. One thing should be the loudest at any given moment. If two things are equally loud, the frame is broken.
The grid is your friend. Even in motion, elements should land on a grid. Free-floating positions look improvised.
Edges matter. Elements bleeding off-screen tell a story (there's more world out there); elements politely centered with margins tell a different story (this is the whole world). Pick deliberately.
Color is doing more work than you think. A 2-color palette is almost always more sophisticated than a 5-color one. Accent colors should be earned, not sprinkled.
VIII. The mediums of motion
Motion design is not one thing. The grammar shifts based on the kind of animation:

Product walkthroughs. The cursor is the protagonist. Always zoom and follow. Use damped camera physics — the camera lags slightly behind the cursor, creating a sense of weight. Real Screen Studio aesthetic: soft shadows, rounded corners on the device frame, ambient background, generous breathing room around the action. The cursor's own motion should be easing-curved, not linear — humans don't move pointers in straight lines at constant speed.
Logo reveals. Restraint above all. Three motions, max. The brand is the climax; everything before is setup. Hold the final logo state for at least 1.5 seconds before any cut or fade.
Data viz. Numbers ticking up are powerful but expensive — use the technique only on the hero number, not every number on screen. Bars growing should overshoot subtly. Lines should draw with a stroke-dashoffset trick, not just fade in.
Explainers. The hardest format because they're the most prone to "narration with decoration." Force yourself to make every visual carry meaning, not just illustrate the words.
Transitions / loops / abstract. Pure formal play. Here, rhythm and surprise are everything; story takes a back seat to pattern.
IX. The technical commitments
Some things are not negotiable:

Fixed aspect ratio, properly scaled. 16:9 or 9:16, locked. The canvas scales to fit any viewport via transform; controls live outside the scaled region. Letterbox cleanly on black.
Scrubbable. The viewer can drag the playhead anywhere and the frame is correct. This means animations are deterministic functions of time, not stateful tweens that have to play through to be correct. Pure functions of a t parameter.
Persistent playhead. Reload doesn't lose position. Iteration speed depends on this.
Timestamp labels. The current second is exposed somewhere (on the root, in a debug overlay) so feedback like "at 0:04 the kerning is off" is unambiguous.
Component decomposition. Every visual element is its own component. Every scene is its own component. The top-level video file should read like a table of contents, not a wall of code.
Refs for choreography. When a cursor moves between elements, when one thing reacts to another's position, use refs. Never hardcode coordinates that depend on layout — they will drift the moment anything else changes.
Easing as a vocabulary. A small set of named easing curves (Easing.outQuad, Easing.outBack, Easing.spring) used consistently across the piece. Inconsistent easing is the auditory equivalent of mixed accents.
X. The discipline of cutting
The single most important sentence in animation: it is too long.

Whatever you've made, it's too long. Cut 20%. Watch it. Cut another 10%. The instinct to linger on craft you're proud of is the enemy of pacing. The viewer does not love your animation as much as you do. They are forgiving for about four seconds, then they are evaluating, and after eight seconds without a payoff, they are gone.

This applies at every scale: the video as a whole, each scene, each shot, each held beat. Trim. Trim. Trim.

XI. What I won't do
Generative everything. Procedural particles, synth-y abstract loops, "AI-feel" gradient swirls that mean nothing. Beautiful in isolation, vacuous in context.
Emoji as visual language. Almost always the wrong choice; almost always a sign that no design system exists.
Decorative motion on text that should sit still. Headlines that wobble. Body copy that breathes. Stop it. Type wants to be read.
Hand-drawn SVG illustration when a placeholder would do. If the animation needs a real illustration, get a real illustration. SVG-from-scratch attempts at characters or scenes look like clipart.
Linear easing on aesthetic motion. Linear is for mechanical loops only.
Motion that exists because the canvas felt empty. Empty space is a design choice, not a vacuum to fill.
XII. The last thing
Good animation is not about software, libraries, or tricks. It's about taste, restraint, and a willingness to throw away your favorite shot if it doesn't serve the whole. The tools are easy. The choices are hard.

Before I animate anything, I want to be able to answer:

What is the story, in one sentence?
Who is the protagonist of each scene?
What is the emotional shape — does this build, surprise, soothe, escalate?
What is the single takeaway the viewer leaves with?
Why does this need motion? What would be lost if it were a still?
If those five answers are clear, the animation almost makes itself. If they aren't, no amount of easing curves will save it.
