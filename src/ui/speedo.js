// 圆形速度表：196×196 逻辑分辨率，Canvas 2D 绘制
// 由 ui.update(dt) 每帧调用 draw(speedKmh, battery)
import { UI } from '../core/config.js';

const SIZE = 196;
const C = SIZE / 2;
const R = 88;
const TRACK_R = 82;
const TICK_OUT = 78;
const TICK_IN_MAJOR = 68;
const TICK_IN_MINOR = 73;
const LABEL_R = 58;
const NEEDLE_LEN = 50;
const MAX_SPEED = 25; // km/h
const LOW_BATTERY = 0.2;

const START = Math.PI * 0.75; // 135°，左下
const END = Math.PI * 2.25;   // 405°，右下，共 270°

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function createSpeedo(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let shown = 0;
  let last = 0;

  function angleOf(speed) {
    const f = Math.max(0, Math.min(1, speed / MAX_SPEED));
    return START + f * (END - START);
  }

  function draw(speedKmh, battery) {
    const now = performance.now();
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;
    // 指针平滑跟随
    shown += (speedKmh - shown) * Math.min(1, dt * 7);
    if (Math.abs(speedKmh - shown) < 0.02) shown = speedKmh;

    const pct = Math.max(0, Math.min(1, battery));
    const low = pct < LOW_BATTERY;
    const numColor = low ? '#FF5A5A' : UI.accent;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // 玻璃底
    const bg = ctx.createRadialGradient(C, C, 8, C, C, R + 6);
    bg.addColorStop(0, 'rgba(255,255,255,0.05)');
    bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(C, C, R + 6, 0, Math.PI * 2);
    ctx.fill();

    // 刻度轨道
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(C, C, TRACK_R, START, END);
    ctx.stroke();

    // 当前速度弧
    const a = angleOf(shown);
    ctx.strokeStyle = UI.accent;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = UI.accent;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(C, C, TRACK_R, START, a);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 刻度与数字
    ctx.font = '500 9px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= MAX_SPEED; v++) {
      const ang = angleOf(v);
      const major = v % 5 === 0;
      const r1 = TICK_OUT;
      const r2 = major ? TICK_IN_MAJOR : TICK_IN_MINOR;
      ctx.strokeStyle = major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(ang) * r1, C + Math.sin(ang) * r1);
      ctx.lineTo(C + Math.cos(ang) * r2, C + Math.sin(ang) * r2);
      ctx.stroke();
      if (major) {
        ctx.fillStyle = UI.dim;
        ctx.fillText(String(v), C + Math.cos(ang) * LABEL_R, C + Math.sin(ang) * LABEL_R);
      }
    }

    // 指针
    ctx.save();
    ctx.translate(C, C);
    ctx.rotate(a);
    ctx.strokeStyle = UI.accent;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = UI.accent;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(NEEDLE_LEN, 0);
    ctx.stroke();
    ctx.restore();

    // 中心盖
    ctx.fillStyle = '#0B0B0C';
    ctx.beginPath();
    ctx.arc(C, C, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = UI.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(C, C, 6, 0, Math.PI * 2);
    ctx.stroke();

    // 数字读数
    ctx.fillStyle = numColor;
    ctx.font = '600 26px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(shown)), C, 148);
    ctx.font = '500 8px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillStyle = UI.dim;
    ctx.fillText('km/h', C, 164);

    // 电量条
    const bw = 56;
    const bh = 4;
    const bx = C - bw / 2;
    const by = 174;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, bx, by, bw, bh, 2);
    ctx.fill();
    if (pct > 0.005) {
      ctx.fillStyle = low ? '#FF5A5A' : UI.accent;
      roundRect(ctx, bx, by, Math.max(bh, bw * pct), bh, 2);
      ctx.fill();
    }
    ctx.font = '500 8px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillStyle = low ? '#FF5A5A' : UI.dim;
    ctx.fillText(`电量 ${Math.round(pct * 100)}%`, C, 188);
  }

  return { draw };
}
