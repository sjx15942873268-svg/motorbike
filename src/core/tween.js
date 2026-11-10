const active = new Set();

export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function tween({ duration = 1, ease = easeInOutCubic, onUpdate, onComplete }) {
  const tw = { t: 0, duration, ease, onUpdate, onComplete, dead: false };
  active.add(tw);
  return tw;
}

export function kill(tw) {
  if (tw) tw.dead = true;
}

export function updateTweens(dt) {
  for (const tw of [...active]) {
    if (tw.dead) { active.delete(tw); continue; }
    tw.t += dt / tw.duration;
    const k = Math.min(tw.t, 1);
    try { tw.onUpdate && tw.onUpdate(tw.ease(k)); } catch (e) { console.error('[tween]', e); }
    if (tw.t >= 1) {
      active.delete(tw);
      try { tw.onComplete && tw.onComplete(); } catch (e) { console.error('[tween]', e); }
    }
  }
}
