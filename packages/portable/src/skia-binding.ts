import { createRequire } from 'node:module';
import type * as CanvasTypes from '@napi-rs/canvas';

// Pinned binding entry point avoids the package wrapper's implicit system/user
// font-directory scan. All rendered text already consists of explicit glyph paths.
const binding = createRequire(import.meta.url)('@napi-rs/canvas/js-binding.js');
export const GlobalFonts: typeof CanvasTypes.GlobalFonts = binding.GlobalFonts;
export const Path2D: typeof CanvasTypes.Path2D = binding.Path;
export type Path2D = CanvasTypes.Path2D;
export const ImageData: typeof CanvasTypes.ImageData = binding.ImageData;
export type Canvas = CanvasTypes.Canvas;
export type Image = CanvasTypes.Image;
export type SKRSContext2D = CanvasTypes.SKRSContext2D;
export function createCanvas(width: number, height: number): Canvas { return new binding.CanvasElement(width, height); }
export async function loadImage(bytes: Uint8Array): Promise<Image> {
  const image: Image = new binding.Image();
  const loaded = new Promise<Image>((resolve, reject) => { image.onload = () => resolve(image); image.onerror = reject; });
  image.src = bytes;
  return loaded;
}
