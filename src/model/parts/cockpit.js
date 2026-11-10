// 车把与大灯、前叉
import * as THREE from 'three';
import { put, rbox } from '../util.js';

// 车把（含圆形大灯、握把、转向灯）——局部原点在大灯/转向柱中心
export function buildHandlebar(M) {
  const g = new THREE.Group();

  // 大灯泡碗（黑色）
  put(g, new THREE.CylinderGeometry(0.088, 0.088, 0.10, 24), M.glossBlack, 0.03, 0, 0, 0, 0, Math.PI / 2);
  // 灯玻璃（发光材质，浅穹顶）
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.082, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    M.head
  );
  lens.rotation.z = -Math.PI / 2;
  lens.scale.x = 0.3;
  // 透镜内凹进灯碗，靠灯碗遮光，避免关灯时整颗发白
  lens.position.set(0.044, 0, 0);
  g.add(lens);
  // 灯框
  put(g, new THREE.TorusGeometry(0.084, 0.011, 8, 28), M.glossBlack, 0.075, 0, 0, 0, Math.PI / 2, 0);

  // 车把横管
  const bar = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, 0.0, -0.34),
      new THREE.Vector3(0.005, 0.012, -0.18),
      new THREE.Vector3(0.005, 0.012, 0),
      new THREE.Vector3(0.005, 0.012, 0.18),
      new THREE.Vector3(-0.01, 0.0, 0.34),
    ]), 32, 0.013, 10),
    M.glossBlack
  );
  g.add(bar);

  // 握把 + 开关座
  for (const sz of [-1, 1]) {
    put(g, new THREE.CylinderGeometry(0.019, 0.019, 0.115, 14), M.rubber, -0.01, 0.0, sz * 0.283, Math.PI / 2, 0, 0);
    put(g, rbox(0.05, 0.032, 0.06, 0.008), M.glossBlack, 0.0, 0.018, sz * 0.20);
  }
  // 中央仪表盖
  put(g, rbox(0.09, 0.045, 0.17, 0.015), M.glossBlack, -0.005, 0.035, 0);

  // 前转向灯（左右各一，琥珀色）
  for (const sz of [-1, 1]) {
    put(g, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), M.glossBlack, 0.03, 0.055, sz * 0.155, 0, 0, sz * 0.5);
    const lensF = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 10), sz > 0 ? M.signalL : M.signalR);
    lensF.position.set(0.045, 0.082, sz * 0.175);
    g.add(lensF);
  }

  // 后视镜（竖杆 + 镜壳）
  for (const sz of [-1, 1]) {
    const stalk = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.005, 0.02, sz * 0.13),
        new THREE.Vector3(0.008, 0.085, sz * 0.19),
        new THREE.Vector3(0.018, 0.135, sz * 0.235),
      ]), 16, 0.008, 8),
      M.glossBlack
    );
    g.add(stalk);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 12), M.glossBlack);
    head.scale.set(0.42, 1.0, 0.78);
    head.position.set(0.02, 0.155, sz * 0.245);
    head.rotation.set(sz * 0.25, -sz * 0.15, 0);
    g.add(head);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.031, 18, 12), M.chrome);
    glass.scale.set(0.3, 0.88, 0.68);
    glass.position.set(0.008, 0.157, sz * 0.245);
    glass.rotation.set(sz * 0.25, -sz * 0.15, 0);
    g.add(glass);
  }
  return g;
}

// 前叉：转向立管 + 叉管 + 下筒 + 轴
export function buildFrontFork(M) {
  const g = new THREE.Group();

  // 转向立管（穿进前护板）
  const column = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.40, 0),
      new THREE.Vector3(-0.02, 0.22, 0),
      new THREE.Vector3(-0.03, 0.03, 0),
    ]), 20, 0.026, 10),
    M.glossBlack
  );
  g.add(column);

  // 叉肩
  put(g, rbox(0.09, 0.05, 0.15, 0.015), M.glossBlack, -0.01, 0.02, 0);

  // 左右叉管 + 下筒
  for (const sz of [-1, 1]) {
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.012, 0.02, sz * 0.055),
        new THREE.Vector3(0.012, -0.20, sz * 0.055),
        new THREE.Vector3(0.05, -0.40, sz * 0.055),
      ]), 20, 0.015, 10),
      M.chrome
    );
    g.add(tube);
    const leg = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.028, -0.20, sz * 0.055),
        new THREE.Vector3(0.05, -0.40, sz * 0.055),
      ]), 10, 0.021, 10),
      M.glossBlack
    );
    g.add(leg);
  }
  // 轴
  put(g, new THREE.CylinderGeometry(0.011, 0.011, 0.15, 10), M.alu, 0.05, -0.40, 0, Math.PI / 2, 0, 0);
  return g;
}
