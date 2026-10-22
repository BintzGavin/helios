# Lyric timings and karaoke

## Contents

- [Tier 0: line times, no machine learning](#tier-0-line-times-no-machine-learning)
- [Tier 1: vocal stem plus alignment](#tier-1-vocal-stem-plus-alignment)
- [Tier 2: forced alignment with refinement](#tier-2-forced-alignment-with-refinement)
- [Checking timings without ears](#checking-timings-without-ears)
- [The data model](#the-data-model)
- [Karaoke recipes](#karaoke-recipes)
- [Pen-written lyrics](#pen-written-lyrics)

## Before any tier: one time base

```bash
ffmpeg -i song.mp3 -ar 44100 -ac 2 song.wav     # decode once; use song.wav for everything below and for --audio
```

## Tier 0: line times, no machine learning

Use when the user gives an `.srt`, `.vtt` or `.lrc`, or only the text. Split each line's span across its words by syllable count, and leave a little air at the end of the line:

```js
const syllables = (w) => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').replace(/e$/, '').match(/[aeiouy]+/g) || []).length);
function splitLine(text, start, end) {
  const words = text.split(/\s+/).filter(Boolean), n = words.map(syllables), total = n.reduce((a, b) => a + b, 0);
  const span = (end - start) * 0.9;            // the last word usually holds; don't stretch it to the next line
  let t = start;
  return words.map((w, i) => { const d = span * n[i] / total; const o = { w, start: +t.toFixed(3), end: +(t + d).toFixed(3) }; t += d; return o; });
}
```

Mark the file `"approx": true` and tell the user the word highlight is approximate. Line-level reveals (a whole line lighting at its start) are honest at this tier; per-glyph wipes are not.

## Tier 1: vocal stem plus alignment

```bash
pip install demucs stable-ts
demucs --two-stems=vocals -o stems song.wav              # → stems/htdemucs/song/vocals.wav
```

Align the known lyrics (one line per line of text) to the vocal stem:

```python
# align.py — python align.py stems/htdemucs/song/vocals.wav lyrics.txt lyrics.json
import json, sys, stable_whisper
audio, text_file, out = sys.argv[1:4]
lines = [l.strip() for l in open(text_file, encoding='utf8') if l.strip()]
model = stable_whisper.load_model('medium')
result = model.align(audio, '\n'.join(lines), language='en')
words = [{'w': w.word.strip(), 'start': round(w.start, 3), 'end': round(w.end, 3)}
         for seg in result.segments for w in seg.words if w.word.strip()]
# Rebuild lines by walking the known text, so line breaks are the user's, not the model's.
out_lines, i = [], 0
for line in lines:
    n = len(line.split())
    out_lines.append({'text': line, 'start': words[i]['start'], 'end': words[i + n - 1]['end'], 'first': i, 'last': i + n - 1})
    i += n
json.dump({'approx': False, 'lines': out_lines, 'words': words}, open(out, 'w'), indent=1)
```

If the word count from the model doesn't match the text, the script's line rebuild will be off: strip punctuation the same way on both sides and spell numbers as sung ("twenty-five", not "25"). WhisperX alignment (`whisperx.align` with the known lines as segments) is an equivalent alternative.

## Tier 2: forced alignment with refinement

For lyric videos where every word must land on its consonant. The core is torchaudio's multilingual forced aligner:

```python
import torch, torchaudio
bundle = torchaudio.pipelines.MMS_FA
model, tokenizer, aligner = bundle.get_model(), bundle.get_tokenizer(), bundle.get_aligner()
wav, sr = torchaudio.load('stems/htdemucs/song/vocals.wav')
wav = torchaudio.functional.resample(wav.mean(0, keepdim=True), sr, bundle.sample_rate)
words = [normalize(w) for w in lyric_words]                       # lowercase a–z only, acronyms spelled as sung
with torch.inference_mode():
    emission, _ = model(wav)
    spans = aligner(emission[0], tokenizer(words))
ratio = wav.size(1) / emission.size(1) / bundle.sample_rate       # seconds per emission frame
times = [(s[0].start * ratio, s[-1].end * ratio) for s in spans]
```

For long songs, align line by line inside generous windows from tier 1, or add a "garbage" token between lines so ad-libs and backing vocals don't drag words around.

Then refine each word on the vocal stem's features (RMS, spectral flux, pitch voicing, high-band sibilance):

- **Pronunciation spellings.** Write acronyms and odd words as they're sung: "AGI" → "ay gee eye". Splitting a word into sung parts also gives syllable times for free.
- **Rest onsets.** If there's a rest of 50 ms or more before the word, start it where the voice re-enters. Aligners fire late on held vowels.
- **Onset snap.** Otherwise snap the start to the strongest spectral-flux peak in the 60 ms before the aligned start.
- **Fricatives.** For words starting with s, sh, ch, f, th or h, move the start back to where the hiss begins; aligners mark the consonant at its end.
- **Ends.** The next word's start when sung legato; otherwise where the level drops 15 dB below the word's level for 60 ms or more.
- **Monotonic.** Force starts to increase.
- **Cross-check** with Whisper word timestamps (with the song's jargon in its `initial_prompt`). Where the two disagree by more than about 60 ms, flag the word and look at it.

Expect a handful of manual fixes per song. Record each with a reason.

## Checking timings without ears

Make a small debug page: draw the vocal stem's loudness (from `helios analyze vocals.wav`, `envelope.level`) as a waveform across a 4-second window, draw each word as a labelled box from `start` to `end`, and a playhead. Then look at strips around doubtful words:

```bash
npx -y @helios-project/cli@latest analyze stems/htdemucs/song/vocals.wav           # vocals.beats.json: envelope and onsets of the voice
npx -y @helios-project/cli@latest sheet debug.html --strip 41.2:42.4 --fps 30       # word boxes against the voice
```

A word whose box starts before the energy rises, or long after it, is wrong. Running `analyze` on the vocal stem also gives a per-frame vocal envelope and vocal onsets that scenes can react to.

## The data model

```json
{ "approx": false,
  "lines": [{ "text": "...", "start": 0, "end": 0, "first": 0, "last": 0 }],
  "words": [{ "w": "...", "start": 0, "end": 0, "syl": [[0, 0], [0, 0]] }] }
```

- `words` is the list `helios verify --cues lyrics.json` checks: each word must be on screen at its time.
- `first` and `last` index into `words`. `syl` is optional.
- What's displayed can differ from what's sung: show "25%" over "twenty-five percent" by putting the displayed text in `w`.

Helpers (all in [karaoke.html](../karaoke.html)):

- `lyric(phrase, nth)` finds a phrase by content and returns `{ line, words }`. It throws if the phrase is missing, so a lyric edit can't silently break a cue.
- `wordSpans(line)` maps each word to its glyphs in `line.text`, so display punctuation (`night,`, `“every`) and punctuation-only tokens (`—`) don't shift the wipe. It assumes one display token per word; never step through `line.text` by `w.length + 1`.
- `wordProgress(w, t)` returns 0→1 through a word, moving piecewise across its syllables.
- Characters sung in a word: `wordProgress(w, t) * n`, where `n` is the length of the word's span in `line.text` (punctuation included). Glyph `k` is lit by `clamp(progress * n - k)`.

## Karaoke recipes

**Per-glyph wipe.** Draw the whole line unsung, then each lit glyph again, clipped to its lit fraction. Position glyph `i` as `measure(text.slice(0, i + 1)) - measure(text[i])`, not `measure(text.slice(0, i))`: measuring the prefix alone drops the kerning pair between sung and unsung pieces, and the line shimmers as the wipe passes.

**Colours.** Sung text in the full text colour; unsung at 30–40 % of it; the glyph being sung in the accent. When a glyph finishes, **snap** to the done colour. A linear blend from an orange accent to off-white passes through salmon.

**A pop on each word start:** scale 1.06 decaying over about 0.1 s. Keep it small; type wants to be read.

**Held notes** (longer than ~0.9 s): stretch the word on a variable font's width axis, add letter-spacing, or lift it slightly across the hold. Canvas can't set variation axes directly; use DOM text with `font-variation-settings`, or load two static instances and switch at a threshold. Spread rightward from the word's left edge, and only on a row's last word, or it runs into its neighbours.

**Layout.**
- Two rows alternating is the classic layout: a line appears dim on its row 0.4 s early, stays until fully sung, and leaves when the line after next needs the row.
- Keep lyrics in title-safe: 96 px or more from the edges at 1080p.
- Break lines where the singer breathes, not by width. Re-break a line that's too wide at a natural phrase.
- Curly quotes for display text (`'` → `’`), straight quotes for typed monospace.
- No outlined or haloed type as a crutch for contrast: put a quiet area behind the line instead.

**Every scene integrates the lyric differently.** Words ride a curve, are typed as tokens, stamped on a form, revealed from `[MASK]` blocks, engraved, written by a pen. Plain subtitles all the way through waste the format. Deliberate rule-breaking moments (a highlight running right to left on a line about going backwards) land because the rest is strict.

**Lyric as pixels or cells** (a grid of windows that spells the word): draw the word once to an offscreen canvas made with `getContext('2d', { willReadFrequently: true })` in `ready`, read the mask with `getImageData`, and light each cell from its sample and its glyph's sung time. Per-glyph kerning positions don't apply here; the grid sets the spacing. Still declare the word with `heliosDrawnText`.

**A counter tied to the lyric.** A number that steps up each time a word is sung (`L.words.filter(w => w.w === 'one' && w.start <= t).length`), with a 0.9 s ease-out roll, is a cheap and strong narrative device.

## Pen-written lyrics

Single-stroke fonts (Hershey fonts, public domain or OFL) give text that a pen can write. Parse the font's SVG glyph paths into polylines once in `ready`, with cumulative lengths and the length range of each character. Then:

- `writtenLength(t)`: for each character, map its word's `[start, end]` onto its length range, so a character is written while its word is sung.
- Draw the first `writtenLength(t)` pixels of the polylines and return the pen-head position, where a spark or nib sits.

A lighter version for a few words: draw SVG text paths with `stroke-dasharray` equal to the path length and `stroke-dashoffset` driven from the word's progress.
