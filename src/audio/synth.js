// 音效合成原语：全部 Web Audio 实时合成，不使用任何音频文件。
// 每个 play* 函数都是一次性发声（自建节点、到点自动停止），
// 持续音（电机/轮胎）由 engine.js 自己维护。

// ---- 噪声 buffer ----

// 白噪声：1 秒，供短促脉冲（继电器/刹车/开箱/开关）使用
export function createNoiseBuffers(ctx) {
  const white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const wd = white.getChannelData(0);
  for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;

  // 粉噪声：2 秒，Paul Kellet 近似，供轮胎滚动使用
  const len = Math.floor(ctx.sampleRate * 2);
  const pink = ctx.createBuffer(1, len, ctx.sampleRate);
  const pd = pink.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return { white, pink };
}

// ---- 一次性音效 ----

// 喇叭：两个方波 420Hz + 520Hz，低通 2kHz，"嘀嘀"两声
export function playHorn(ctx, dest) {
  if (!ctx || !dest) return;
  const t0 = ctx.currentTime + 0.01;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2000;
  lp.Q.value = 1;
  const g = ctx.createGain();
  lp.connect(g);
  g.connect(dest);

  [420, 520].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    o.connect(lp);
    o.start(t0);
    o.stop(t0 + 0.52);
  });

  const beep = (start, hold, vol) => {
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
    g.gain.setValueAtTime(vol, start + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, start + hold + 0.04);
  };
  beep(t0, 0.16, 0.16);
  beep(t0 + 0.24, 0.18, 0.16);
}

// 转向继电器：15ms 噪声脉冲经 3kHz 带通
export function playSignalClick(ctx, dest, buffers) {
  if (!ctx || !dest || !buffers) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buffers.white;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3000;
  bp.Q.value = 8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + 0.03);
}

// 刹车：高速刹车时短促带通噪声
export function playBrake(ctx, dest, buffers) {
  if (!ctx || !dest || !buffers) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buffers.white;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + 0.2);
}

// 外卖箱开合：低频短促闷响（正弦下滑 + 一点点噪声）
export function playBox(ctx, dest, buffers) {
  if (!ctx || !dest) return;
  const t = ctx.currentTime;

  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.2);

  if (buffers) {
    const src = ctx.createBufferSource();
    src.buffer = buffers.white;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(dest);
    src.start(t);
    src.stop(t + 0.1);
  }
}

// 送达提示：正弦 1320Hz + 1760Hz，指数衰减，"叮咚"
export function playChime(ctx, dest) {
  if (!ctx || !dest) return;
  const t0 = ctx.currentTime + 0.02;
  const notes = [
    [1320, 0, 0.5],
    [1760, 0.16, 0.7],
  ];
  notes.forEach(([f, off, dec]) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0 + off);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + off + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + dec);
    g.connect(dest);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start(t0 + off);
    o.stop(t0 + off + dec + 0.05);

    // 二次谐波让音色更亮一点
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o2.connect(g2);
    g2.connect(g);
    o2.start(t0 + off);
    o2.stop(t0 + off + dec + 0.05);
  });
}

// 灯光开关：很轻的小咔哒（spec 表格未列，但 light:toggle 由音频监听）
export function playLightClick(ctx, dest, buffers) {
  if (!ctx || !dest || !buffers) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buffers.white;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + 0.05);
}
