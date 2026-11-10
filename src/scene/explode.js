// 拆解：全局进度按层映射到局部进度，外层先动
import * as THREE from 'three';
import { easeInOutCubic } from '../core/tween.js';

export const LAYER_COUNT = 4;      // layer 0..4
export const LAYER_WINDOW = 0.4;   // 每层动画时长（占全局 t 的比例）
export const LAYER_STAGGER = 0.15; // 每层错开的起点

export function layerLocal(t, layer) {
  const start = (LAYER_COUNT - layer) * LAYER_STAGGER;
  return THREE.MathUtils.clamp((t - start) / LAYER_WINDOW, 0, 1);
}

export function applyExplode(scooter, t) {
  if (!scooter || !scooter.parts) return;
  for (const part of scooter.parts) {
    const obj = part.object;
    const home = obj ? obj.userData.home : null;
    if (!obj || !home) continue;
    const e = easeInOutCubic(layerLocal(t, part.layer || 0));
    obj.position.copy(home).addScaledVector(part.explodeDir, part.explodeDist * e);
  }
}

// 当前爆炸状态下的整体包围盒（用于检视视角自动拉远）
export function explodeBoundingBox(scooter) {
  const box = new THREE.Box3();
  if (scooter && scooter.root) box.setFromObject(scooter.root);
  return box;
}
