import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { layoutText, loadFont } from '../src/text.js';

it('matches independent HarfBuzz glyph order and placement for four writing systems', async () => {
  const oracle = JSON.parse(await readFile(new URL('./fixtures/harfbuzz-oracles.json', import.meta.url), 'utf8'));
  for (const item of oracle.cases) {
    const font = loadFont(await readFile(new URL(`./fixtures/fonts/${item.font}`, import.meta.url)));
    const result = layoutText({ id: 'oracle', type: 'text', text: item.text, fonts: ['font'], fontSize: item.unitsPerEm, direction: item.direction }, 20000, new Map([['font', font]]));
    expect(result.glyphIds[0], item.text).toEqual(item.glyphIds);
    const positions = [...result.svg.matchAll(/transform="translate\(([-\d.]+) ([-\d.]+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
    let cursor = 0;
    for (let i = 0; i < item.positions.length; i++) {
      const [advance, , xOffset, yOffset] = item.positions[i];
      expect(positions[i][0], `${item.text}: glyph ${i} x`).toBeCloseTo(cursor + xOffset, 4);
      expect(positions[i][1], `${item.text}: glyph ${i} y`).toBeCloseTo(font.ascent - yOffset, 4);
      cursor += advance;
    }
  }
});
