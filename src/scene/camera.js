// 相机：视角过渡、骑行跟随抖动、FOV 随速度、检视拆解自动拉远
import * as THREE from 'three';
import { state } from '../core/state.js';
import { tween, kill } from '../core/tween.js';
import { MAX_SPEED } from '../core/config.js';
import { VIEWS } from './views.js';
import { explodeBoundingBox } from './explode.js';

const TRANSITION = 1.2;   // 视角切换时长（秒）
// 设计宽高比 = 验收视口 1440×900。更窄的画幅按比例拉远，保证整车在画面内；
// 更宽或等比的画幅 scale 恒为 1，横屏构图完全不变。
const BASE_ASPECT = 1440 / 900;

export function createCameraRig(camera, controls, { solo, getScooter } = {}) {
  let camTween = null;
  let fitTween = null;
  let pendingViewPos = null;   // 视角 tween 的目标机位（拆解适配时沿用它的观察方向）

  // 窄幅（竖屏）时把相机拉远，补偿水平视场角的丢失
  function aspectScale() {
    return Math.max(1, BASE_ASPECT / camera.aspect);
  }
  let lastScale = aspectScale();

  // 视角切换：同时插值相机位置与 controls.target，过渡期间禁用 OrbitControls
  function flyTo(cfg, duration = TRANSITION) {
    kill(camTween);
    kill(fitTween);
    fitTween = null;
    const s = aspectScale();
    lastScale = s;
    const p0 = camera.position.clone();
    const t0 = controls.target.clone();
    const p1 = cfg.pos.clone().sub(cfg.target).multiplyScalar(s).add(cfg.target);
    const t1 = cfg.target.clone();
    pendingViewPos = p1;
    controls.enabled = false;
    camTween = tween({
      duration,
      onUpdate: (k) => {
        camera.position.lerpVectors(p0, p1, k);
        controls.target.lerpVectors(t0, t1, k);
        camera.lookAt(controls.target);
      },
      onComplete: () => {
        camTween = null;
        pendingViewPos = null;
        if (state.view === 'inspect' && solo !== 'model') controls.enabled = true;
      },
    });
  }

  // 骑行镜头：追尾机位 + 高速轻微抖动
  function updateRideCamera() {
    const k = Math.min(state.ride.speed / MAX_SPEED, 1);
    const sh = 0.03 * k;
    const s = aspectScale();
    const t = performance.now() * 0.001;
    const b = VIEWS.ride.target;
    camera.position.set(
      b.x + (VIEWS.ride.pos.x - b.x) * s + Math.sin(t * 37.3) * sh + (Math.random() - 0.5) * sh * 0.6,
      b.y + (VIEWS.ride.pos.y - b.y) * s + Math.sin(t * 41.7) * sh * 0.6,
      b.z + (VIEWS.ride.pos.z - b.z) * s + Math.sin(t * 33.1) * sh * 0.8
    );
    camera.lookAt(controls.target);
  }

  // FOV 随速度 45 → 52
  function updateFov(dt) {
    const target = state.view === 'ride'
      ? 45 + 7 * Math.min(state.ride.speed / MAX_SPEED, 1)
      : 45;
    if (Math.abs(camera.fov - target) > 0.005) {
      camera.fov += (target - camera.fov) * Math.min(1, dt * 5);
      camera.updateProjectionMatrix();
    }
  }

  // 检视视角下拆解时按整体包围盒自动拉远，保证 100% 时所有零件在画面内
  function fitCameraToExplode() {
    const scooter = getScooter ? getScooter() : null;
    if (!scooter) return;
    const box = explodeBoundingBox(scooter);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (!isFinite(sphere.radius) || sphere.radius <= 0) return;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const s = aspectScale();
    lastScale = s;
    // 竖屏下水平视场角变窄，单按垂直 FOV 算距离会把车裁掉，乘上宽高比补偿
    const dist = Math.max(1.6, (sphere.radius / Math.tan(vFov / 2)) * 1.12) * s;
    kill(fitTween);
    // URL 参数（?explode=）会在视角 tween 未结束时触发自动拉远，这里要取消视角 tween，
    // 否则两条 tween 同帧写相机，最终停在视角机位而不是包围盒适配位
    kill(camTween);
    camTween = null;
    const p0 = camera.position.clone();
    const t0 = controls.target.clone();
    // 观察方向优先取视角 tween 的目标机位：URL 同时带 view + explode 时，
    // 相机还停在初始位置，沿用目标机位才能得到正常的 3/4 构图
    const base = pendingViewPos ? pendingViewPos.clone() : p0;
    const dir = base.clone().sub(sphere.center);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.6, 1);
    dir.normalize();
    const p1 = sphere.center.clone().addScaledVector(dir, dist);
    controls.enabled = false;
    fitTween = tween({
      duration: 0.5,
      onUpdate: (k) => {
        camera.position.lerpVectors(p0, p1, k);
        controls.target.lerpVectors(t0, sphere.center, k);
        camera.lookAt(controls.target);
      },
      onComplete: () => {
        fitTween = null;
        if (state.view === 'inspect' && !camTween && solo !== 'model') controls.enabled = true;
      },
    });
  }

  // 画幅变化后按新的宽高比等比调整相机距离（保留 OrbitControls 的观察方向）
  function refitAspect() {
    const s = aspectScale();
    if (Math.abs(s - lastScale) < 1e-3) return;
    const off = camera.position.clone().sub(controls.target).multiplyScalar(s / lastScale);
    camera.position.copy(controls.target).add(off);
    lastScale = s;
  }

  return {
    flyTo, updateRideCamera, updateFov, fitCameraToExplode, refitAspect,
    get transitioning() { return !!(camTween || fitTween); },
  };
}
