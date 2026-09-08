// @vitest-environment node
import { expect, it } from 'vitest';
import vm from 'node:vm';
import { templates } from './index';

it('draws the explicit brief deterministically when seeking without prior frames', () => {
  const template = templates['title-explainer'];
  expect(template).toBeDefined();
  const html = template.generate('Safe </title><script>bad()</script>', { width: 1280, height: 720, fps: 24, duration: 8, defaultProps: { title: 'From a thought to a film', subtitle: 'Create. Render. Play.' } })[0].content;
  expect(html).not.toContain('<script>bad()');
  const text: string[] = [];
  const ctx = new Proxy({ measureText: (s: string) => ({ width: s.length * 20 }), fillText: (s: string) => text.push(s), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (o: any, k) => o[k] ?? (() => {}) });
  let subscriber: (state: any) => void;
  const helios = { fps: { value: 24 }, bindToDocumentTimeline() {}, subscribe(fn: any) { subscriber = fn; }, getState: () => ({ currentFrame: 0, fps: 24, inputProps: {} }) };
  const context = { document: { getElementById: () => ({ getContext: () => ctx }) }, window: {} as any, Helios: class { constructor() { return helios; } } };
  const script = html.match(/<script type="module">([\s\S]*)<\/script>/)![1].replace(/import .*?;/, '');
  vm.runInNewContext(script, context);
  expect(context.window.helios).toBe(helios);
  const seek = () => { text.length = 0; subscriber!({ currentFrame: 100, fps: 24, inputProps: { title: 'From a thought to a film', subtitle: 'Create. Render. Play.' } }); return [...text]; };
  const a = seek(); subscriber!({ currentFrame: 180, fps: 24, inputProps: {} });
  expect(seek()).toEqual(a);
  expect(a.join(' ')).toContain('From a thought to a film');
});
