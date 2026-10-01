declare module 'fontkit' {
  export interface Glyph { id: number; path: { toSVG(): string }; codePoints: number[] }
  export interface Font {
    unitsPerEm: number; ascent: number; descent: number; familyName: string; variationAxes: Record<string, unknown>;
    hasGlyphForCodePoint(codePoint: number): boolean;
    layout(text: string, features?: string[], script?: string, language?: string, direction?: string): { glyphs: Glyph[]; positions: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }[] };
  }
  export function create(data: Uint8Array): Font;
}
declare module 'bidi-js' {
  export default function bidiFactory(): {
    getEmbeddingLevels(text: string, direction?: 'ltr' | 'rtl'): { levels: Uint8Array; paragraphs: { start: number; end: number; level: number }[] };
    getMirroredCharacter(character: string): string | null;
  };
}
