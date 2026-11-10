// 桩：界面Agent 替换此文件
export function createUI(handlers = {}) {
  const $ = (s) => document.querySelector(s);
  $('#desk-toggle').addEventListener('click', () => $('#desk').classList.toggle('folded'));
  $('#explode').addEventListener('input', (e) => handlers.setExplode?.(e.target.value / 100));
  $('#cutaway').addEventListener('click', () => handlers.setCutaway?.(!false));
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => handlers.setView?.(b.dataset.view)));
  $('#tour-start').addEventListener('click', () => handlers.tourGo?.(0));
  return { update() {}, drawSpeedo() {} };
}
