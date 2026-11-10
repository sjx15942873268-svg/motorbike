// 检视视角的零件热点标签（CSS2DRenderer，DOM 挂到 #labels）
// 标签挂在世界空间，每帧跟随零件位移，避免随车轮/枢轴一起旋转
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.part-label{pointer-events:none;display:flex;align-items:center;gap:6px;
padding:2px 9px;border:1px solid rgba(251,196,5,.55);border-radius:999px;
background:rgba(12,12,14,.72);color:#EDEDED;white-space:nowrap;
font:12px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
backdrop-filter:blur(4px);}
.part-label::before{content:"";width:5px;height:5px;border-radius:50%;background:#FBC405;}
`;
  document.head.appendChild(style);
}

export function createLabels(scene, container, getScooter) {
  injectStyle();
  const renderer = new CSS2DRenderer();
  renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  if (container) container.appendChild(renderer.domElement);

  const tracks = [];
  let built = false;
  const tmp = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const up = new THREE.Vector3();
  const delta = new THREE.Vector3();

  function build() {
    const scooter = getScooter();
    if (built || !scooter) return;
    built = true;
    for (const part of scooter.parts || []) {
      if (!part.object) continue;
      const el = document.createElement('div');
      el.className = 'part-label';
      el.textContent = part.nameZh || part.id;
      const obj = new CSS2DObject(el);
      scene.add(obj);
      tracks.push({
        obj,
        el,
        part,
        basePos: part.object.getWorldPosition(new THREE.Vector3()),
        anchor: part.object.localToWorld(part.labelAnchor ? part.labelAnchor.clone() : new THREE.Vector3()),
      });
    }
  }

  function setVisible(v) {
    renderer.domElement.style.display = v ? '' : 'none';
  }

  // 屏幕空间碰撞避让：互相压住的标签沿竖直方向依次让开
  const MAX_PUSH = 90;
  function layout(camera) {
    const items = [];
    for (const t of tracks) {
      pv.copy(t.obj.position).project(camera);
      if (pv.z > 1) continue;               // 相机背后
      if (!t.w) {
        const w = t.el ? t.el.offsetWidth : 0, h = t.el ? t.el.offsetHeight : 0;
        if (!w || !h) continue;             // 还不可见，先不测量
        t.w = w; t.h = h;
      }
      items.push({
        t,
        x: (pv.x * 0.5 + 0.5) * innerWidth,
        y: (-pv.y * 0.5 + 0.5) * innerHeight,
        w: t.w, h: t.h, dy: 0,
      });
    }
    items.sort((a, b) => a.y - b.y);
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      for (let j = 0; j < i; j++) {
        const b = items[j];
        const ox = (a.w + b.w) / 2 + 8 - Math.abs(a.x - b.x);
        const oy = (a.h + b.h) / 2 + 4 - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) a.dy = Math.max(a.dy, oy);
      }
      a.dy = Math.min(a.dy, MAX_PUSH);
      a.y += a.dy;
    }
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    for (const it of items) {
      if (!it.dy) continue;
      // 竖直位移换算成世界位移：只沿相机上方向平移，屏幕上的间距才准
      const dist = camera.position.distanceTo(it.t.obj.position);
      const wpp = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / innerHeight;
      delta.copy(up).multiplyScalar(-it.dy * wpp);
      if (!it.t.off) it.t.off = new THREE.Vector3();
      it.t.off.copy(delta);
    }
  }

  function update(camera) {
    if (!built) return;
    for (const t of tracks) {
      t.off = null;
      t.part.object.getWorldPosition(tmp);
      t.obj.position.copy(t.anchor).add(tmp.sub(t.basePos));
    }
    if (camera) {
      camera.updateMatrixWorld();
      layout(camera);
      for (const t of tracks) if (t.off) t.obj.position.add(t.off);
    }
  }

  function render(camera) {
    if (!built) return;
    renderer.render(scene, camera);
  }

  function setSize(w, h) {
    renderer.setSize(w, h);
  }

  return { renderer, build, setVisible, update, render, setSize };
}
