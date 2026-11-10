import * as THREE from 'three';
import { Clock } from 'three';
import { state } from './core/state.js';
import { emit, on } from './core/bus.js';
import { updateTweens, tweenCount } from './core/tween.js';
import { TOUR_STEPS } from './core/config.js';
import { buildScooter } from './model/index.js';
import { createScene } from './scene/index.js';
import { createSim } from './sim/ride.js';
import { initAudio, getAnalyser, setMuted, updateAudio, createAudioTestPanel } from './audio/index.js';
import { createUI } from './ui/index.js';
import { loadLog, saveLog, recordSnapshot, resetToday, clearAll } from './data/storage.js';
import { exportPoster } from './data/export.js';

const q = new URLSearchParams(location.search);
const solo = q.get('solo');
const canvas = document.getElementById('gl');

// ---- 场景与车辆 ----
const scene = createScene(canvas, { solo });
const scooter = buildScooter();
scene.scene.add(scooter.root);
if (solo === 'model') scene.setTurntable(true);

const sim = createSim({ scene, scooter });

// ---- 音频 ----
let audioReady = false;
function unlockAudio() {
  if (audioReady) return;
  audioReady = !!initAudio();
  state.audio.unlocked = true;
  emit('audio:unlock');
  document.getElementById('audio-hint')?.classList.add('hidden');
}
addEventListener('pointerdown', unlockAudio);
addEventListener('keydown', unlockAudio);

// ---- UI ----
const ui = createUI({
  setView,
  setExplode,
  setCutaway,
  setXray,
  tourGo,
  onResetToday: () => { resetToday(); recordSnapshot(); },
  onClear: () => { clearAll(); recordSnapshot(); },
  onExport: () => exportPoster(scene.captureFrame(), state),
});

// ---- solo 模式：只保留渲染画面 + 对应测试面板 ----
const SOLO_HIDDEN = ['#brand', '#desk', '#hud', '#hint', '#tour-card', '#part-card', '#sound-viz', '#touch', '#audio-hint'];
if (solo) {
  for (const sel of SOLO_HIDDEN) document.querySelector(sel)?.classList.add('hidden');
  if (solo === 'audio' && createAudioTestPanel) {
    const panel = createAudioTestPanel();
    panel.id = 'audio-panel';
    Object.assign(panel.style, {
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%,-50%)', zIndex: '50', minWidth: '420px',
    });
    document.body.appendChild(panel);
  }
}

// ---- 对外能力 ----
function setView(view) {
  if (!['ride', 'drive', 'inspect', 'sound'].includes(view)) return;
  state.view = view;
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.classList.toggle('on', b.dataset.view === view));
  scene.setView(view);
  emit('view:change', { view });
}

function setExplode(t) {
  state.explode = t;
  scene.setExplode(t);
  emit('explode:change', { t });
}

function setCutaway(onFlag) {
  state.cutaway = !!onFlag;
  scene.setCutaway(state.cutaway);
  emit('cutaway:change', { on: state.cutaway });
}

function setXray(onFlag) {
  state.xray = !!onFlag;
  scene.setXray(state.xray);
}

function tourGo(step) {
  state.tour.step = step;
  state.tour.active = step >= 0 && step < 5;
  scene.tourGo(step);
  emit('tour:step', { step });
}

// SPEC §4 的 focusPart 字段：拾取与导览写入，离开检视视角时清空
on('part:focus', ({ id } = {}) => { state.focusPart = id || null; });
on('tour:step', ({ step } = {}) => {
  if (step >= 0 && step < TOUR_STEPS.length) state.focusPart = TOUR_STEPS[step].part;
});
on('view:change', () => {
  if (state.view !== 'inspect') state.focusPart = null;
});

// ---- URL 参数 ----
if (q.get('view')) setView(q.get('view'));
if (q.get('explode')) setExplode(parseFloat(q.get('explode')) || 0);
if (q.get('cutaway') === '1') setCutaway(true);
if (q.get('xray') === '1') setXray(true);
if (q.get('tour') !== null && q.get('tour') !== '') tourGo(parseInt(q.get('tour'), 10) || 0);
if (q.get('debug') === '1') scene.setDebug(true);
if (q.get('muted') === '1') setMuted(true);

// ---- 主循环 ----
const clock = new Clock();
let acc = 0;
let paused = false;
function loop() {
  if (paused) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTweens(dt);
  sim.update(dt);
  updateAudio(dt);
  scene.update(dt);
  ui.update(dt);

  acc += dt;
  if (acc >= 5) { acc = 0; recordSnapshot(); }
}

// ---- 启动 ----
const log = loadLog();
if (log) {
  state.ride.odometer = log.odometer || 0;
  state.ride.orders = log.orders || 0;
  state.ride.rideSeconds = log.rideSeconds || 0;
}

setView(state.view);
loop();

window.__app = {
  ready: true,
  busy: () => tweenCount() > 0,
  pause(v) {
    const want = !!v;
    if (want === paused) return;
    paused = want;
    if (!paused) { clock.getDelta(); loop(); }
  },
  state,
  setView, setExplode, setCutaway, setXray, tourGo,
  debugSetSpeed(v) { state.ride.speed = v; },
  exportPoster: () => exportPoster(scene.captureFrame(), state),
  scene, scooter,
};
emit('app:ready');
console.log('[rider01] ready');
