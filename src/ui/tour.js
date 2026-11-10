// 导览卡片：监听 tour:step 显示当前步骤，按钮回调 main.js 的 tourGo
import { TOUR_STEPS } from '../core/config.js';
import { on } from '../core/bus.js';

const AUTO_INTERVAL = 4000;
const $ = (s) => document.querySelector(s);

export function createTourCard(handlers = {}) {
  const card = $('#tour-card');
  const idxEl = $('#tc-idx');
  const nameEl = $('#tc-name');
  const descEl = $('#tc-desc');
  const prevBtn = $('#tc-prev');
  const nextBtn = $('#tc-next');
  const autoBtn = $('#tc-auto');
  const closeBtn = $('#tc-close');
  const total = TOUR_STEPS.length;

  let step = -1;
  let autoTimer = null;

  function render(s) {
    step = s;
    if (!Number.isInteger(s) || s < 0 || s >= total) {
      hide();
      return;
    }
    const d = TOUR_STEPS[s];
    idxEl.textContent = String(s + 1);
    nameEl.textContent = d.name;
    descEl.textContent = d.desc;
    card.classList.remove('hidden');
  }

  function hide() {
    card.classList.add('hidden');
    stopAuto();
  }

  function go(s) {
    // main.js 的 tourGo 会写 state.tour、驱动场景并广播 tour:step
    handlers.tourGo?.(s);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    autoBtn.classList.remove('on');
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      if (step >= total - 1) {
        stopAuto();
        go(-1); // 最后一步后自动退出
      } else {
        go(step + 1);
      }
    }, AUTO_INTERVAL);
    autoBtn.classList.add('on');
  }

  function restartAuto() {
    if (autoTimer) startAuto();
  }

  prevBtn.addEventListener('click', () => {
    if (step > 0) {
      go(step - 1);
      restartAuto();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (step >= total - 1) go(-1);
    else {
      go(step + 1);
      restartAuto();
    }
  });

  autoBtn.addEventListener('click', () => {
    if (autoTimer) stopAuto();
    else startAuto();
  });

  closeBtn.addEventListener('click', () => go(-1));

  on('tour:step', (d) => render(d?.step ?? -1));

  return { render, hide };
}
