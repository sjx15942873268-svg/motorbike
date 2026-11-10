// 车轮：轮胎 + 银色轮毂盖（5 辐）+ 后轮毂电机
import * as THREE from 'three';
import { put } from '../util.js';

const RING_R = 0.095;
const RING_T = 0.018;

export function buildWheel(M) {
  const g = new THREE.Group();
  // 轮胎（Torus 默认在 XY 平面、轴线 Z，直接可用）
  put(g, new THREE.TorusGeometry(0.155, 0.045, 18, 40), M.tire);

  // 银色轮毂盖：外圈 + 实心盘 + 5 辐条凸棱 + 中心盖
  put(g, new THREE.TorusGeometry(RING_R, RING_T, 10, 32), M.hub);
  put(g, new THREE.CylinderGeometry(0.112, 0.112, 0.04, 28), M.hub, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    put(g, new THREE.BoxGeometry(0.082, 0.028, 0.014), M.hub,
      Math.cos(a) * 0.062, Math.sin(a) * 0.062, 0.024, 0, 0, a);
  }
  put(g, new THREE.CylinderGeometry(0.032, 0.032, 0.055, 16), M.glossBlack, 0, 0, 0, Math.PI / 2);
  return g;
}

// 后轮毂电机：外壳 + 铜色线圈（InstancedMesh）+ 轴
export function buildHubMotor(M) {
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(0.078, 0.078, 0.05, 28), M.glossBlack, 0, 0, 0, Math.PI / 2);
  put(g, new THREE.CylinderGeometry(0.048, 0.048, 0.058, 20), M.alu, 0, 0, 0, Math.PI / 2);

  // 线圈：两排环形绕组
  const turnGeo = new THREE.TorusGeometry(0.017, 0.0065, 6, 12);
  const N = 16;
  const turns = new THREE.InstancedMesh(turnGeo, M.coil, N * 2);
  const mtx = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  let idx = 0;
  for (const z of [-0.02, 0.02]) {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      mtx.makeRotationZ(a);
      rot.makeRotationY(Math.PI / 2);
      mtx.multiply(rot);
      mtx.setPosition(Math.cos(a) * 0.042, Math.sin(a) * 0.042, z);
      turns.setMatrixAt(idx++, mtx);
    }
  }
  turns.instanceMatrix.needsUpdate = true;
  g.add(turns);

  // 轴
  put(g, new THREE.CylinderGeometry(0.013, 0.013, 0.14, 12), M.alu, 0, 0, 0, Math.PI / 2);
  return g;
}
