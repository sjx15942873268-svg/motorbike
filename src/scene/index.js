// 桩：场景动效Agent 替换此文件
import * as THREE from 'three';
import { on } from '../core/bus.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0c);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(-3.2, 1.6, 1.6);
  camera.lookAt(0, 0.7, 0);

  const key = new THREE.DirectionalLight(0xfff1d6, 3.0);
  key.position.set(4, 6, 3);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0x404a5a, 0x0a0a0c, 0.5));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const api = {
    renderer, scene, camera,
    setView() {}, setExplode() {}, setCutaway() {}, setXray() {},
    focusPart() {}, tourGo() {},
    update() { renderer.render(scene, camera); },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    },
    renderOnly() { renderer.render(scene, camera); },
    get domElement() { return renderer.domElement; },
  };

  on('view:change', () => {});
  addEventListener('resize', api.resize);
  return api;
}
