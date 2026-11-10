// 整车装配：18 个零件 + rig + 材质组
import * as THREE from 'three';
import { PARTS, EXPLODE_DIR, EXPLODE_DIST } from '../core/config.js';
import { createMaterials, shellMaterials } from './materials.js';
import {
  buildLegShield, buildFloorboard, buildSideCowl, buildFrontFender, buildSeat,
} from './parts/body.js';
import { buildWheel, buildHubMotor } from './parts/wheels.js';
import { buildHandlebar, buildFrontFork } from './parts/cockpit.js';
import { buildRearRack, buildDeliveryBox, buildTailLight } from './parts/rear.js';
import {
  buildFrame, buildBattery, buildController, buildHarness, buildKickstand,
  HARNESS_POINTS,
} from './parts/internals.js';

export function buildScooter() {
  const M = createMaterials();

  const root = new THREE.Group();
  root.name = 'scooter';

  // 车身侧倾枢轴（绕 X 转）
  const bodyLean = new THREE.Group();
  bodyLean.name = 'bodyLean';
  root.add(bodyLean);

  // 转向枢轴（绕 Y 转）：车把 + 前叉 + 前轮
  const steerPivot = new THREE.Group();
  steerPivot.name = 'steerPivot';
  steerPivot.position.set(0.52, 0.98, 0);
  bodyLean.add(steerPivot);

  const g = {};
  const reg = (id, grp, parent = bodyLean) => {
    grp.name = id;
    parent.add(grp);
    g[id] = grp;
    return grp;
  };

  // ---- 内部件 ----
  reg('frame', buildFrame(M));
  reg('battery', buildBattery(M));
  reg('controller', buildController(M));
  reg('harness', buildHarness(M, HARNESS_POINTS));

  // ---- 车身覆盖件 ----
  reg('legShield', buildLegShield(M));
  reg('floorboard', buildFloorboard(M));
  reg('sideCowlL', buildSideCowl(M, +1));
  reg('sideCowlR', buildSideCowl(M, -1));
  reg('frontFender', buildFrontFender(M));
  reg('seat', buildSeat(M));

  // ---- 后部 ----
  reg('rearRack', buildRearRack(M));
  const box = buildDeliveryBox(M);
  reg('deliveryBox', box.group);
  reg('tailLight', buildTailLight(M));

  // ---- 转向系统（挂在 steerPivot 下）----
  reg('handlebar', buildHandlebar(M), steerPivot).position.set(0, 0.12, 0);
  reg('frontFork', buildFrontFork(M), steerPivot).position.set(0.05, -0.38, 0);
  reg('frontWheel', buildWheel(M), steerPivot).position.set(0.10, -0.78, 0);

  // ---- 后轮与电机 ----
  reg('rearWheel', buildWheel(M)).position.set(-0.62, 0.20, 0);
  reg('hubMotor', buildHubMotor(M)).position.set(-0.62, 0.20, 0);

  // ---- 脚撑（不属于零件表）----
  const kickstand = buildKickstand(M);
  bodyLean.add(kickstand);

  // ---- 大灯 SpotLight ----
  const headSpot = new THREE.SpotLight(0xFFF2D0, 0, 14, Math.PI / 5.5, 0.5, 1.1);
  headSpot.position.set(0.10, 0, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(8, -1.4, 0);
  g.handlebar.add(spotTarget);
  headSpot.target = spotTarget;
  g.handlebar.add(headSpot);

  // ---- 线束路径 ----
  const harnessPath = new THREE.CatmullRomCurve3(
    HARNESS_POINTS.map((p) => new THREE.Vector3(...p))
  );

  // ---- 组装 parts（包围盒锚点 / 拆解方向）----
  root.updateMatrixWorld(true);
  const whole = new THREE.Box3().setFromObject(root);
  const wholeCenter = whole.getCenter(new THREE.Vector3());

  const tmpBox = new THREE.Box3();
  const tmpCenter = new THREE.Vector3();
  const parts = PARTS.map((def) => {
    const object = g[def.id];
    object.updateMatrixWorld(true);
    tmpBox.setFromObject(object);
    tmpBox.getCenter(tmpCenter);
    const anchorWorld = new THREE.Vector3(tmpCenter.x, tmpBox.max.y, tmpCenter.z);
    const labelAnchor = object.worldToLocal(anchorWorld.clone());

    let explodeDir;
    if (EXPLODE_DIR[def.id]) {
      explodeDir = EXPLODE_DIR[def.id].clone();
    } else {
      explodeDir = tmpCenter.clone().sub(wholeCenter);
      if (explodeDir.lengthSq() < 1e-6) explodeDir.set(0, 1, 0);
      explodeDir.normalize();
    }
    const explodeDist = EXPLODE_DIST[def.id] ?? 0.35;

    return {
      id: def.id, nameZh: def.nameZh, desc: def.desc, object,
      layer: def.layer,
      explodeDir, explodeDist,
      internal: def.internal,
      labelAnchor,
    };
  });

  // 调试：?spin=角度 旋转整车，仅用于截图（默认不生效，不影响契约）
  const q = new URLSearchParams(location.search);
  if (q.get('spin') !== null) {
    root.rotation.y = (parseFloat(q.get('spin')) || 0) * Math.PI / 180;
  }

  // 调试：?stats=1 输出三角面数/网格数（默认不生效，不影响契约）
  if (q.get('stats')) {
    let tri = 0, meshes = 0;
    root.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const geo = o.geometry;
      const n = geo.index ? geo.index.count : geo.attributes.position.count;
      tri += (n / 3) * (o.isInstancedMesh ? o.count : 1);
    });
    console.log('[model-stats] triangles=' + Math.round(tri) + ' meshes=' + meshes);
  }

  return {
    root,
    parts,
    rig: {
      frontWheel: g.frontWheel,
      rearWheel: g.rearWheel,
      steerPivot,
      bodyLean,
      boxLid: box.lid,
      kickstand,
      lightMats: {
        head: M.head, tail: M.tail, brake: M.brake,
        signalL: M.signalL, signalR: M.signalR,
      },
      headSpot,
      harnessPath,
    },
    shellMaterials: shellMaterials(M),
  };
}
