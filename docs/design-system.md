# Oído — Design system (brief §15)


## 15. Design system

### 15.1 The thesis

The circle of fifths is already a color wheel waiting to happen. Twelve keys, twelve hues, adjacent keys in adjacent colors, so harmonic distance becomes visible distance and modulation becomes a hue shift the user can watch happen.

Everything else exists to keep that idea legible: flat color, hard geometry, heavy type, generous space. Bauhaus pedagogy rather than Bauhaus pastiche.

Historical grounding worth knowing and worth mentioning somewhere in the product: Scriabin's *clavier à lumières* mapped keys to colors in circle-of-fifths order following the visible spectrum, with C as red, G as orange, D as yellow, and onward through blue and violet. This system is a perceptually corrected version of that mapping rather than an arbitrary aesthetic choice.

### 15.2 The twelve-hue system

Use **OKLCH, not HSL.** HSL hue steps are not perceptually even, since yellows and greens crowd together while blues stretch apart, so twelve equal HSL steps produce a visibly lumpy wheel. OKLCH is perceptually uniform, and rotating hue at fixed lightness and chroma gives genuinely even steps.

This also solves dark mode. Each key's identity lives in its hue angle, which never changes. Light and dark modes only re-parameterize lightness and chroma, so the palette is re-lit rather than inverted.

```
hue(key) = circleOfFifthsPosition(key) × 30°
```

| Position | Key | Hue | | Position | Key | Hue |
|---|---|---|---|---|---|---|
| 0 | C | 0° | | 6 | F♯/G♭ | 180° |
| 1 | G | 30° | | 7 | D♭ | 210° |
| 2 | D | 60° | | 8 | A♭ | 240° |
| 3 | A | 90° | | 9 | E♭ | 270° |
| 4 | E | 120° | | 10 | B♭ | 300° |
| 5 | B | 150° | | 11 | F | 330° |

Minor keys use their relative major's hue at reduced chroma and lower lightness. A minor is C's hue, dimmed. Relative keys share a key signature and the color should say so.

Mode parameters:

```css
/* light */  --key-L: 0.58;  --key-C: 0.17;
/* dark  */  --key-L: 0.74;  --key-C: 0.14;
```

A key's color is `oklch(var(--key-L) var(--key-C) <hue>)`. One formula, twelve keys, two modes. Generate the twelve as CSS custom properties at build time rather than computing per render.

### 15.3 Hue encodes key, not function

Do not let these collide. Within a single drill the user is in one key, so everything on screen belongs to one hue family, and function is encoded through other channels.

| Concept | Channel |
|---|---|
| Key | Hue angle |
| Tonic and stability | Full chroma, largest weight, anchored position |
| Active degrees | Same hue, raised lightness, reduced chroma, visibly less settled |
| Chromatic, outside the key | The complementary hue at +180° |
| Chord against pitch | Shape, not color (§15.6) |

The complementary-hue rule is the load-bearing idea. Outside the key means outside on the wheel. Apply it consistently to secondary dominants, borrowed chords and modal interchange, and all three read instantly as coming from elsewhere.

### 15.4 Never encode by hue alone

A hard requirement rather than a nicety. Roughly one man in twelve has some form of color vision deficiency, and a twelve-hue system is exactly the case that breaks for them.

Every hue-coded element carries a redundant channel, whether a text label, a shape or a position. The circle of fifths must be readable with all color stripped out. Ship a "reduce color coding" setting that falls back to a monochrome and label system, and test the whole app with it enabled.

### 15.5 Neutrals

```css
/* light */
--ground:  #D8DAD2;   /* putty, not white, not cream */
--surface: #F7F6F2;
--ink:     #16171A;
--ink-dim: #5C6068;

/* dark */
--ground:  #17181B;
--surface: #1F2124;
--ink:     #EDEBE6;
--ink-dim: #9498A0;
```

The light ground is deliberately a mid-tone putty rather than white, which lets the twelve hues sit at full saturation without screaming and keeps the app from reading as a generic productivity tool.

### 15.6 Typography and geometry

| Role | Face | Treatment |
|---|---|---|
| Display | Archivo Black | Tight tracking at −0.03em, sentence case, at scale and sparingly |
| Body and UI | Archivo 400 and 600 | Sentence case, measure capped around 60 to 70 characters |
| Analysis | JetBrains Mono 400 and 700 | Roman numerals, scale degrees, tab, timings, coverage figures |

All three are free on Google Fonts, so nothing blocks the build. The mono is load-bearing rather than stylistic, because Roman numerals are annotation marks and have to align in columns to be scannable.

Type scale at a 1.25 ratio: 11, 13, 16, 20, 25, 31, 39, 49, 61.

Bauhaus primaries used semantically:

- **Circle** is a pitch. The tonic is the largest circle.
- **Square** is a chord. Inversions rotate it 45° progressively.
- **Triangle** is tension, leading motion, unresolved.

Rules: flat fills only, with no gradients, shadows or glassmorphism. The one exception is the circle-of-fifths wheel, where adjacent segments may blend to show hue continuity. Border radius stays between 0 and 2px. Rules are 2px in light mode and 1px in dark, since heavy rules on dark grounds read as blocky. An 8px base grid with hard alignment and no optical fudging.

### 15.7 Motion

Sparse and mechanical. Things snap, rotate and translate on straight paths. They do not bounce, fade or ease elastically, because Bauhaus objects have mass and no softness.

Spend the animation budget on the modulation transition. When a piece changes key, the whole interface hue rotates through the intervening degrees on the wheel, so a modulation to the dominant visibly rotates 30°. This is the signature moment of the app and the clearest available demonstration of what a modulation is.

Respect `prefers-reduced-motion` by replacing the rotation with an instant cut and a label.

### 15.8 Key components

**The circle of fifths** is the primary orientation object. Twelve segments, the current key highlighted, related keys marked with shape overlays. It sits small in the header on every screen and expands on tap. Home base rather than decoration.

**Lesson card.** 2px ink border, hard corners, an eyebrow in mono reading something like `T8 · 3 min`, an Archivo Black title, short body, one flat-fill action. No illustrations.

**Drill card.** The current key's hue as a full-bleed field, the prompt in Archivo Black reversed out, answer chips in mono on flat surface. The hue field is how the user always knows what key they are in without reading.

**Skill constellation.** Nodes as circles sized by mastery, edges as 1px straight lines, tracks distinguished by shape rather than color, since color is reserved for keys. Zoomable and pannable.

**Corpus Coverage.** The largest number in the app. Archivo Black at scale 61, a mono label beneath, and the increment from the next unlock shown in the complementary hue.

**Transcription workbench.** Bars as squares along a timeline, each filled with its chord's function value, borrowed chords appearing in the complementary hue. The harmonic shape of a whole song becomes visible as a color strip, which is where the system pays off most.

### 15.9 Token scaffold

```css
:root{
  --key-L:0.58; --key-C:0.17;
  --ground:#D8DAD2; --surface:#F7F6F2; --ink:#16171A; --ink-dim:#5C6068;
  --rule:2px; --radius:2px; --grid:8px;
}
[data-theme="dark"]{
  --key-L:0.74; --key-C:0.14;
  --ground:#17181B; --surface:#1F2124; --ink:#EDEBE6; --ink-dim:#9498A0;
  --rule:1px;
}
/* generated at build: --key-C-hue:0deg; --key-G-hue:30deg; … */
.key-field{background:oklch(var(--key-L) var(--key-C) var(--active-key-hue));}
.chromatic{color:oklch(var(--key-L) var(--key-C) calc(var(--active-key-hue) + 180deg));}
```

Build both themes in Phase 0. Retrofitting dark mode is the most expensive mistake available in this design direction.

### 15.10 Voice

Plain, specific, active. Sentence case everywhere including buttons. Errors state what happened and what to do, as in "No signal from the mic. Check input in Settings." Never apologize and never say "Oops." An empty progress screen is an invitation to start.

Keep all strings in a single locale file from Phase 0, Spanish and English. Cheap now and expensive later.

---
