// 渲染器、背景、环境反射、灯光与后期链
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const ACCENT = 0xFBC405;

export function backgroundTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1b1d24');
  grad.addColorStop(0.55, '#101115');
  grad.addColorStop(1, '#0b0b0c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 渲染器 + PMREM 环境 + 灯光 + 后期链
// 后期链顺序固定：RenderPass → OutlinePass → UnrealBloomPass → OutputPass（必须最后）
export function createStage(canvas, scene, camera) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();

  // 暖色主光（投影）
  const key = new THREE.DirectionalLight(0xfff1d6, 3.2);
  key.position.set(4, 6, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4.5;
  key.shadow.camera.right = 4.5;
  key.shadow.camera.top = 4.5;
  key.shadow.camera.bottom = -4.5;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // 车后方美团黄轮廓光
  const rim = new THREE.DirectionalLight(ACCENT, 2.6);
  rim.position.set(-5, 2.4, -2.5);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(0x46505e, 0x0a0a0c, 0.45);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0xbfd0e0, 0.55);
  fill.position.set(2.5, 1.6, 4.5);
  scene.add(fill);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const outlinePass = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
  outlinePass.edgeStrength = 3.2;
  outlinePass.edgeGlow = 0.35;
  outlinePass.edgeThickness = 1.1;
  outlinePass.pulsePeriod = 2.8;
  outlinePass.visibleEdgeColor.set(ACCENT);
  outlinePass.hiddenEdgeColor.set(0x2a2200);
  composer.addPass(outlinePass);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.85));
  composer.addPass(new OutputPass());

  return { renderer, composer, outlinePass };
}
