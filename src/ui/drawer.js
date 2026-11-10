// 移动端控制台抽屉（≤720px）：默认收起为浮动入口按钮 #desk-fab，点开后变为底部抽屉。
// 桌面端（>720px）不创建可见节点、不改变 #desk 布局，行为与原来完全一致。
import { on } from '../core/bus.js';

export const MOBILE_MQ = '(max-width: 720px)';
export const isMobile = () => window.matchMedia(MOBILE_MQ).matches;

export function createDrawer() {
  if (document.body.classList.contains('solo')) {
    return { setOpen() {}, isOpen: () => false };
  }

  const mql = window.matchMedia(MOBILE_MQ);
  const app = document.getElementById('app') || document.body;
  const desk = document.getElementById('desk');
  const toggle = document.getElementById('desk-toggle');

  // 遮罩：展开时盖住 3D 画面，点空白处收起。
  // z-index 低于 #touch，触控条在展开态下仍可点。
  const scrim = document.createElement('div');
  scrim.id = 'desk-scrim';
  app.appendChild(scrim);

  // 收起态的浮动入口
  const fab = document.createElement('button');
  fab.id = 'desk-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', '打开控制台');
  fab.innerHTML = '<span class="dot" aria-hidden="true"></span>控制台';
  app.appendChild(fab);

  let open = false;

  function setOpen(v) {
    open = !!v && mql.matches;
    document.body.classList.toggle('desk-open', open);
    if (open) desk?.classList.remove('folded');
    if (toggle) toggle.textContent = open ? '×' : '—';
  }

  fab.addEventListener('click', () => setOpen(true));
  scrim.addEventListener('click', () => setOpen(false));
  // 展开态下，面板头的 toggle 按钮变成「关闭」
  toggle?.addEventListener('click', () => { if (mql.matches) setOpen(false); });

  // 切换视角 / 开始导览时自动收起，避免面板长期挡住 3D 画面
  on('view:change', () => { if (mql.matches) setOpen(false); });
  on('tour:step', (d) => { if (mql.matches && (d?.step ?? -1) >= 0) setOpen(false); });

  // 断点变化：窄屏↔宽屏时收敛状态，避免桌面端残留抽屉类
  const onChange = () => setOpen(mql.matches && open);
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else mql.addListener(onChange);

  setOpen(false);
  return { setOpen, isOpen: () => open };
}
