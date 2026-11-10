// 建模辅助函数
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rbox(w, h, d, r = 0.02, seg = 4) {
  return new RoundedBoxGeometry(w, h, d, seg, r);
}

export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export function put(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = mesh(geo, mat, x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// 侧视轮廓（XY 平面）挤出成体，depth 沿 Z 方向，几何体在 Z 向居中
export function extrudeSide(shape, depth, bevel = 0.015, bevelSize, curveSegments = 16) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevelSize ?? bevel * 0.7,
    bevelSegments: 4,
    curveSegments,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// 沿点列的圆管
export function tube(points, radius, segments = 40, radialSegments = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
}

// 圆环弧（用于挡泥板）：圆心在原点，弧度扇环
export function annularSector(rInner, rOuter, a0, a1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOuter, a0, a1, false);
  s.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
  s.absarc(0, 0, rInner, a1, a0, true);
  s.closePath();
  return s;
}

// 贴花材质：离表面 1~2mm，polygonOffset 防止闪面
export function decalMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.45,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    depthWrite: false,
  });
}

// 贴花平面：离表面 1~2mm，polygonOffset 防止闪面
export function decalMesh(texture, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMaterial(texture));
  m.renderOrder = 2;
  return m;
}

// 胶囊鼓包参数（局部：轴向 X，长度 0.28，半径 0.16，再经 scale 压缩）
// 返回鼓包表面在 (xr, yr) 处的 Z 偏移（相对鼓包中心），超出表面返回 0
export function capsuleSurfaceZ(xr, yr, { r = 0.16, zScale = 0.62, xHalf = 0.133, xScale = 0.95 } = {}) {
  const dx = Math.max(0, Math.abs(xr) - xHalf) / xScale;
  const v = r * r - yr * yr - dx * dx;
  return v > 0 ? zScale * Math.sqrt(v) : 0;
}

// 贴合在胶囊鼓包外表面的贴花（顶点沿鼓包表面位移，避免被鼓包遮住）
export function bulgeDecalMesh(texture, w, h, cx, cy, cz, side, bulge) {
  const segX = 28, segY = 14;
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const xr = pos.getX(i);
    const yr = pos.getY(i);
    pos.setZ(i, capsuleSurfaceZ(xr, yr, bulge) + 0.002);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, decalMaterial(texture));
  m.renderOrder = 2;
  m.position.set(cx, cy, cz);
  if (side < 0) m.rotation.y = Math.PI;
  return m;
}
