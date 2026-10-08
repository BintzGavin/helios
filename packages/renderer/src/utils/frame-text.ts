/**
 * Text below this effective opacity does not count as on screen. Effective opacity is the
 * product of the text's own and its ancestors' `opacity` (they composite multiplicatively)
 * times the alpha of the ink it is drawn with. At 0.1, white text on black, the most
 * favourable case, has a contrast ratio under 1.2:1: a tint, not a word. Anything fainter is
 * either hidden on purpose (laid out ahead of its time) or mid-fade. The check is for
 * presence and timing; whether a word is easy to read is for contact sheets to show.
 */
export const DEFAULT_MIN_TEXT_OPACITY = 0.1;

/**
 * Defines two functions in the page:
 *
 * - `window.__helios_arm_drawn_text(t)` sets `window.heliosDrawnText` to a fresh Set before the
 *   frame at t is drawn. The set only accepts entries while the page's virtual time is t, so
 *   a requestAnimationFrame loop that still draws the previous frame between arming and
 *   seeking cannot leak that frame's words into this one.
 * - `window.__helios_read_frame_text(minOpacity, nextT)` runs pending animation frames (as a
 *   captured frame would) and returns `{ text, drawn }`: the text visible in the viewport, as
 *   runs, and the contents of `window.heliosDrawnText`. With nextT, it then arms the next
 *   frame, saving a round trip per frame.
 *
 * Text is visible when its element is rendered (`checkVisibility` with opacity and visibility
 * checks), its effective opacity reaches minOpacity, and at least half of it lies inside the
 * viewport and inside every ancestor whose overflow clips it. Runs join text nodes that sit
 * next to each other on a line with no gap, so a word split into one span per letter reads as
 * one word; hidden text, rendered whitespace and gaps break runs.
 *
 * A string, not a function: transpilers can inject helpers that do not exist in the page.
 */
export const FRAME_TEXT_SCRIPT = `(() => {
  let armedAt = null;
  class FrameDrawnText extends Set {
    add(value) {
      const now = window.__HELIOS_VIRTUAL_TIME__;
      if (armedAt === null || typeof now !== 'number' || now === armedAt) super.add(value);
      return this;
    }
  }

  window.__helios_arm_drawn_text = (t) => {
    armedAt = t * 1000;
    window.heliosDrawnText = new FrameDrawnText();
  };

  // The parent in the flat tree: slots, shadow hosts.
  function flatParent(node) {
    if (node.assignedSlot) return node.assignedSlot;
    if (node.parentElement) return node.parentElement;
    const parent = node.parentNode;
    return parent && parent.host ? parent.host : null;
  }

  function number(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function colorAlpha(value) {
    if (!value || value === 'none') return 0;
    if (value === 'transparent') return 0;
    if (value.startsWith('url(')) return 1;
    const slash = /\\/\\s*([\\d.]+)(%?)\\s*\\)\\s*$/.exec(value);
    if (slash) return slash[2] ? number(slash[1], 100) / 100 : number(slash[1], 1);
    const rgba = /^rgba\\(([^)]*)\\)/.exec(value);
    if (rgba) {
      const parts = rgba[1].split(',');
      if (parts.length === 4) return number(parts[3], 1);
    }
    return 1;
  }

  // The alpha of what the text is painted with: its fill, or a stroke, shadow or
  // background-clip: text that shows it when the fill is transparent.
  function inkAlpha(el, style) {
    if (el instanceof SVGElement) {
      const fill = colorAlpha(style.fill) * number(style.fillOpacity, 1);
      const stroke = number(style.strokeWidth, 1) > 0 ? colorAlpha(style.stroke) * number(style.strokeOpacity, 1) : 0;
      return Math.max(fill, stroke);
    }
    const clip = style.getPropertyValue('-webkit-background-clip') || style.backgroundClip || '';
    if (clip.includes('text')) return 1;
    const fill = colorAlpha(style.getPropertyValue('-webkit-text-fill-color') || style.color);
    const stroke = number(style.getPropertyValue('-webkit-text-stroke-width'), 0) > 0
      ? colorAlpha(style.getPropertyValue('-webkit-text-stroke-color'))
      : 0;
    const shadow = style.textShadow && style.textShadow !== 'none' ? 1 : 0;
    return Math.max(fill, stroke, shadow);
  }

  // Establishes a containing block for position: fixed descendants.
  function containsFixed(style) {
    return style.transform !== 'none' || style.translate !== 'none' || style.rotate !== 'none' ||
      style.scale !== 'none' || style.perspective !== 'none' || style.filter !== 'none' ||
      (style.backdropFilter && style.backdropFilter !== 'none') ||
      /paint|layout|strict|content/.test(style.contain || '') ||
      /transform|perspective|filter/.test(style.willChange || '') ||
      (style.containerType && style.containerType !== 'normal');
  }

  function containsAbsolute(style) {
    return style.position !== 'static' || containsFixed(style);
  }

  window.__helios_read_frame_text = (minOpacity, nextT) => {
    // A captured frame runs the page's pending animation frames first; do the same, at the
    // frame's virtual time, so rAF-driven pages have drawn it.
    if (typeof window.__helios_flush_animation_frames === 'function') window.__helios_flush_animation_frames();

    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    // The root's overflow, or the body's when the root's is visible, applies to the viewport.
    const bodyOverflowIsViewport = rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible';
    const styles = new Map();
    const opacities = new Map();
    const clips = new Map();
    const range = document.createRange();

    function styleOf(el) {
      let style = styles.get(el);
      if (!style) {
        style = getComputedStyle(el);
        styles.set(el, style);
      }
      return style;
    }

    function opacityOf(el) {
      if (!el) return 1;
      let value = opacities.get(el);
      if (value === undefined) {
        const style = styleOf(el);
        // display: contents generates no box, so its opacity applies to nothing.
        const own = style.display === 'contents' ? 1 : number(style.opacity, 1);
        value = own * opacityOf(flatParent(el));
        opacities.set(el, value);
      }
      return value;
    }

    // The viewport, cut by the overflow of every ancestor that clips el. Absolutely and
    // fixed-positioned boxes escape ancestors below their containing block.
    function clipOf(el) {
      let clip = clips.get(el);
      if (clip) return clip;
      clip = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      let escaping = null;
      for (let a = el; a; a = flatParent(a)) {
        const style = styleOf(a);
        if (escaping === 'absolute' && !containsAbsolute(style)) continue;
        if (escaping === 'fixed' && !containsFixed(style)) continue;
        escaping = null;
        const isViewport = a === root || (a === document.body && bodyOverflowIsViewport);
        const clipX = style.overflowX !== 'visible';
        const clipY = style.overflowY !== 'visible';
        if (!isViewport && (clipX || clipY)) {
          const box = a.getBoundingClientRect();
          if (clipX) {
            clip.left = Math.max(clip.left, box.left);
            clip.right = Math.min(clip.right, box.right);
          }
          if (clipY) {
            clip.top = Math.max(clip.top, box.top);
            clip.bottom = Math.min(clip.bottom, box.bottom);
          }
        }
        if (style.position === 'absolute') escaping = 'absolute';
        else if (style.position === 'fixed') escaping = 'fixed';
      }
      clips.set(el, clip);
      return clip;
    }

    function rectsOf(node, start, end) {
      range.setStart(node, start);
      range.setEnd(node, end);
      const rects = [];
      const list = range.getClientRects();
      for (let i = 0; i < list.length; i++) {
        if (list[i].width > 0 && list[i].height > 0) rects.push(list[i]);
      }
      return rects;
    }

    // 0..1: how much of the rects' area lies inside the clip.
    function visibleFraction(rects, clip) {
      let total = 0;
      let inside = 0;
      for (const r of rects) {
        total += r.width * r.height;
        const w = Math.min(r.right, clip.right) - Math.max(r.left, clip.left);
        const h = Math.min(r.bottom, clip.bottom) - Math.max(r.top, clip.top);
        if (w > 0 && h > 0) inside += w * h;
      }
      return total > 0 ? inside / total : 0;
    }

    // The visible parts of a text node: [{ text, rects }] pieces, with null for hidden text.
    function piecesOf(node) {
      const el = node.parentElement || (node.parentNode && node.parentNode.host);
      if (!el) return [null];
      // checkVisibility() is false for display: contents (no box of its own); ask the
      // nearest ancestor that has one.
      let boxed = el;
      while (boxed && styleOf(boxed).display === 'contents') boxed = flatParent(boxed);
      if (boxed && typeof boxed.checkVisibility === 'function' && !boxed.checkVisibility({
        opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true,
        checkOpacity: true, checkVisibilityCSS: true,
      })) {
        return [null];
      }
      const style = styleOf(el);
      if (style.visibility !== 'visible') return [null];
      if (opacityOf(el) * inkAlpha(el, style) < minOpacity) return [null];
      const data = node.data;
      const rects = rectsOf(node, 0, data.length);
      if (rects.length === 0) return [null];
      const clip = clipOf(el);
      const fraction = visibleFraction(rects, clip);
      if (fraction >= 0.999) return [{ text: data, rects }];
      if (fraction === 0) return [null];
      // Partly clipped: decide word by word.
      const pieces = [];
      const words = /\\S+/g;
      let match;
      while ((match = words.exec(data))) {
        if (match.index > 0) pieces.push(null);
        const wordRects = rectsOf(node, match.index, match.index + match[0].length);
        pieces.push(wordRects.length > 0 && visibleFraction(wordRects, clip) >= 0.5 ? { text: match[0], rects: wordRects } : null);
      }
      if (/\\s$/.test(data)) pieces.push(null);
      return pieces;
    }

    // Collapsible whitespace that takes up room on a line separates words; whitespace that
    // renders nothing (between blocks or flex items) does not.
    function isRenderedSpace(node) {
      return rectsOf(node, 0, node.data.length).length > 0;
    }

    // Same line, and no more than a sliver apart: letters of one word in separate elements.
    function touching(a, b) {
      const height = Math.min(a.height, b.height);
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlap < 0.5 * height) return false;
      const gap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
      return gap <= 0.15 * height;
    }

    const runs = [];
    let run = null;
    const endRun = () => {
      if (run) {
        const text = run.text.replace(/\\s+/g, ' ').trim();
        if (text) runs.push(text);
        run = null;
      }
    };
    const addPiece = (piece) => {
      const first = piece.rects[0];
      if (run && !/^\\s/.test(piece.text) && !/\\s$/.test(run.text) && touching(run.last, first)) {
        run.text += piece.text;
      } else {
        endRun();
        run = { text: piece.text, last: first };
      }
      run.last = piece.rects[piece.rects.length - 1];
    };

    const skip = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, NOSCRIPT: 1, TEXTAREA: 1, SELECT: 1 };
    const visit = (node) => {
      if (node.nodeType === 3) {
        if (!/\\S/.test(node.data)) {
          if (isRenderedSpace(node)) endRun();
          return;
        }
        for (const piece of piecesOf(node)) {
          if (piece) addPiece(piece);
          else endRun();
        }
        return;
      }
      if (node.nodeType === 1) {
        if (skip[node.tagName.toUpperCase()] || styleOf(node).display === 'none') return;
        if (node.shadowRoot) visit(node.shadowRoot);
      } else if (node.nodeType !== 11) {
        return;
      }
      for (let child = node.firstChild; child; child = child.nextSibling) visit(child);
    };
    visit(document.body || root);
    endRun();

    let drawn = [];
    try {
      if (window.heliosDrawnText && typeof window.heliosDrawnText[Symbol.iterator] === 'function') {
        drawn = Array.from(window.heliosDrawnText, (value) => String(value));
      }
    } catch (err) {
      drawn = [];
    }
    if (typeof nextT === 'number') window.__helios_arm_drawn_text(nextT);
    return { text: runs, drawn };
  };
})()`;
