// 内部件：车架、电池组、控制器、线束、脚撑
import * as THREE from 'three';
import { put, rbox } from '../util.js';

// 线束路径关键点（世界坐标，电池 → 控制器 → 电机）
export const HARNESS_POINTS = [
  [-0.35, 0.44, 0.06],
  [-0.32, 0.52, 0.08],
  [-0.26, 0.55, 0.10],
  [-0.16, 0.44, 0.12],
  [-0.24, 0.34, 0.12],
  [-0.42, 0.32, 0.10],
  [-0.62, 0.24, 0.05],
];

export function buildFrame(M) {
  const g = new THREE.Group();
  const tube = (pts, r) => {
    const t = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 8),
      M.glossBlack
    );
    g.add(t);
  };
  // 转向立管
  tube([[0.52, 0.99, 0], [0.51, 0.75, 0], [0.50, 0.50, 0], [0.49, 0.40, 0]], 0.033);
  // 主梁（前段压进脚踏板内腔，后段贴侧裙下缘走）
  tube([[0.49, 0.40, 0], [0.38, 0.265, 0], [0.15, 0.25, 0], [-0.05, 0.26, 0], [-0.25, 0.31, 0], [-0.45, 0.34, 0], [-0.70, 0.38, 0]], 0.028);
  // 前下管
  tube([[0.50, 0.55, 0], [0.47, 0.38, 0], [0.42, 0.26, 0]], 0.024);
  // 踏板托板
  put(g, rbox(0.56, 0.025, 0.30, 0.008), M.glossBlack, 0.18, 0.235, 0);
  // 后副车架
  for (const sz of [-1, 1]) {
    tube([[-0.50, 0.32, sz * 0.10], [-0.58, 0.50, sz * 0.12], [-0.62, 0.64, sz * 0.12]], 0.016);
    tube([[-0.68, 0.38, sz * 0.10], [-0.80, 0.48, sz * 0.12], [-0.90, 0.56, sz * 0.12]], 0.016);
    // 后平叉
    tube([[-0.32, 0.30, sz * 0.10], [-0.48, 0.24, sz * 0.10], [-0.62, 0.20, sz * 0.095]], 0.017);
  }
  // 后轴
  put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.21, 10), M.alu, -0.62, 0.20, 0, Math.PI / 2, 0, 0);
  return g;
}

// 电池组：深灰壳体托盘 + 青色电芯（InstancedMesh）+ 框架
export function buildBattery(M) {
  const g = new THREE.Group();
  g.position.set(-0.32, 0.37, 0);

  // 托盘
  put(g, rbox(0.42, 0.035, 0.26, 0.008), M.batteryShell, 0, -0.085, 0);
  // 电芯：10 x 3
  const cellGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.15, 12);
  const cols = 10, rows = 3;
  const cells = new THREE.InstancedMesh(cellGeo, M.cell, cols * rows);
  const mtx = new THREE.Matrix4();
  let i = 0;
  for (let ix = 0; ix < cols; ix++) {
    for (let iz = 0; iz < rows; iz++) {
      mtx.makeTranslation(-0.171 + ix * 0.038, 0, -0.075 + iz * 0.075);
      cells.setMatrixAt(i++, mtx);
    }
  }
  cells.instanceMatrix.needsUpdate = true;
  g.add(cells);
  // 电芯顶盖（青色）
  const capGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.006, 8);
  const caps = new THREE.InstancedMesh(capGeo, M.glossBlack, cols * rows);
  i = 0;
  for (let ix = 0; ix < cols; ix++) {
    for (let iz = 0; iz < rows; iz++) {
      mtx.makeTranslation(-0.171 + ix * 0.038, 0.078, -0.075 + iz * 0.075);
      caps.setMatrixAt(i++, mtx);
    }
  }
  caps.instanceMatrix.needsUpdate = true;
  g.add(caps);

  // 框架立柱 + 顶框
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(g, new THREE.BoxGeometry(0.02, 0.19, 0.02), M.batteryShell, sx * 0.20, 0.0, sz * 0.12);
    }
  }
  for (const sz of [-1, 1]) {
    put(g, new THREE.BoxGeometry(0.42, 0.018, 0.02), M.batteryShell, 0, 0.095, sz * 0.12);
  }
  for (const sx of [-1, 1]) {
    put(g, new THREE.BoxGeometry(0.02, 0.018, 0.26), M.batteryShell, sx * 0.20, 0.095, 0);
  }
  // BMS 小板
  put(g, new THREE.BoxGeometry(0.06, 0.012, 0.10), M.glossBlack, 0.16, 0.10, 0);
  return g;
}

// 控制器：铝盒 + 散热鳍片（置于电池上方、座垫下方的内腔，侧裙遮挡）
export function buildController(M) {
  const g = new THREE.Group();
  g.position.set(-0.32, 0.55, 0);
  put(g, rbox(0.17, 0.09, 0.14, 0.01), M.alu, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    put(g, new THREE.BoxGeometry(0.17, 0.028, 0.008), M.alu, 0, -0.058, -0.055 + i * 0.022);
  }
  put(g, rbox(0.05, 0.04, 0.06, 0.008), M.glossBlack, 0.10, 0.01, 0);
  return g;
}

// 线束：沿路径的 TubeGeometry + 分支
export function buildHarness(M, points) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.014, 8), M.rubber);
  g.add(t);
  return g;
}

// 脚撑（不属于零件表，仅 rig 用）
export function buildKickstand(M) {
  const g = new THREE.Group();
  g.position.set(-0.16, 0.12, 0.17);
  const leg = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(-0.02, -0.07, 0.01),
      new THREE.Vector3(-0.07, -0.13, 0.02),
    ]), 16, 0.011, 8),
    M.alu
  );
  g.add(leg);
  put(g, new THREE.BoxGeometry(0.05, 0.014, 0.03), M.rubber, -0.075, -0.135, 0.02);
  return g;
}
