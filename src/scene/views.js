// 四个视角的相机机位与 OrbitControls 约束
import * as THREE from 'three';

export const VIEWS = {
  // 追尾跟随：车后偏左上方
  ride: {
    pos: new THREE.Vector3(-3.2, 1.6, 1.6),
    target: new THREE.Vector3(0, 0.7, 0),
    fov: 45,
  },
  // 电驱：正侧面近景（+Z 为车辆左侧）
  drive: {
    pos: new THREE.Vector3(0.0, 0.74, 2.6),
    target: new THREE.Vector3(0, 0.52, 0),
    fov: 45,
  },
  // 检视：自由旋转
  inspect: {
    pos: new THREE.Vector3(2.3, 1.55, 2.35),
    target: new THREE.Vector3(0, 0.5, 0),
    fov: 45,
  },
  // 声音：右前方 3/4 固定机位（右侧为 -Z）
  sound: {
    pos: new THREE.Vector3(1.95, 1.15, -1.75),
    target: new THREE.Vector3(0, 0.6, 0),
    fov: 45,
  },
};

// ?solo=model 转台机位（参考图构图：左侧面、车头朝右）
export const MODEL_VIEW = {
  pos: new THREE.Vector3(-1.15, 1.1, 3.0),
  target: new THREE.Vector3(0, 0.55, 0),
  fov: 45,
};

export const CONTROL_LIMITS = {
  minDistance: 1.2,
  maxDistance: 9,
  minPolarAngle: 0.18,
  maxPolarAngle: 1.52,
};
