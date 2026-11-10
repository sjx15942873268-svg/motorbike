// 音频引擎：AudioContext、master GainNode、AnalyserNode、
// 持续发声体（电机啸叫 / 轮胎滚动）以及总线事件接线。
import { state } from '../core/state.js';
import { on } from '../core/bus.js';
import {
  createNoiseBuffers,
  playHorn,
  playSignalClick,
  playBrake,
  playBox,
  playChime,
  playLightClick,
} from './synth.js';

let ctx = null;
let master = null;
let analyser = null;
let buffers = null;

let motor = null; // { osc1, osc2, out, filter }
let tire = null;  // { src, out, filter }

let muted = false;
let busWired = false;
let brakeCooldown = 0;
let prevBrake = 0;

// 面板试听用的临时状态覆盖（到点自动失效）
let testUntil = 0;
let testSpeed = 0;
let testThrottle = 0;

function ready() {
  return !!(ctx && master);
}

// ---- 持续发声体 ----

function createMotor() {
  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = 120;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 240;

  const g1 = ctx.createGain();
  g1.gain.value = 1;
  const g2 = ctx.createGain();
  g2.gain.value = 0.5;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.7;

  const out = ctx.createGain();
  out.gain.value = 0;

  osc1.connect(g1);
  g1.connect(filter);
  osc2.connect(g2);
  g2.connect(filter);
  filter.connect(out);
  out.connect(master);

  osc1.start();
  osc2.start();
  return { osc1, osc2, out, filter };
}

function createTire() {
  const src = ctx.createBufferSource();
  src.buffer = buffers.pink;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  filter.Q.value = 0.5;

  const out = ctx.createGain();
  out.gain.value = 0;

  src.connect(filter);
  filter.connect(out);
  out.connect(master);
  src.start();
  return { src, out, filter };
}

function wireBus() {
  if (busWired) return;
  busWired = true;

  on('horn', () => { if (ready()) playHorn(ctx, master); });
  on('box:toggle', () => { if (ready()) playBox(ctx, master, buffers); });
  on('signal:tick', (d) => {
    if (ready() && d && d.on) playSignalClick(ctx, master, buffers);
  });
  on('order:delivered', () => { if (ready()) playChime(ctx, master); });
  on('light:toggle', () => { if (ready()) playLightClick(ctx, master, buffers); });
  on('audio:unlock', () => {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  });
}

// ---- 公开接口 ----

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ctx = new AC();
  } catch (e) {
    ctx = null;
    return false;
  }

  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;

  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;

  master.connect(analyser);
  analyser.connect(ctx.destination);

  buffers = createNoiseBuffers(ctx);
  motor = createMotor();
  tire = createTire();
  wireBus();

  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function getAnalyser() {
  return analyser;
}

export function setMuted(v) {
  muted = !!v;
  state.audio.muted = muted;
  if (ready()) {
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }
}

export function updateAudio(dt) {
  if (!ready()) return;

  brakeCooldown = Math.max(0, brakeCooldown - dt);
  const now = ctx.currentTime;

  let speed = state.ride.speed || 0;
  let throttle = state.input.throttle || 0;
  const brake = state.input.brake || 0;

  if (now < testUntil) {
    speed = testSpeed;
    throttle = testThrottle;
  }

  // 电机啸叫：锯齿波 + 2 倍频正弦，频率 120 + speed*18 Hz，
  // 低通滤波，音量 0.02 + throttle*0.08，持续发声随状态变化
  if (motor) {
    const f = 120 + speed * 18;
    motor.osc1.frequency.setTargetAtTime(f, now, 0.05);
    motor.osc2.frequency.setTargetAtTime(f * 2, now, 0.05);
    motor.out.gain.setTargetAtTime(0.02 + throttle * 0.08, now, 0.08);
    motor.filter.frequency.setTargetAtTime(600 + throttle * 900 + speed * 8, now, 0.1);
  }

  // 轮胎滚动：粉噪声经低通，音量正比于速度
  if (tire) {
    const tg = Math.min(speed / 6.94, 1) * 0.16;
    tire.out.gain.setTargetAtTime(tg, now, 0.1);
    tire.filter.frequency.setTargetAtTime(300 + speed * 40, now, 0.1);
  }

  // 刹车：高速下踩下刹车的瞬间发一声短促带通噪声（沿触发，避免持续踩时反复响）
  const brakeRising = brake > 0.25 && prevBrake <= 0.25;
  prevBrake = brake;
  if (brakeRising && speed > 2 && brakeCooldown <= 0) {
    playBrake(ctx, master, buffers);
    brakeCooldown = 0.5;
  }
}

// ---- 面板试听入口（index.js / panel.js 使用） ----

function drive(speed, throttle, seconds) {
  testSpeed = speed;
  testThrottle = throttle;
  testUntil = ready() ? ctx.currentTime + seconds : 0;
}

export function testMotor() { drive(6, 0.8, 1.6); }
export function testTire() { drive(6, 0, 1.6); }
export function testHorn() { if (ready()) playHorn(ctx, master); }
export function testSignal() { if (ready()) playSignalClick(ctx, master, buffers); }
export function testBrake() { if (ready()) playBrake(ctx, master, buffers); }
export function testBox() { if (ready()) playBox(ctx, master, buffers); }
export function testChime() { if (ready()) playChime(ctx, master); }
export function toggleMuted() {
  setMuted(!muted);
  return muted;
}
