// 界面总装：速度表 / 控制台 / 导览卡 / 零件卡 / 键盘 / 触控
import { state } from '../core/state.js';
import { createSpeedo } from './speedo.js';
import { createDesk, createTouch } from './desk.js';
import { createTourCard } from './tour.js';
import { createPartCard } from './partcard.js';
import { createKeys } from './keys.js';

export function createUI(handlers = {}) {
  // ?solo=model / ?solo=audio：CSS 里 body.solo 兜底隐藏全部界面（含热点标签层）
  if (new URLSearchParams(location.search).get('solo')) {
    document.body.classList.add('solo');
  }

  const speedo = createSpeedo(document.querySelector('#speedo-cv'));
  const desk = createDesk(handlers);
  createTourCard(handlers);
  createPartCard();
  createKeys(handlers);
  createTouch();

  function update(dt) {
    desk.update();
    speedo.draw(state.ride.speed * 3.6, state.ride.battery);
  }

  return {
    update,
    drawSpeedo: (speedKmh, battery) => speedo.draw(speedKmh, battery),
  };
}
