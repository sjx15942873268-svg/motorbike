# 场景动效 Agent 交接

## 改动文件

| 文件 | 行数 | 说明 |
|---|---|---|
| `src/scene/index.js` | 340 | 编排：道路与展台、车辆挂接、拆解、剖视、高亮、拾取、标签、主循环 |
| `src/scene/stage.js` | 88 | 渲染器、背景、PMREM 环境、灯光、后期链 |
| `src/scene/camera.js` | 109 | 视角 tween、骑行抖动、FOV、检视拆解自动拉远 |
| `src/scene/flash.js` | 57 | 声音视角发声零件闪光（材质替换） |
| `src/scene/road.js` | 171 | 路面 / 路灯 / 路沿（InstancedMesh 滚动）与圆形展台，骑行↔展台交叉淡出 |
| `src/scene/xray.js` | 116 | X 光材质快照 / 还原、内部发光、线束虚线流动 |
| `src/scene/labels.js` | 76 | CSS2DRenderer 零件标签（世界空间跟踪） |
| `src/scene/views.js` | 43 | 四个视角机位 + `MODEL_VIEW` + OrbitControls 约束 |
| `src/scene/explode.js` | 30 | 分层拆解进度映射、应用、整体包围盒 |
| `src/scene/highlight.js` | 14 | OutlinePass 选中零件 |
| `src/sim/ride.js` | 158 | 骑行物理、跑单、rig 动画（车轮/转向/侧倾/灯光/转向灯/箱盖/脚撑） |

所有文件均 < 400 行。

未改动 `docs/SPEC.md`、`src/main.js`、`src/model/**`、`src/ui/**`、`src/audio/**`、`src/data/**`、`styles/**`、`index.html`。

## 导出接口（与 main.js 契约一致）

```js
// src/scene/index.js
export function createScene(canvas, { solo } = {})  // solo: 'model' | 'audio' | null
// 返回：
{
  scene, renderer, camera, controls, domElement,
  setView(view),        // 'ride' | 'drive' | 'inspect' | 'sound'
  setExplode(t),        // 0..1
  setCutaway(on),
  setXray(on),
  focusPart(id|null),
  tourGo(step),         // 0..4
  setDebug(on),
  setTurntable(on),     // ?solo=model 转台
  attachScooter(scooter),
  update(dt), renderOnly(), captureFrame(),
}

// src/sim/ride.js
export function createSim({ scene, scooter } = {})  // 入参可选
// 返回 { update(dt) }
```

`captureFrame()` 内部先 `composer.render()` 再 `renderer.domElement.toDataURL()`，同一同步任务内完成，满足 SPEC 8.8 的导出要求。

## 实现要点（对应 SPEC 8.2–8.5）

- **渲染器**：`antialias`、`pixelRatio = min(dpr, 2)`、ACESFilmic、曝光 1.0、PCFSoftShadowMap、`localClippingEnabled`。
- **环境**：`PMREMGenerator.fromScene(new RoomEnvironment(), 0.04)`，`environmentIntensity = 0.6`。
- **灯光**：暖主光 `(4,6,3)` 强度 3.2、shadow map 2048、±4.5 视锥；美团黄轮廓光 `(-5,2.4,-2.5)` 2.6；Hemisphere 0.45；补光 0.55；大头灯 SpotLight 挂车头（`rig.headSpot`，`state.lights.head` → 强度 120，物理单位）。
- **后期链**：RenderPass → OutlinePass（`#FBC405`，edgeStrength 3.2 / glow 0.35 / thickness 1.1 / pulse 2.8）→ UnrealBloomPass（0.5, 0.4, threshold 0.85）→ OutputPass（最后）。
- **道路**：CanvasTexture 沥青 + 黄色虚线，`repeat.x = 200/8`，`offset.x += speed*dt/8`；路灯/路沿 InstancedMesh，x 减 `speed*dt`，出 -40 加 80 循环；骑行视角显示，其余视角 0.31s 内淡出到圆形展台（发光黄圈）。
- **物理**：`accel = throttle*3`、`drag = 0.4 + 0.02v²`、`brake*6`，`clamp(…, 0, 6.94)`；电量 / 里程 / 订单进度按 SPEC 8.3；`orderTarget` 到达后 `orders+1` 并发 `order:delivered`，下一单 200~400 随机。
- **rig**：车轮 `rotation.z -= speed/0.20*dt`；`steerPivot.rotation.y = steer*0.35`；`bodyLean.rotation.x = -steer*0.1*min(speed/3,1)`；转向灯 380ms 周期，每次切换发 `signal:tick`；箱盖 tween 到 1.22 rad（≈70°）；油门 >0.05 收脚撑（`rotation.x → +1.15`），停稳放下。
- **视角**：1.2s tween 同时插值 `camera.position` 与 `controls.target`，过渡期间 `controls.enabled = false`；`drive` 自动开 X 光（透明 0.12 / depthWrite false / 内部发光 / 线束虚线偏移随油门），其他视角还原；`inspect` 开标签与点击拾取，结束才允许 OrbitControls。
- **拆解**：`layerStart = (4-layer)*0.15`、`local = clamp((t-layerStart)/0.4)`、`easeInOutCubic`；`userData.home` 记录原始位置；检视视角按整体包围盒自动拉远（`dist = radius / tan(fov/2) * 1.12`），`t=0` 精确回到 home。
- **剖视**：`Plane(0,0,-1)` 只加到外壳材质（`shellMaterials` + 场景侧识别出的透明贴片），constant 0.6→0（0.55s），外壳 `DoubleSide`，不做封盖。
- **车贴归属**：模型返回的 `shellMaterials` 只含实体材质，车贴 / 贴纸（`PlaneGeometry` + `transparent` + `map`）不在其中。场景在挂接时把这类贴片材质并入外壳材质组，否则 X 光下贴花会悬空、剖视时贴花不被裁掉。
- **高亮**：`outlinePass.selectedObjects = [part.object]`，点击拾取与导览（`tour:step`）同一条路径。

## 自测结果（Playwright + swiftshader，1100×680 / 1440×900）

- 控制台 / pageerror：**0 条**（`node tools/shoot.mjs` 与自建脚本均通过，日志见 `qa/console.log`）。
- 物理：speed 与公式一致；`order:delivered` 触发后 `orders+1`、`orderTarget` 重新随机 200~400。
- `signal:tick`：380ms 周期按 side 成对发出。
- 箱盖：`box:toggle` 后 `boxLid.rotation.z` 精确到 1.22 rad。
- 拆解：`t=1` 时 18/18 零件偏离 home，`t=0` 复位最大误差 **0**；`?view=inspect&explode=1` 时相机自动拉远，18/18 零件的投影都落在 NDC 内（最紧的一处 |y|=0.81）。
- 剖视：外壳材质（含 5 个车贴贴片）拿到 `clippingPlanes` 且 `side = DoubleSide`，constant 收敛到 0。
- 车贴：X 光下 5 个贴花材质 opacity 0.12 / depthWrite false，剖视下同样被平面裁掉。
- X 光：内部件 emissiveIntensity 0.9、线束 0.7 且带虚线贴图；退出后透明度 / depthWrite / map / emissive 全部还原。
- 标签：18 个 CSS2DObject 在车轮转动时最大位移 **0**（世界空间跟踪，不绕轴）。
- 拾取：检视视角下 4 次点击分别命中 右侧裙 / 左侧裙 / 前护板 / 座垫，`#part-card` 文案随之更新。
- 闪光：`light:toggle` / `horn` / `signal:tick` / `box:toggle` 触发时材质被替换为高亮克隆，0.35s 后精确换回原材质（无共享材质污染）。
- 灯光：`state.lights.head` → 头灯 SpotLight 强度 120 / 0。
- 转台：`?solo=model` 下 `root.rotation.y` 持续转动；`?debug=1` 下 AxesHelper + Box3Helper 存在且每帧更新。
- 长骑：满油门连续运行 60s（无头环境下约 24s 仿真时间），speed 0 → 6.94 收敛、电量/里程/订单进度单调累加、无 NaN、无控制台报错；松开油门 + 刹车后 speed 归 0、脚撑自动放下（`state.kickstand` true）。

## 截图（qa/shots，1440×900）

| 视角 | 路径 |
|---|---|
| 骑行待机 / 高速 | `qa/shots/ride_idle.png` / `qa/shots/ride_fast.png` |
| 电驱 X 光 | `qa/shots/drive_xray.png` |
| 检视 3/4 / 正侧 / 后 3/4 | `qa/shots/inspect_front34.png` / `inspect_side.png` / `inspect_rear34.png` |
| 拆解 50% / 100% | `qa/shots/explode_50.png` / `explode_100.png` |
| 剖视 | `qa/shots/cutaway.png` |
| 声音 | `qa/shots/sound.png` |
| 导览第 3 步 | `qa/shots/tour_step3.png` |
| 调试 | `qa/shots/debug.png` |
| 转台（solo=model） | `qa/shots/solo_model.png` |

## 已知问题

1. **软渲染下动画被时间稀释**：主循环 `dt = min(clock.getDelta(), 0.05)`，swiftshader 只有 ~2fps，一切 tween / 淡出在截图环境里被放慢约 8 倍；真实浏览器 60fps 下正常。截图脚本因此按「状态收敛」等待而不是固定 sleep。
2. **骑行视角相机每帧重写**：`updateRideCamera()` 每帧 set 相机位置（含抖动）。`rig.transitioning` 为真时该调用被抑制，因此从其它视角切回骑行时 1.2s 的 `flyTo` 能完整播完，结束后抖动立即接管——切换瞬间不会有抖动穿插，属预期。
3. **标签在零件密集处会重叠**：检视视角 18 个标签同时显示，中部（线束 / 电池组 / 控制器）文字可能互相遮挡；未做碰撞避让，靠锚点偏移缓解。
4. **声音视角闪光为整体零件闪光**：一次事件闪光该零件所有网格（如整个车把），不是单个按钮；SPEC 只要求「发声零件同步闪光」，已满足。
5. **`?explode=` 与视角切换的 tween 竞争**：URL 同时带 `view` 与 `explode` 时，自动拉远会取消未结束的视角 tween（已在 `fitCameraToExplode` 中 `kill(camTween)`），最终停在包围盒适配位而不是视角机位——这是有意选择，保证 100% 拆解时所有零件在画面内。
6. **道路在 `drive` / `sound` 视角仍可能残留极淡的影子**：交叉淡出末尾 `mix < 0.02` 才隐藏，数学上不会完全为 0；实际帧率下不可见。
7. `favicon.ico` 404 与场景无关（本地服务未提供图标），主页面无报错。
