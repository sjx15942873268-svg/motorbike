// 零件信息卡：监听 part:focus，文案来自 core/config.js 的 PART_MAP
import { PART_MAP } from '../core/config.js';
import { on } from '../core/bus.js';

const $ = (s) => document.querySelector(s);

export function createPartCard() {
  const card = $('#part-card');
  const nameEl = $('#pc-name');
  const descEl = $('#pc-desc');
  const closeBtn = $('#pc-close');

  function hide() {
    card.classList.add('hidden');
  }

  closeBtn.addEventListener('click', hide);

  on('part:focus', (d) => {
    const id = d?.id;
    const part = id ? PART_MAP[id] : null;
    if (!part) {
      hide();
      return;
    }
    nameEl.textContent = part.nameZh;
    descEl.textContent = part.desc;
    card.classList.remove('hidden');
  });

  // 离开检视视角时收起信息卡
  on('view:change', (d) => {
    if (d?.view !== 'inspect') hide();
  });

  return { hide };
}
