// 道路、路灯、路沿（InstancedMesh 滚动）与检视用圆形展台
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ROAD_LENGTH = 200;
const ROAD_WIDTH = 12;
const TEX_LENGTH = 8;            // 贴图一个重复 = 8 米
const WRAP_X = 40;               // 路灯/路沿循环范围 ±40 米
const LAMP_SPACING = 8;
const LAMP_COUNT = 10;           // 每侧
const CURB_SPACING = 2;
const CURB_COUNT = 41;           // 每侧
const ROAD_Z = 5.4;              // 路灯位置
const CURB_Z = 5.95;

function asphaltTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#17181b';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2800; i++) {
    const v = 16 + Math.random() * 30;
    g.fillStyle = `rgba(${v | 0},${v | 0},${(v + 4) | 0},${0.2 + Math.random() * 0.45})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // 边线
  g.fillStyle = 'rgba(214,214,208,0.5)';
  g.fillRect(0, 512 * 0.055, 512, 5);
  g.fillRect(0, 512 * 0.945 - 5, 512, 5);
  // 中央车道虚线
  g.fillStyle = 'rgba(251,196,5,0.8)';
  for (let x = 0; x < 512; x += 80) g.fillRect(x, 512 * 0.5 - 3, 46, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function lampGeometry() {
  const pole = new THREE.CylinderGeometry(0.035, 0.05, 3.6, 8);
  pole.translate(0, 1.8, 0);
  const arm = new THREE.CylinderGeometry(0.022, 0.022, 1.0, 6);
  arm.rotateX(Math.PI / 2);
  arm.translate(0, 3.5, -0.5);
  const base = new THREE.CylinderGeometry(0.09, 0.13, 0.2, 8);
  base.translate(0, 0.1, 0);
  return mergeGeometries([pole, arm, base]);
}

function lampHeadGeometry() {
  const g = new THREE.BoxGeometry(0.18, 0.1, 0.44);
  g.translate(0, 3.45, -0.95);
  return g;
}

export function createRoad(parent) {
  const group = new THREE.Group();
  group.name = 'road';

  // ---- 路面 ----
  const tex = asphaltTexture();
  tex.repeat.set(ROAD_LENGTH / TEX_LENGTH, 1);
  const roadMat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.94, metalness: 0.0, transparent: true, depthWrite: false,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);

  // ---- 路灯 ----
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x2b2e34, roughness: 0.55, metalness: 0.75, transparent: true, depthWrite: false,
  });
  const lamps = new THREE.InstancedMesh(lampGeometry(), lampMat, LAMP_COUNT * 2);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x101012, emissive: 0xffd9a0, emissiveIntensity: 2.4, transparent: true, depthWrite: false,
  });
  const lampHeads = new THREE.InstancedMesh(lampHeadGeometry(), headMat, LAMP_COUNT * 2);
  group.add(lamps, lampHeads);

  // ---- 路沿 ----
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d43, roughness: 0.85, metalness: 0.05, transparent: true, depthWrite: false,
  });
  const curbs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(CURB_SPACING, 0.1, 0.24), curbMat, CURB_COUNT * 2);
  group.add(curbs);

  // ---- 展台地面（非骑行视角） ----
  const platform = new THREE.Group();
  platform.name = 'platform';
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x17181c, roughness: 0.5, metalness: 0.3, transparent: true, depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.58, 0.12, 72), discMat);
  disc.position.y = -0.062;
  disc.receiveShadow = true;
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x0e0e10, emissive: 0xFBC405, emissiveIntensity: 1.5, transparent: true, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.42, 0.014, 8, 96), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  platform.add(disc, ring);
  parent.add(group, platform);

  const fadeMats = [roadMat, lampMat, headMat, curbMat];
  const platformMats = [discMat, ringMat];
  const lampX = [];
  for (let i = 0; i < LAMP_COUNT; i++) lampX.push(-WRAP_X + i * LAMP_SPACING);
  const curbX = [];
  for (let i = 0; i < CURB_COUNT; i++) curbX.push(-WRAP_X + i * CURB_SPACING);

  const dummy = new THREE.Object3D();
  function layout(dist) {
    for (let i = 0; i < LAMP_COUNT; i++) {
      lampX[i] -= dist;
      if (lampX[i] < -WRAP_X) lampX[i] += WRAP_X * 2;
    }
    for (let i = 0; i < CURB_COUNT; i++) {
      curbX[i] -= dist;
      if (curbX[i] < -WRAP_X) curbX[i] += WRAP_X * 2;
    }
    for (let s = 0; s < 2; s++) {
      const z = s === 0 ? ROAD_Z : -ROAD_Z;
      for (let i = 0; i < LAMP_COUNT; i++) {
        dummy.position.set(lampX[i], 0, z);
        dummy.rotation.set(0, s === 0 ? 0 : Math.PI, 0);
        dummy.updateMatrix();
        lamps.setMatrixAt(s * LAMP_COUNT + i, dummy.matrix);
        lampHeads.setMatrixAt(s * LAMP_COUNT + i, dummy.matrix);
      }
      for (let i = 0; i < CURB_COUNT; i++) {
        dummy.position.set(curbX[i], 0.05, s === 0 ? CURB_Z : -CURB_Z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        curbs.setMatrixAt(s * CURB_COUNT + i, dummy.matrix);
      }
    }
    lamps.instanceMatrix.needsUpdate = true;
    lampHeads.instanceMatrix.needsUpdate = true;
    curbs.instanceMatrix.needsUpdate = true;
  }
  layout(0);

  let riding = true;
  let mix = 1;

  function update(dt, speed) {
    const target = riding ? 1 : 0;
    mix += (target - mix) * Math.min(1, dt * 3.2);
    if (Math.abs(mix - target) < 0.003) mix = target;
    group.visible = mix > 0.02;
    platform.visible = mix < 0.98;
    if (group.visible) {
      tex.offset.x += (speed * dt) / TEX_LENGTH;
      for (const m of fadeMats) m.opacity = mix;
      layout(speed * dt);
    }
    for (const m of platformMats) m.opacity = 1 - mix;
  }

  function setRiding(v) { riding = !!v; }

  return { group, platform, update, setRiding };
}
