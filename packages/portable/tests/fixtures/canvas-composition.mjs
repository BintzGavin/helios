export default {
  width: 64, height: 32, fps: { num: 30, den: 1 }, frameCount: 8, background: '#ffffff',
  draw(ctx, frame) { ctx.fillStyle = '#ff0000'; ctx.fillRect(frame.index * 4, 8, 8, 8); }
};
