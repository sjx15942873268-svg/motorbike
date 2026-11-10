// 桩：界面Agent 替换此文件
import { state } from '../core/state.js';
import { emit } from '../core/bus.js';

export function createUI(handlers = {}) {
  const $ = (s) => document.querySelector(s);
  const desk = $('#desk');
  $('#desk-toggle').addEventListener('click', () => desk.classList.toggle('folded'));

  $('#explode').addEventListener('input', (e) => {
    const t = e.target.value / 100;
    $('#explode-val').textContent = e.target.value + '%';
    emit('explode:change', { t });
  });
  $('#cutaway').addEventListener('click', () => emit('cutaway:change', { on: !state.cutaway }));
  document.querySelectorAll('[data-view]').forEach((b) => {
    b.addEventListener('click', () => handlers.setView && handlers.setView(b.dataset.view));
  });
  $('#head').addEventListener('click', () => emit('light:toggle', { which: 'head' }));
  $('#sigL').addEventListener('click', () => emit('light:toggle', { which: 'left' }));
  $('#sigR').addEventListener('click', () => emit('light:toggle', { which: 'right' }));
  $('#horn').addEventListener('click', () => emit('horn'));
  $('#box').addEventListener('click', () => emit('box:toggle'));

  function update() {}
  function drawSpeedo() {}
  return { update, drawSpeedo };
}
