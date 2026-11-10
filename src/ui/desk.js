// CONTROL DESK：面板按钮、状态行、订单卡、移动端触控
// 只写 state.input 并发 bus 事件；视角/拆解/剖视通过 handlers 交给 main.js
import { state } from '../core/state.js';
import { emit, on } from '../core/bus.js';

const $ = (s) => document.querySelector(s);

export function createDesk(handlers = {}) {
  const desk = $('#desk');
  const toggleBtn = $('#desk-toggle');
  const slider = $('#explode');
  const explodeVal = $('#explode-val');
  const cutawayBtn = $('#cutaway');
  const headBtn = $('#head');
  const sigLBtn = $('#sigL');
  const sigRBtn = $('#sigR');
  const hornBtn = $('#horn');
  const boxBtn = $('#box');
  const resetBtn = $('#reset-today');
  const exportBtn = $('#export');
  const clearBtn = $('#clear');
  const tourBtn = $('#tour-start');

  const stSpeed = $('#st-speed');
  const stBattery = $('#st-battery');
  const stOdo = $('#st-odo');
  const stOrders = $('#st-orders');

  const orderCard = $('#order-card');
  const ocProgress = $('#oc-progress');
  const ocTarget = $('#oc-target');
  const ocBar = $('#oc-bar');

  // “已送达”徽标由 JS 创建，避免改动 index.html
  const badge = document.createElement('div');
  badge.className = 'oc-badge';
  badge.textContent = '已送达';
  orderCard.appendChild(badge);

  // ---- 面板收起 ----
  toggleBtn.addEventListener('click', () => {
    const folded = desk.classList.toggle('folded');
    toggleBtn.textContent = folded ? '+' : '—';
  });

  // ---- 机械 ----
  slider.addEventListener('input', () => {
    const t = slider.value / 100;
    explodeVal.textContent = `${slider.value}%`;
    handlers.setExplode?.(t);
  });

  cutawayBtn.addEventListener('click', () => {
    const onFlag = !state.cutaway;
    cutawayBtn.classList.toggle('on', onFlag);
    handlers.setCutaway?.(onFlag);
  });

  // ---- 视角 ----
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => handlers.setView?.(b.dataset.view)));

  // ---- 骑行 ----
  headBtn.addEventListener('click', () => emit('light:toggle', { which: 'head' }));
  sigLBtn.addEventListener('click', () => emit('light:toggle', { which: 'left' }));
  sigRBtn.addEventListener('click', () => emit('light:toggle', { which: 'right' }));
  hornBtn.addEventListener('click', () => emit('horn'));
  boxBtn.addEventListener('click', () => emit('box:toggle'));

  // ---- 记录 ----
  resetBtn.addEventListener('click', () => handlers.onResetToday?.());
  exportBtn.addEventListener('click', () => handlers.onExport?.());
  clearBtn.addEventListener('click', () => handlers.onClear?.());

  // ---- 导览 ----
  tourBtn.addEventListener('click', () => handlers.tourGo?.(0));

  // ---- 送达动画 ----
  on('order:delivered', () => {
    orderCard.classList.remove('delivered');
    void orderCard.offsetWidth; // 强制重排以重放动画
    orderCard.classList.add('delivered');
    setTimeout(() => orderCard.classList.remove('delivered'), 1700);
  });

  function update() {
    // 按钮状态跟随全局 state
    headBtn.classList.toggle('on', state.lights.head);
    sigLBtn.classList.toggle('on', state.lights.left);
    sigRBtn.classList.toggle('on', state.lights.right);
    boxBtn.classList.toggle('on', state.box.open);
    cutawayBtn.classList.toggle('on', state.cutaway);

    // 滑块：外部（URL 参数 / main.js）改动时同步，拖动中不抢占
    if (document.activeElement !== slider) {
      const v = String(Math.round(state.explode * 100));
      slider.value = v;
      explodeVal.textContent = `${v}%`;
    }

    // 状态行
    stSpeed.textContent = String(Math.round(state.ride.speed * 3.6));
    stBattery.textContent = `${Math.round(state.ride.battery * 100)}%`;
    stBattery.classList.toggle('low', state.ride.battery < 0.2);
    stOdo.textContent = state.ride.odometer.toFixed(1);
    stOrders.textContent = String(state.ride.orders);

    // 订单卡
    ocProgress.textContent = String(Math.floor(state.ride.orderProgress));
    ocTarget.textContent = String(state.ride.orderTarget);
    const ratio = state.ride.orderTarget > 0
      ? Math.max(0, Math.min(1, state.ride.orderProgress / state.ride.orderTarget))
      : 0;
    ocBar.style.width = `${ratio * 100}%`;
  }

  return { update };
}

// 移动端触控：pointer 事件写 state.input
export function createTouch() {
  const throttleBtn = $('#tc-throttle');
  const brakeBtn = $('#tc-brake');

  function bind(btn, key) {
    if (!btn) return;
    const press = (e) => {
      e.preventDefault();
      state.input[key] = 1;
      btn.classList.add('on');
    };
    const release = (e) => {
      e.preventDefault();
      state.input[key] = 0;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bind(throttleBtn, 'throttle');
  bind(brakeBtn, 'brake');
}
