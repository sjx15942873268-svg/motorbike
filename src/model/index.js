// 桩：建模Agent 替换此文件
import * as THREE from 'three';
import { PARTS } from '../core/config.js';

export function buildScooter() {
  const root = new THREE.Group();
  root.name = 'scooter';
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.7, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xFBC405 })
  );
  box.position.set(0, 0.55, 0);
  root.add(box);

  const parts = PARTS.map((p) => ({
    ...p, object: box, explodeDir: new THREE.Vector3(0, 1, 0), explodeDist: 0.3,
    labelAnchor: new THREE.Vector3(0, 0.6, 0),
  }));

  return {
    root, parts,
    rig: {
      frontWheel: box, rearWheel: box, steerPivot: box, bodyLean: box, boxLid: box,
      kickstand: box,
      lightMats: { head: null, tail: null, brake: null, signalL: null, signalR: null },
      headSpot: null, harnessPath: null,
    },
    shellMaterials: [],
  };
}
