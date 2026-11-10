// 场景编排：道路与展台、车辆挂接、拆解、剖视、高亮、拾取、标签、主循环
// 渲染器 / 灯光 / 后期链见 stage.js，相机过渡见 camera.js，零件闪光见 flash.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../core/state.js';
import { on as onBus, emit } from '../core/bus.js';
import { tween, kill } from '../core/tween.js';
import { DIM, TOUR_STEPS, EXPLODE_DIR, EXPLODE_DIST } from '../core/config.js';
import { createRoad } from './road.js';
import { VIEWS, MODEL_VIEW, CONTROL_LIMITS } from './views.js';
import { applyExplode } from './explode.js';
import { createXray } from './xray.js';
import { createHighlight } from './highlight.js';
import { createLabels } from './labels.js';
import { createStage, backgroundTexture, ACCENT } from './stage.js';
import { createCameraRig } from './camera.js';
import { createFlash } from './flash.js';

const CUTAWAY_MAX = 0.6;     // 剖视平面 constant 起始值
const HIDDEN_EDGE = 0x2a2200; // OutlinePass 被遮挡边缘的常态颜色

export function createScene(canvas, opts = {}) {
  const solo = opts.solo || null;

  // ---------- 场景 / 相机 / 控制器 ----------
  const scene = new THREE.Scene();
  scene.background = backgroundTexture();
  scene.fog = new THREE.Fog(0x0b0b0c, 22, 82);

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 400);
  camera.position.set(-3.2, 1.6, 1.6);
  camera.lookAt(0, 0.7, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = CONTROL_LIMITS.minDistance;
  controls.maxDistance = CONTROL_LIMITS.maxDistance;
  controls.minPolarAngle = CONTROL_LIMITS.minPolarAngle;
  controls.maxPolarAngle = CONTROL_LIMITS.maxPolarAngle;
  controls.target.set(0, 0.7, 0);
  controls.enabled = false;
  controls.update();

  const { renderer, composer, outlinePass } = createStage(canvas, scene, camera);

  // ---------- 内部状态 ----------
  let scooter = null;
  let shellMats = [];
  let decalMats = [];
  let xray = null;
  let labels = null;
  let highlight = null;
  let explodeT = 0;
  let debug = false;
  let turntable = false;
  let axesHelper = null;
  let boxHelper = null;
  let hornT = -1;

  const rig = createCameraRig(camera, controls, { solo, getScooter: () => scooter });
  const flash = createFlash(() => scooter);

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), CUTAWAY_MAX);
  let cutawayOn = false;

  // ---------- 道路与展台 ----------
  const road = createRoad(scene);

  // ---------- 拆解 ----------
  function setExplode(t) {
    explodeT = THREE.MathUtils.clamp(t, 0, 1);
    state.explode = explodeT;
    applyExplode(scooter, explodeT);
    // 检视视角下始终按包围盒适配：fitCameraToExplode 会取消未结束的视角 tween，
    // 并沿用其目标机位方向（URL 同时带 view + explode 时也能得到正常构图）
    if (state.view === 'inspect') rig.fitCameraToExplode();
  }

  // ---------- 剖视 ----------
  let cutTween = null;

  function setCutaway(onFlag) {
    cutawayOn = !!onFlag;
    state.cutaway = cutawayOn;
    kill(cutTween);
    const from = clipPlane.constant;
    const to = cutawayOn ? 0 : CUTAWAY_MAX;
    for (const m of shellMats) m.clippingPlanes = [clipPlane];
    cutTween = tween({
      duration: 0.55,
      onUpdate: (k) => { clipPlane.constant = from + (to - from) * k; },
      onComplete: () => {
        cutTween = null;
        if (!cutawayOn) for (const m of shellMats) m.clippingPlanes = null;
      },
    });
  }

  // ---------- 车辆挂接 ----------
  function ensureHeadSpot() {
    const rigRef = scooter.rig;
    if (!rigRef) return;
    if (!rigRef.headSpot) {
      const spot = new THREE.SpotLight(0xfff2d0, 0, 18, 0.46, 0.5, 1.4);
      spot.position.set(DIM.handleX, DIM.handleY, 0);
      spot.target.position.set(DIM.handleX + 5, 0.1, 0);
      scooter.root.add(spot, spot.target);
      rigRef.headSpot = spot;
    } else if (!rigRef.headSpot.parent) {
      scooter.root.add(rigRef.headSpot);
      if (rigRef.headSpot.target && !rigRef.headSpot.target.parent) {
        scooter.root.add(rigRef.headSpot.target);
      }
    }
  }

  // 内部件材质独立化：全车共享材质时，发光/虚线贴图不能污染到外壳件
  function unshareMaterials(part) {
    const map = new Map();
    part.object.traverse((o) => {
      if (!o.isMesh) return;
      const conv = (m) => {
        if (!map.has(m)) map.set(m, m.clone());
        return map.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    });
  }

  // 贴纸 / 车贴等透明贴片属于外壳表面：X 光与剖视要连同外壳一起处理，
  // 否则贴花会悬在半空（模型侧 shellMaterials 只列出实体材质）
  function collectDecalMaterials(s) {
    const known = new Set(s.shellMaterials || []);
    const decals = [];
    s.root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m || known.has(m) || !m.transparent || !m.map) continue;
        const g = o.geometry;
        if (!g || g.type !== 'PlaneGeometry') continue;
        known.add(m);
        decals.push(m);
      }
    });
    return decals;
  }

  function attachScooter(s) {
    if (!s || scooter === s) return;
    scooter = s;
    s.root.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    decalMats = collectDecalMaterials(s);
    shellMats = [...(s.shellMaterials || []), ...decalMats];
    for (const part of s.parts || []) {
      if (part.object && part.internal) unshareMaterials(part);
    }
    const vehicleCenter = new THREE.Box3().setFromObject(s.root).getCenter(new THREE.Vector3());
    for (const part of s.parts || []) {
      const obj = part.object;
      if (!obj) continue;
      if (!obj.userData.home) obj.userData.home = obj.position.clone();
      obj.userData.partId = part.id;
      if (!part.explodeDir) {
        if (EXPLODE_DIR[part.id]) part.explodeDir = EXPLODE_DIR[part.id].clone();
        else {
          const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
          part.explodeDir = c.sub(vehicleCenter);
          if (part.explodeDir.lengthSq() < 1e-6) part.explodeDir.set(0, 1, 0);
          else part.explodeDir.normalize();
        }
      }
      if (!part.explodeDist) part.explodeDist = EXPLODE_DIST[part.id] ?? 0.35;
    }
    // 外壳件开 DoubleSide（剖视要看到内壁）；贴花保持 FrontSide ——
    // 双面渲染会让远侧贴花从背面透出来，变成反字重影
    const decalSet = new Set(decalMats);
    for (const m of shellMats) m.side = decalSet.has(m) ? THREE.FrontSide : THREE.DoubleSide;
    if (state.cutaway) {
      for (const m of shellMats) m.clippingPlanes = [clipPlane];
    }
    xray = createXray(s, shellMats);
    xray.setXray(!!state.xray);
    labels = createLabels(scene, document.getElementById('labels'), () => scooter);
    labels.build();
    highlight = createHighlight(outlinePass, () => scooter);
    ensureHeadSpot();
    applyExplode(explodeT);
  }

  function tryFindScooter() {
    const found = scene.getObjectByName('scooter');
    if (found && found !== scooter) {
      attachScooter({ root: found, parts: [], rig: {}, shellMaterials: [] });
    }
  }

  // ---------- 内部件揭示 ----------
  // 导览 / 拾取聚焦到内部件（电池组、轮毂电机、控制器）时外壳会挡住描边，
  // 把外壳临时半透明；失焦时按快照精确还原
  let revealSnap = null;
  function setShellReveal(on) {
    if (!!on === !!revealSnap) return;
    // OutlinePass 的深度预渲染用 overrideMaterial，外壳 depthWrite=false 挡不住它，
    // 内部件的描边会被判成「隐藏边缘」。揭示期间把隐藏边缘也涂成美团黄，
    // 这样描边才能透过半透明外壳看见。
    outlinePass.hiddenEdgeColor.set(on ? ACCENT : HIDDEN_EDGE);
    if (on) {
      revealSnap = shellMats.map((m) => ({
        m, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite,
      }));
      for (const m of shellMats) {
        m.transparent = true;
        m.opacity = 0.18;
        m.depthWrite = false;
      }
    } else {
      for (const s of revealSnap) {
        s.m.opacity = s.opacity;
        s.m.transparent = s.transparent;
        s.m.depthWrite = s.depthWrite;
      }
      revealSnap = null;
    }
  }

  // ---------- 交互 ----------
  // 按当前选中的零件决定是否揭示外壳。setView 会被调用多次（main.js 启动时
  // 先按 URL 参数调一次、随后再 setView(state.view) 一次），不能简单粗暴地
  // 在 setView 里 setShellReveal(false)，否则 ?view=inspect&tour=2 的揭示
  // 会被第二次 setView 抹掉。
  function syncReveal() {
    const id = highlight ? highlight.current : null;
    const part = id && scooter ? (scooter.parts || []).find((p) => p.id === id) : null;
    setShellReveal(!!(part && part.internal) && !state.xray);
  }

  function setView(view) {
    if (!VIEWS[view]) return;
    state.view = view;
    flash.restoreFlash();
    rig.flyTo(solo === 'model' ? MODEL_VIEW : VIEWS[view]);
    road.setRiding(view === 'ride' && solo !== 'model');
    const wantXray = view === 'drive';
    state.xray = wantXray;
    if (wantXray) {
      // 先还原外壳再上 X 光，避免 X 光快照把揭示态当成原始状态
      setShellReveal(false);
      if (xray) xray.setXray(true);
    } else {
      if (xray) xray.setXray(false);
      if (view !== 'inspect' && highlight) highlight.focus(null);
      syncReveal();
    }
    if (labels) labels.setVisible(view === 'inspect');
  }

  function setXray(onFlag) {
    state.xray = !!onFlag;
    if (state.xray) {
      setShellReveal(false);
      if (xray) xray.setXray(true);
    } else {
      if (xray) xray.setXray(false);
      syncReveal();
    }
  }

  function focusPart(id) {
    if (!highlight) return null;
    const part = highlight.focus(id);
    syncReveal();
    return part;
  }

  function tourGo(step) {
    if (!highlight) return;
    const def = TOUR_STEPS[step];
    highlight.focus(def ? def.part : null);
    syncReveal();
  }

  function setDebug(v) {
    debug = !!v;
    if (debug) {
      axesHelper = new THREE.AxesHelper(1.6);
      scene.add(axesHelper);
      boxHelper = new THREE.Box3Helper(new THREE.Box3(), ACCENT);
      scene.add(boxHelper);
    } else {
      if (axesHelper) { scene.remove(axesHelper); axesHelper.dispose(); axesHelper = null; }
      if (boxHelper) { scene.remove(boxHelper); boxHelper.dispose(); boxHelper = null; }
    }
  }

  function setTurntable(v) {
    turntable = !!v;
    if (!v && scooter) scooter.root.rotation.y = 0;
  }

  // ---------- 拾取 ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (state.view !== 'inspect' || !scooter || !downAt) return;
    if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(scooter.root, true);
    for (const hit of hits) {
      let o = hit.object;
      while (o && !o.userData.partId) o = o.parent;
      if (o && o.userData.partId) {
        emit('part:focus', { id: o.userData.partId });
        return;
      }
    }
  });

  // ---------- 总线 ----------
  // 拾取与外部 part:focus 都走 focusPart，保证内部件的外壳揭示一致触发
  onBus('part:focus', ({ id } = {}) => { if (highlight) focusPart(id); });
  onBus('tour:step', ({ step } = {}) => { if (highlight) tourGo(step); });
  onBus('horn', () => { hornT = 0; flash.flashPart('handlebar'); });
  onBus('light:toggle', ({ which } = {}) => {
    if (which === 'head') flash.flashPart('handlebar');
    else if (which === 'left' || which === 'right') { flash.flashPart('handlebar'); flash.flashPart('tailLight'); }
  });
  onBus('signal:tick', ({ side } = {}) => {
    flash.flashPart(side === 'left' ? 'handlebar' : 'tailLight');
  });
  onBus('box:toggle', () => flash.flashPart('deliveryBox'));

  function updateHorn(dt) {
    const rigRef = scooter ? scooter.rig : null;
    const hb = rigRef && rigRef.steerPivot ? rigRef.steerPivot : null;
    hornT += dt;
    const k = Math.max(0, 1 - hornT / 0.45);
    if (hb) hb.rotation.y = state.input.steer * 0.35 + Math.sin(hornT * 70) * 0.05 * k;
    if (hornT > 0.45) {
      hornT = -1;
      if (hb) hb.rotation.y = state.input.steer * 0.35;
    }
  }

  function updateHeadSpot() {
    const rigRef = scooter ? scooter.rig : null;
    if (!rigRef || !rigRef.headSpot) return;
    rigRef.headSpot.intensity = state.lights.head ? 120 : 0;
  }

  // ---------- 主循环 ----------
  function update(dt) {
    if (!scooter) tryFindScooter();
    if (!rig.transitioning && state.view === 'ride' && solo !== 'model') rig.updateRideCamera();
    if (controls.enabled) controls.update();
    rig.updateFov(dt);
    if (hornT >= 0) updateHorn(dt);
    if (turntable && scooter) scooter.root.rotation.y += dt * 0.45;
    road.update(dt, state.ride.speed, camera);
    if (xray) xray.update(dt, state.input.throttle);
    updateHeadSpot();
    flash.updateFlash(dt);
    if (debug && boxHelper && scooter) boxHelper.box.setFromObject(scooter.root);
    composer.render();
    if (labels) { labels.update(camera); labels.render(camera); }
  }

  function renderOnly() {
    composer.render();
    if (labels) { labels.update(camera); labels.render(camera); }
  }

  function captureFrame() {
    composer.render();
    if (labels) { labels.update(camera); labels.render(camera); }
    return renderer.domElement.toDataURL('image/png');
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    if (labels) labels.setSize(innerWidth, innerHeight);
    // 画幅变了要按新的宽高比重新补偿相机距离（竖屏拉远、横屏收回）
    rig.refitAspect();
  }
  addEventListener('resize', resize);

  return {
    renderer, scene, camera, controls,
    setView, setExplode, setCutaway, setXray, focusPart, tourGo, setDebug, setTurntable,
    attachScooter, update, renderOnly, captureFrame,
    get domElement() { return renderer.domElement; },
  };
}
