import { state } from './core/state.js';
import { emit, on } from './core/bus.js';
import { updateTweens } from './core/tween.js';
import { buildScooter } from './model/index.js';
import { createScene } from './scene/index.js';
import { createSim } from './sim/ride.js';
import { initAudio, getAnalyser, setMuted, updateAudio } from './audio/index.js';
import { createUI } from './ui/index.js';
import { loadLog, saveLog, recordSnapshot, resetToday, clearAll } from './data/storage.js';
import { exportPoster } from './data/export.js';
import { Clock } from 'three';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('gl');
const scene = createScene(canvas);

// 车辆
import * as THREE from 'three';
const scooter = buildScooter();
scene.scene.add(scooter.root);

// sim
const sim = createSim();

// 音频（首次交互解锁）
let audioReady = false;
function unlockAudio() {
  if (audioReady) return;
  audioReady = initAudio();
  state.audio.unlocked = true;
  emit('audio:unlock');
  document.getElementById('audio-hint')?.classList.add('hidden');
}
addEventListener('pointerdown', unlockAudio, { once: false });
addEventListener('keydown', unlockAudio, { once: false });

// UI
const ui = createUI({
  setView,
});

// ---- 视图 ----
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
  state.tour.active = step >= 0;
  scene.tourGo(step);
  emit('tour:step', { step });
}

// ---- URL 参数 ----
if (q.get('view')) setView(q.get('view'));
if (q.get('explode')) setExplode(parseFloat(q.get('explode')) || 0);
if (q.get('cutaway') === '1') setCutaway(true);
if (q.get('xray') === '1') setXray(true);
if (q.get('tour') !== null) tourGo(parseInt(q.get('tour'), 10) || 0);
if (q.get('debug') === '1') scene.setDebug?.(true);

// ---- 主循环 ----
const clock = new Clock();
let acc = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTweens(dt);
  sim.update(dt);
  updateAudio(dt, getAnalyser());
  scene.update(dt);
  ui.update(dt);

  // 每 5 秒存档
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
  state,
  setView, setExplode, setCutaway, setXray, tourGo,
  debugSetSpeed(v) { state.ride.speed = v; },
  exportPoster,
};
emit('app:ready');
console.log('[rider01] ready');
