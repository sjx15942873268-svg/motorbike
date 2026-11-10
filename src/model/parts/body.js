// 车身覆盖件：前护板、脚踏板、侧裙（左右）、前挡泥板、座垫
import * as THREE from 'three';
import {
  put, extrudeSide, annularSector, rbox, bulgeDecalMesh,
} from '../util.js';
import { createSideDecalTexture } from '../decals.js';

// 侧裙鼓包（胶囊）：几何与贴花共用同一组参数
// 下缘抬到 y=0.30（与侧裙下缘齐平），避免遮住后轮与轮毂盖
export const BULGE = { r: 0.17, zScale: 0.62, xHalf: 0.133, xScale: 0.95 };
export const BULGE_POS = { x: -0.52, y: 0.47, z: 0.18 };

// 前护板：竖直弧形板，侧视轮廓挤出
export function buildLegShield(M) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0.43, 0.24);
  s.quadraticCurveTo(0.395, 0.52, 0.425, 0.86);
  s.quadraticCurveTo(0.44, 0.985, 0.52, 1.00);
  s.lineTo(0.565, 0.985);
  s.quadraticCurveTo(0.60, 0.93, 0.595, 0.78);
  s.quadraticCurveTo(0.585, 0.52, 0.60, 0.28);
  s.quadraticCurveTo(0.60, 0.235, 0.55, 0.23);
  s.lineTo(0.47, 0.23);
  s.quadraticCurveTo(0.43, 0.23, 0.43, 0.24);
  s.closePath();
  g.add(new THREE.Mesh(extrudeSide(s, 0.38, 0.02, 0.015), M.paint));

  // 顶部黑色塑料包边
  put(g, new THREE.CylinderGeometry(0.021, 0.021, 0.40, 12), M.glossBlack, 0.515, 0.985, 0, Math.PI / 2, 0, 0);
  // 前缘黑色饰条
  const trim = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.428, 0.90, 0.20),
      new THREE.Vector3(0.408, 0.60, 0.205),
      new THREE.Vector3(0.44, 0.30, 0.205),
    ]), 20, 0.012, 8),
    M.glossBlack
  );
  g.add(trim);
  const trimR = trim.clone();
  trimR.scale.z = -1;
  g.add(trimR);
  return g;
}

// 脚踏板：低平，黄色基体 + 黑色防滑垫
export function buildFloorboard(M) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.06, 0.215);
  s.lineTo(0.40, 0.215);
  s.quadraticCurveTo(0.455, 0.215, 0.462, 0.25);
  s.quadraticCurveTo(0.465, 0.268, 0.44, 0.268);
  s.lineTo(-0.06, 0.268);
  s.closePath();
  g.add(new THREE.Mesh(extrudeSide(s, 0.32, 0.01, 0.008), M.paint));
  // 黑色防滑垫（带浅棱）
  put(g, rbox(0.47, 0.016, 0.29, 0.006), M.matteBlack, 0.19, 0.276, 0);
  for (let i = 0; i < 6; i++) {
    put(g, new THREE.BoxGeometry(0.44, 0.004, 0.012), M.rubber, 0.19, 0.285, -0.11 + i * 0.044);
  }
  return g;
}

// 后部侧裙：包住后轮的饱满车身，侧视轮廓（带轮拱）挤出 + 外侧胶囊鼓包；左右镜像
export function buildSideCowl(M, side) {
  const g = new THREE.Group();
  // 侧视轮廓：下缘 y=0.30（SPEC §2 侧裙 y 0.30–0.70），后轮处开轮拱
  const s = new THREE.Shape();
  s.moveTo(-0.08, 0.50);
  s.lineTo(-0.08, 0.24);
  s.quadraticCurveTo(-0.13, 0.28, -0.20, 0.30);
  s.lineTo(-0.4018, 0.30);
  // 后轮轮拱（圆心 = 后轮轴，半径略大于轮胎 + 挤出倒角）
  s.absarc(-0.62, 0.20, 0.24, 0.43, Math.PI - 0.43, false);
  s.lineTo(-0.90, 0.30);
  s.quadraticCurveTo(-0.925, 0.33, -0.93, 0.42);
  s.lineTo(-0.93, 0.52);
  s.quadraticCurveTo(-0.93, 0.63, -0.88, 0.665);
  s.quadraticCurveTo(-0.83, 0.695, -0.76, 0.70);
  s.lineTo(-0.64, 0.685);
  s.quadraticCurveTo(-0.48, 0.672, -0.34, 0.665);
  s.quadraticCurveTo(-0.18, 0.656, -0.10, 0.60);
  s.quadraticCurveTo(-0.08, 0.56, -0.08, 0.50);
  s.closePath();

  const half = new THREE.Mesh(extrudeSide(s, 0.14, 0.03, 0.015), M.paint);
  half.position.z = side * 0.12;
  g.add(half);

  // 底边镀铬饰条（贴车身下缘，避让轮拱开口）
  for (const [x0, x1] of [[-0.22, -0.38], [-0.86, -0.90]]) {
    const trim = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(x0, 0.305, side * 0.222),
        new THREE.Vector3((x0 + x1) / 2, 0.305, side * 0.222),
        new THREE.Vector3(x1, 0.305, side * 0.222),
      ]), 12, 0.007, 8),
      M.chrome
    );
    g.add(trim);
  }

  // 外侧鼓包（胶囊非均匀缩放）
  const bulge = new THREE.Mesh(new THREE.CapsuleGeometry(BULGE.r, 0.28, 6, 18), M.paint);
  bulge.rotation.z = Math.PI / 2;
  bulge.scale.set(1.0, BULGE.xScale, BULGE.zScale);
  bulge.position.set(BULGE_POS.x, BULGE_POS.y, side * BULGE_POS.z);
  g.add(bulge);

  // 美团贴花（贴合鼓包外表面，避免被鼓包遮住）
  const tex = createSideDecalTexture();
  const decal = bulgeDecalMesh(
    tex, 0.44, 0.22,
    BULGE_POS.x, BULGE_POS.y, side * BULGE_POS.z, side, BULGE
  );
  g.add(decal);

  return g;
}

// 前挡泥板：黄色弧形板，贴合前轮上半部（薄、包角小，不下探）
export function buildFrontFender(M) {
  const g = new THREE.Group();
  const s = annularSector(0.212, 0.244, 0.22, Math.PI - 0.22);
  g.add(new THREE.Mesh(extrudeSide(s, 0.12, 0.012, 0.01), M.paint));
  g.position.set(0.62, 0.20, 0);
  return g;
}

// 座垫：黑色长条，顶面略压扁，后带镀铬扶手
export function buildSeat(M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(0.66, 0.13, 0.30, 0.05, 4), M.seat);
  body.position.set(-0.375, 0.74, 0);
  body.scale.y = 0.9;
  g.add(body);
  // 镀铬后扶手
  const rail = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.68, 0.785, 0.125),
      new THREE.Vector3(-0.735, 0.83, 0.10),
      new THREE.Vector3(-0.75, 0.835, 0),
      new THREE.Vector3(-0.735, 0.83, -0.10),
      new THREE.Vector3(-0.68, 0.785, -0.125),
    ]), 28, 0.012, 8),
    M.chrome
  );
  g.add(rail);
  return g;
}
