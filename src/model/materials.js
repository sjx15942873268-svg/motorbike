// 全车共享材质 —— 颜色全部来自 core/config.js，不写魔法数
import * as THREE from 'three';
import {
  PAINT, GLOSS_BLACK, SEAT, CHROME, HUB, TIRE,
  BATTERY_SHELL, CELL, COIL,
} from '../core/config.js';

export function createMaterials() {
  // 美团黄烤漆：clearcoat 亮面
  const paint = new THREE.MeshPhysicalMaterial({
    color: PAINT, roughness: 0.35, metalness: 0.05,
    clearcoat: 1.0, clearcoatRoughness: 0.08,
  });
  const glossBlack = new THREE.MeshStandardMaterial({
    color: GLOSS_BLACK, roughness: 0.35, metalness: 0.25,
  });
  const matteBlack = new THREE.MeshStandardMaterial({
    color: 0x161616, roughness: 0.85, metalness: 0.0,
  });
  const seat = new THREE.MeshStandardMaterial({
    color: SEAT, roughness: 0.85, metalness: 0.0,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: CHROME, metalness: 1.0, roughness: 0.15,
  });
  const hub = new THREE.MeshStandardMaterial({
    color: HUB, metalness: 0.8, roughness: 0.3,
  });
  const tire = new THREE.MeshStandardMaterial({
    color: TIRE, roughness: 0.9, metalness: 0.0,
  });
  // 内部件
  const batteryShell = new THREE.MeshStandardMaterial({
    color: BATTERY_SHELL, roughness: 0.5, metalness: 0.4,
  });
  const cell = new THREE.MeshStandardMaterial({
    color: CELL, roughness: 0.35, metalness: 0.3,
    emissive: CELL, emissiveIntensity: 0.3,
  });
  const coil = new THREE.MeshStandardMaterial({
    color: COIL, roughness: 0.3, metalness: 0.9,
  });
  const alu = new THREE.MeshStandardMaterial({
    color: 0xB9BEC4, roughness: 0.4, metalness: 0.9,
  });
  // 外卖箱
  const boxBody = new THREE.MeshStandardMaterial({
    color: 0x17171A, roughness: 0.5, metalness: 0.1,
  });
  const boxLid = new THREE.MeshStandardMaterial({
    color: 0x1E1E22, roughness: 0.45, metalness: 0.1,
  });
  const plate = new THREE.MeshStandardMaterial({
    color: 0xF5F5F5, roughness: 0.55, metalness: 0.0,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x0F0F0F, roughness: 0.95, metalness: 0.0,
  });

  // 发光材质（lightMats，靠 emissiveIntensity 控制）
  // 关灯时呈深灰透镜质感，避免被环境反射打成白球
  const head = new THREE.MeshStandardMaterial({
    color: 0x7E858B, emissive: 0xFFE9B0, emissiveIntensity: 0.0,
    roughness: 0.55, metalness: 0.0,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: 0x7A0D0D, emissive: 0xFF2222, emissiveIntensity: 0.25,
    roughness: 0.25, metalness: 0.0,
  });
  const brake = new THREE.MeshStandardMaterial({
    color: 0x7A0D0D, emissive: 0xFF2222, emissiveIntensity: 0.0,
    roughness: 0.25, metalness: 0.0,
  });
  const signalL = new THREE.MeshStandardMaterial({
    color: 0x8A5A00, emissive: 0xFFA500, emissiveIntensity: 0.0,
    roughness: 0.25, metalness: 0.0,
  });
  const signalR = signalL.clone();

  return {
    paint, glossBlack, matteBlack, seat, chrome, hub, tire,
    batteryShell, cell, coil, alu, boxBody, boxLid, plate, rubber,
    head, tail, brake, signalL, signalR,
  };
}

// 外壳材质：X光 / 剖视作用在这一组材质上
export function shellMaterials(M) {
  return [
    M.paint, M.glossBlack, M.matteBlack, M.seat, M.chrome,
    M.tire, M.hub, M.boxBody, M.boxLid, M.plate,
  ];
}
