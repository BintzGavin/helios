// Type written in light: a bright point travels along glyph outlines and leaves a trail, the
// way a long exposure records a moving light.

/** Total length of a set of polylines. */
export function contoursLength(contours) {
  let total = 0;
  for (const c of contours) {
    for (let i = 1; i < c.length; i++) total += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
  }
  return total;
}

/**
 * Stroke the first `reveal` pixels of `contours` (in order) as light: an older, dimmer trail
 * and a hot recent stretch. Returns the head's position, or null when nothing is revealed.
 */
export function drawLight(c, contours, reveal, { width = 3, color = '255, 244, 214', glow = 'rgba(240, 187, 59, 0.9)', hot = 140, blur = 16, alpha = 1 } = {}) {
  if (reveal <= 0) return null;
  const old = new Path2D();
  const recent = new Path2D();
  let walked = 0;
  let head = null;
  for (const contour of contours) {
    if (walked >= reveal) break;
    old.moveTo(...contour[0]);
    let inRecent = false;
    for (let i = 1; i < contour.length; i++) {
      const [x0, y0] = contour[i - 1];
      const [x1, y1] = contour[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      let end = [x1, y1];
      if (walked + len > reveal) {
        const k = (reveal - walked) / len;
        end = [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
      }
      old.lineTo(...end);
      if (walked + len > reveal - hot) {
        if (!inRecent) recent.moveTo(x0, y0);
        inRecent = true;
        recent.lineTo(...end);
      }
      walked += len;
      head = end;
      if (walked >= reveal) break;
    }
  }
  if (alpha <= 0) return head;
  c.save();
  c.globalAlpha *= alpha;
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.shadowColor = glow;
  c.shadowBlur = blur;
  c.strokeStyle = `rgba(${color}, 0.55)`;
  c.lineWidth = width;
  c.stroke(old);
  c.strokeStyle = `rgba(${color}, 1)`;
  c.lineWidth = width * 1.35;
  c.stroke(recent);
  c.restore();
  return head;
}

/** The light source itself: a white core in a gold bloom. */
export function drawSpark(c, [x, y], size = 1) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, 70 * size);
  g.addColorStop(0, 'rgba(255, 250, 235, 0.95)');
  g.addColorStop(0.08, 'rgba(255, 226, 150, 0.7)');
  g.addColorStop(0.3, 'rgba(240, 187, 59, 0.22)');
  g.addColorStop(1, 'rgba(240, 187, 59, 0)');
  c.fillStyle = g;
  c.fillRect(x - 70 * size, y - 70 * size, 140 * size, 140 * size);
  c.restore();
}
