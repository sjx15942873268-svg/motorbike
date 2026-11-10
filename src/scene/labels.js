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
        part,
        basePos: part.object.getWorldPosition(new THREE.Vector3()),
        anchor: part.object.localToWorld(part.labelAnchor ? part.labelAnchor.clone() : new THREE.Vector3()),
      });
    }
  }

  function setVisible(v) {
    renderer.domElement.style.display = v ? '' : 'none';
  }

  function update() {
    if (!built) return;
    for (const t of tracks) {
      t.part.object.getWorldPosition(tmp);
      t.obj.position.copy(t.anchor).add(tmp.sub(t.basePos));
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
