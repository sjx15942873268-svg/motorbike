// X 光（电驱视角）：外壳半透明、内部件发光、线束虚线流动
import * as THREE from 'three';

const SHELL_OPACITY = 0.12;
const INTERNAL_GLOW = 0.9;
const ACCENT = 0xFBC405;

function eachMaterial(root, fn) {
  if (!root) return;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) if (m) fn(m);
  });
}

function dashTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = '#050505';
  g.fillRect(0, 0, 64, 8);
  g.fillStyle = '#FBC405';
  g.fillRect(0, 2, 30, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(6, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createXray(scooter, shellMatsOverride) {
  const shellMats = (shellMatsOverride || scooter.shellMaterials || []).filter(Boolean);
  const internalRoots = (scooter.parts || []).filter((p) => p.internal).map((p) => p.object);

  const allMats = new Set(shellMats);
  for (const root of internalRoots) eachMaterial(root, (m) => allMats.add(m));

  // 快照原始参数，退出时精确还原
  const snap = new Map();
  for (const m of allMats) {
    snap.set(m, {
      opacity: m.opacity,
      transparent: m.transparent,
      depthWrite: m.depthWrite,
      color: m.color ? m.color.getHex() : null,
      emissive: m.emissive ? m.emissive.getHex() : null,
      emissiveIntensity: m.emissiveIntensity,
      map: m.map || null,
    });
  }

  let on = false;
  let dashTex = null;
  let harnessMat = null;
  const accent = new THREE.Color(ACCENT);

  function apply() {
    for (const m of shellMats) {
      m.transparent = true;
      m.opacity = SHELL_OPACITY;
      m.depthWrite = false;
    }
    for (const root of internalRoots) {
      eachMaterial(root, (m) => {
        if (!m.emissive) return;
        const base = m.color ? m.color.clone() : new THREE.Color(0x2FB5A5);
        m.emissive.copy(base).lerp(accent, 0.35);
        m.emissiveIntensity = INTERNAL_GLOW;
      });
    }
    const harness = (scooter.parts || []).find((p) => p.id === 'harness');
    eachMaterial(harness ? harness.object : null, (m) => {
      if (harnessMat) return;
      harnessMat = m;
      dashTex = dashTexture();
      m.map = dashTex;
      m.color.setHex(0xffffff);
      m.emissive.setHex(ACCENT);
      m.emissiveIntensity = 0.7;
      m.needsUpdate = true;
    });
  }

  function restore() {
    for (const [m, s] of snap) {
      m.opacity = s.opacity;
      m.transparent = s.transparent;
      m.depthWrite = s.depthWrite;
      if (s.color !== null && m.color) m.color.setHex(s.color);
      if (s.emissive !== null && m.emissive) m.emissive.setHex(s.emissive);
      m.emissiveIntensity = s.emissiveIntensity;
      if (m.map !== s.map) {
        m.map = s.map;
        m.needsUpdate = true;
      }
    }
    harnessMat = null;
    dashTex = null;
  }

  function setXray(v) {
    if (!!v === on) return;
    on = !!v;
    if (on) apply();
    else restore();
  }

  function update(dt, throttle) {
    if (on && dashTex) dashTex.offset.x -= throttle * dt * 2.2;
  }

  return { setXray, update, get on() { return on; } };
}
