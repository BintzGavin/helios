import { create, Font } from 'fontkit';
import bidiFactory from 'bidi-js';
import { Node, RenderError } from './plan.js';

const bidi = bidiFactory();
const graphemes = new Intl.Segmenter('und', { granularity: 'grapheme' });
const words = new Intl.Segmenter('und', { granularity: 'word' });
const ignorable = /[\p{Cf}\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u;
export interface TextLayout { width: number; lines: string[]; svg: string; glyphIds: number[][]; paths: { d: string; x: number; y: number; scale: number }[] }
export function loadFont(bytes: Uint8Array): Font {
  const signature = Buffer.from(bytes.subarray(0, 4)).toString('hex');
  if (!['00010000', '4f54544f'].includes(signature)) throw new RenderError('UNSUPPORTED_FONT', 'Expected a static TTF or OTF font');
  try {
    const font = create(bytes);
    if (Object.keys(font.variationAxes ?? {}).length) throw new RenderError('UNSUPPORTED_FONT', 'Variable fonts require a prepared static instance');
    if (!font.unitsPerEm || typeof font.layout !== 'function') throw new Error('Invalid font');
    return font;
  } catch (error) { if (error instanceof RenderError) throw error; throw new RenderError('INVALID_FONT', 'Font data could not be parsed'); }
}
interface Run { text: string; font: Font; level: number }
function shapeLine(text: string, fontList: Font[], size: number, nodeId: string) {
  return (direction?: 'ltr' | 'rtl') => {
    const embedding = bidi.getEmbeddingLevels(text, direction), runs: Run[] = [];
    for (const segment of graphemes.segment(text)) {
      const points = Array.from(segment.segment).filter(c => !ignorable.test(c));
      const font = fontList.find(f => points.every(c => f.hasGlyphForCodePoint(c.codePointAt(0)!)));
      if (!font) throw new RenderError('MISSING_GLYPH', `Node ${nodeId}: no declared font covers grapheme ${JSON.stringify(segment.segment)}`);
      const level = embedding.levels[segment.index], previous = runs[runs.length - 1];
      if (previous && previous.font === font && previous.level === level) previous.text += segment.segment;
      else runs.push({ text: segment.segment, font, level });
    }
    // Apply UAX #9 L2 to logical runs. Fontkit shapes each run in its logical
    // direction and returns the glyph order for that run; never reverse codepoints.
    const max = Math.max(0, ...runs.map(r => r.level)), minOdd = Math.min(...runs.filter(r => r.level % 2).map(r => r.level));
    for (let level = max; level >= minOdd; level--) {
      for (let i = 0; i < runs.length;) {
        if (runs[i].level < level) { i++; continue; }
        let end = i + 1; while (end < runs.length && runs[end].level >= level) end++;
        runs.splice(i, end - i, ...runs.slice(i, end).reverse()); i = end;
      }
    }
    let width = 0;
    const placed: { path: string; x: number; y: number; scale: number; id: number }[] = [];
    for (const run of runs) {
      const shaped = run.font.layout(run.text, [], undefined, undefined, run.level % 2 ? 'rtl' : 'ltr');
      const scale = size / run.font.unitsPerEm;
      for (let i = 0; i < shaped.glyphs.length; i++) {
        const glyph = shaped.glyphs[i], pos = shaped.positions[i];
        if (glyph.id === 0 && glyph.codePoints.some(p => !ignorable.test(String.fromCodePoint(p)))) throw new RenderError('MISSING_GLYPH', `Node ${nodeId}: shaping produced a missing glyph`);
        placed.push({ path: glyph.path.toSVG(), x: width + pos.xOffset * scale, y: pos.yOffset * scale, scale, id: glyph.id });
        width += pos.xAdvance * scale;
      }
    }
    return { width, placed };
  };
}
export function layoutText(node: Node, width: number, fonts: Map<string, Font>): TextLayout {
  if (width <= 0) throw new RenderError('INVALID_LAYOUT', `Node ${node.id}: text width must be positive`);
  const fontList = node.fonts!.map(id => { const font = fonts.get(id); if (!font) throw new RenderError('MISSING_FONT', `Node ${node.id}: missing font ${id}`); return font; });
  const direction = node.direction === 'auto' ? undefined : node.direction;
  const shape = (text: string) => shapeLine(text, fontList, node.fontSize!, node.id)(direction);
  const lines: string[] = [];
  for (const paragraph of node.text!.split(/\r?\n/)) {
    let line = '';
    for (const word of words.segment(paragraph)) {
      const candidate = line + word.segment;
      if (shape(candidate).width <= width) { line = candidate; continue; }
      if (line.trimEnd()) lines.push(line.trimEnd());
      line = word.segment.trimStart();
      if (shape(line).width > width) {
        let partial = '';
        for (const g of graphemes.segment(line)) {
          if (shape(g.segment).width > width) throw new RenderError('TEXT_OVERFLOW', `Node ${node.id}: a grapheme exceeds its text box`);
          if (shape(partial + g.segment).width > width) { lines.push(partial); partial = ''; }
          partial += g.segment;
        }
        line = partial;
      }
    }
    lines.push(line.trimEnd());
  }
  const baseline = Math.max(...fontList.map(f => f.ascent / f.unitsPerEm)) * node.fontSize!;
  const lineHeight = node.lineHeight ?? node.fontSize! * 1.4;
  const glyphIds: number[][] = [];
  const paths: TextLayout['paths'] = [];
  const svg = lines.map((line, index) => {
    const result = shape(line), offset = node.align === 'center' ? (width - result.width) / 2 : node.align === 'right' ? width - result.width : 0;
    glyphIds.push(result.placed.map(g => g.id));
    return result.placed.map(g => {
      const x = offset + g.x, y = baseline + index * lineHeight - g.y;
      paths.push({ d: g.path, x, y, scale: g.scale });
      return `<path d="${g.path}" transform="translate(${x} ${y}) scale(${g.scale} ${-g.scale})"/>`;
    }).join('');
  }).join('');
  return { width, lines, svg, glyphIds, paths };
}
