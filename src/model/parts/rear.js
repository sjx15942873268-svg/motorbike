// 后部：后货架、外卖箱（含箱盖）、尾灯与牌照
import * as THREE from 'three';
import { put, rbox, decalMesh } from '../util.js';
import { createBoxDecalTexture } from '../decals.js';

// 后货架：镀铬弯管 + 箱底托板
export function buildRearRack(M) {
  const g = new THREE.Group();
  const R = 0.011;
  const rail = (pts) => {
    const t = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 16, R, 8),
      M.chrome
    );
    g.add(t);
  };

  for (const sz of [-1, 1]) {
    // 侧轨
    rail([[-0.99, 0.82, sz * 0.235], [-0.76, 0.82, sz * 0.235], [-0.53, 0.82, sz * 0.235]]);
    // 后立柱（箱后护栏）
    rail([[-0.99, 0.82, sz * 0.235], [-0.997, 0.93, sz * 0.235], [-0.997, 1.05, sz * 0.235]]);
    // 支撑斜管（从车身顶面升到侧轨）
    rail([[-0.60, 0.70, sz * 0.17], [-0.62, 0.77, sz * 0.21], [-0.62, 0.82, sz * 0.235]]);
    rail([[-0.88, 0.68, sz * 0.17], [-0.89, 0.76, sz * 0.21], [-0.89, 0.82, sz * 0.235]]);
  }
  // 横向连接
  for (const x of [-0.99, -0.76, -0.53]) {
    rail([[x, 0.82, -0.235], [x, 0.82, 0.235]]);
  }
  // 顶部横杆
  rail([[-0.997, 1.05, -0.235], [-0.997, 1.05, 0.235]]);
  // 箱底托板（箱子坐在这块板上，镀铬）
  put(g, rbox(0.50, 0.028, 0.46, 0.008), M.chrome, -0.755, 0.845, 0);
  return g;
}

// 外卖箱：黑色箱体 + 独立箱盖 + 黄色描边 + 贴花
export function buildDeliveryBox(M) {
  const g = new THREE.Group();
  g.position.set(-0.75, 1.06, 0);

  // 箱体
  put(g, rbox(0.46, 0.34, 0.44, 0.03), M.boxBody, 0, -0.03, 0);

  // 箱盖（绕后沿铰链转动）
  const lid = new THREE.Group();
  lid.name = 'boxLid';
  lid.position.set(-0.23, 0.20, 0);
  g.add(lid);
  put(lid, rbox(0.46, 0.06, 0.44, 0.02), M.boxLid, 0.23, -0.03, 0);

  // 黄色描边：竖边 + 檐口
  const trim = new THREE.Group();
  const T = 0.02;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(trim, new THREE.BoxGeometry(T, 0.34, T), M.paint, sx * 0.225, -0.03, sz * 0.215);
    }
  }
  for (const sy of [0.14, 0.20]) {
    for (const sz of [-1, 1]) {
      put(trim, new THREE.BoxGeometry(0.46, T, T), M.paint, 0, sy, sz * 0.215);
    }
    for (const sx of [-1, 1]) {
      put(trim, new THREE.BoxGeometry(T, T, 0.44), M.paint, sx * 0.225, sy, 0);
    }
  }
  g.add(trim);

  // 锁扣
  put(g, rbox(0.035, 0.05, 0.09, 0.008), M.chrome, 0.235, 0.10, 0);

  // 贴花：两侧 + 背面
  const tex = createBoxDecalTexture();
  for (const sz of [-1, 1]) {
    const d = decalMesh(tex, 0.34, 0.30);
    d.position.set(0, -0.03, sz * 0.223);
    if (sz < 0) d.rotation.y = Math.PI;
    g.add(d);
  }
  const back = decalMesh(tex, 0.34, 0.30);
  back.position.set(-0.233, -0.03, 0);
  back.rotation.y = -Math.PI / 2;
  g.add(back);

  return { group: g, lid };
}

// 尾灯与牌照（装在车身尾部）
export function buildTailLight(M) {
  const g = new THREE.Group();
  // 支架（嵌入车身尾面，不悬空）
  put(g, rbox(0.10, 0.05, 0.10, 0.01), M.glossBlack, -0.925, 0.47, 0);
  // 尾灯透镜
  put(g, rbox(0.045, 0.095, 0.135, 0.015), M.tail, -0.972, 0.47, 0);
  // 刹车反射片
  put(g, new THREE.BoxGeometry(0.016, 0.028, 0.105), M.brake, -0.978, 0.405, 0);
  // 牌照
  const plate = put(g, rbox(0.014, 0.15, 0.115, 0.005), M.plate, -0.975, 0.335, 0);
  plate.rotation.z = -0.12;
  // 后转向灯
  for (const sz of [-1, 1]) {
    put(g, rbox(0.035, 0.04, 0.055, 0.01), sz > 0 ? M.signalL : M.signalR, -0.958, 0.435, sz * 0.165);
  }
  return g;
}
