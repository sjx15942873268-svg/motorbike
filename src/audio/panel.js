// ?solo=audio 专用测试面板：一排按钮直接触发对应声音。
import { state } from '../core/state.js';
import {
  testMotor, testTire, testHorn, testSignal, testBrake,
  testBox, testChime, toggleMuted,
} from './engine.js';

const BTN_STYLE =
  'pointer-events:auto;background:rgba(255,255,255,0.06);' +
  'border:1px solid rgba(255,255,255,0.12);color:#EDEDED;' +
  'font-size:13px;padding:9px 14px;border-radius:8px;cursor:pointer;' +
  'font-family:inherit;transition:background .12s,border-color .12s;';

export function createAudioTestPanel() {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:absolute;inset:0;pointer-events:none;z-index:30;' +
    'display:flex;align-items:center;justify-content:center;';

  const style = document.createElement('style');
  style.textContent =
    '.rider-audio-btn:hover{background:rgba(251,196,5,0.16);border-color:#FBC405;}' +
    '.rider-audio-btn:active{background:#FBC405;color:#111;}';
  wrap.appendChild(style);

  const bar = document.createElement('div');
  bar.style.cssText =
    'pointer-events:auto;display:flex;flex-direction:column;gap:10px;' +
    'padding:16px 18px;background:rgba(20,20,22,0.78);' +
    'border:1px solid rgba(255,255,255,0.08);border-radius:12px;' +
    'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
    'box-shadow:0 12px 40px rgba(0,0,0,0.45);max-width:92vw;';

  const title = document.createElement('div');
  title.style.cssText =
    'font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;' +
    'letter-spacing:0.16em;color:#8A8A8A;';
  title.textContent = 'THE RIDER No.01 · 音效测试 AUDIO TEST';
  bar.appendChild(title);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';

  const buttons = [
    ['电机', testMotor],
    ['轮胎', testTire],
    ['喇叭', testHorn],
    ['转向', testSignal],
    ['刹车', testBrake],
    ['开箱', testBox],
    ['送达', testChime],
  ];

  buttons.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.className = 'rider-audio-btn';
    b.style.cssText = BTN_STYLE;
    b.textContent = label;
    b.addEventListener('click', () => fn());
    row.appendChild(b);
  });

  const muteBtn = document.createElement('button');
  muteBtn.className = 'rider-audio-btn';
  muteBtn.style.cssText = BTN_STYLE;
  const syncMute = () => {
    const on = state.audio.muted;
    muteBtn.textContent = on ? '已静音' : '静音';
    muteBtn.style.borderColor = on ? '#FBC405' : '';
    muteBtn.style.color = on ? '#FBC405' : '';
  };
  muteBtn.addEventListener('click', () => { toggleMuted(); syncMute(); });
  syncMute();
  row.appendChild(muteBtn);

  // 任何点击后都同步一次，避免外部 setMuted（如 ?muted=1）后按钮显示过期
  bar.addEventListener('click', syncMute);

  bar.appendChild(row);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:#8A8A8A;text-align:center;';
  hint.textContent = '首次点击页面任意处解锁音频 · 电机/轮胎为 1.6 秒试听';
  bar.appendChild(hint);

  wrap.appendChild(bar);
  return wrap;
}
