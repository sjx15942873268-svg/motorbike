# 场景动效 Agent 交接

## 改动文件

| 文件 | 行数 | 说明 |
|---|---|---|
| `src/scene/index.js` | 403 | 编排：道路与展台、车辆挂接、拆解、剖视、高亮、内部件揭示、拾取、标签、主循环 |
| `src/scene/stage.js` | 90 | 渲染器、背景、PMREM 环境、灯光、后期链 |
| `src/scene/camera.js` | 134 | 视角 tween、骑行抖动、FOV、检视拆解自动拉远、窄幅宽高比补偿 |
| `src/scene/flash.js` | 57 | 声音视角发声零件闪光（材质替换） |
| `src/scene/road.js` | 193 | 路面 / 路灯 / 路沿（InstancedMesh 滚动）与圆形展台，骑行↔展台交叉淡出、近相机路灯缩没 |
| `src/scene/xray.js` | 116 | X 光材质快照 / 还原、内部发光、线束虚线流动 |
| `src/scene/labels.js` | 129 | CSS2DRenderer 零件标签（世界空间跟踪 + 屏幕空间碰撞避让） |
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
- **环境**：`PMREMGenerator.fromScene(new RoomEnvironment(), 0.04)`，`environmentIntensity = 0.3`（SPEC 8.2 写 0.6，过高会把黄漆的蓝通道抬起来 → 去饱和，详见 `notes/requests.md` 的偏差留档）。
- **灯光**：暖主光 `(4,6,3)` 强度 2.2、shadow map 2048、±4.5 视锥；美团黄轮廓光 `(-5,2.4,-2.5)` 1.5；Hemisphere 0.3；补光 0.35；大头灯 SpotLight 挂车头（`rig.headSpot`，`state.lights.head` → 强度 120，物理单位）。
- **后期链**：RenderPass → OutlinePass（`#FBC405`，edgeStrength 3.2 / glow 0.35 / thickness 1.1 / pulse 2.8）→ UnrealBloomPass（0.35, 0.4, threshold 1.0）→ OutputPass（最后）。
- **道路**：CanvasTexture 沥青 + 黄色虚线，`repeat.x = 200/8`，`offset.x += speed*dt/8`；路灯/路沿 InstancedMesh，x 减 `speed*dt`，出 -40 加 80 循环；骑行视角显示，其余视角 0.31s 内淡出到圆形展台（发光黄圈）。
- **近相机路灯缩没**：灯头（自发光 `emissiveIntensity 2.4`）在相机贴近时会占掉画面一大块并过曝成白斑。`layout(dist, cam)` 按灯头角尺寸占水平视场角的比例（`FADE_MAX 0.32` 开始缩没、`FADE_MIN 0.15` 完全消失）对整个灯实例 `scale` 渐缩；比例与画幅无关，1440×900 下最近路灯占比仅 0.11，恒为原尺寸，横屏效果不变。
- **物理**：`accel = throttle*3`、`drag = 0.4 + 0.02v²`、`brake*6`，`clamp(…, 0, 6.94)`；电量 / 里程 / 订单进度按 SPEC 8.3；`orderTarget` 到达后 `orders+1` 并发 `order:delivered`，下一单 200~400 随机。
- **rig**：车轮 `rotation.z -= speed/0.20*dt`；`steerPivot.rotation.y = steer*0.35`；`bodyLean.rotation.x = -steer*0.1*min(speed/3,1)`；转向灯 380ms 周期，每次切换发 `signal:tick`；箱盖 tween 到 1.22 rad（≈70°）；油门 >0.05 收脚撑（`rotation.x → +1.15`），停稳放下。
- **视角**：1.2s tween 同时插值 `camera.position` 与 `controls.target`，过渡期间 `controls.enabled = false`；`drive` 自动开 X 光（透明 0.12 / depthWrite false / 内部发光 / 线束虚线偏移随油门），其他视角还原；`inspect` 开标签与点击拾取，结束才允许 OrbitControls。
- **拆解**：`layerStart = (4-layer)*0.15`、`local = clamp((t-layerStart)/0.4)`、`easeInOutCubic`；`userData.home` 记录原始位置；检视视角按整体包围盒自动拉远（`dist = radius / tan(fov/2) * 1.12`），`t=0` 精确回到 home。
- **剖视**：`Plane(0,0,-1)` 只加到外壳材质（`shellMaterials` + 场景侧识别出的透明贴片），constant 0.6→0（0.55s），不做封盖。外壳件 `side = DoubleSide`（要看到内壁），**贴花件单独保持 `FrontSide`**——双面渲染会让远侧贴花从背面透出来，变成反字重影。
- **车贴归属**：模型返回的 `shellMaterials` 只含实体材质，车贴 / 贴纸（`PlaneGeometry` + `transparent` + `map`）不在其中。场景在挂接时把这类贴片材质并入外壳材质组，否则 X 光下贴花会悬空、剖视时贴花不被裁掉。
- **高亮**：`outlinePass.selectedObjects = [part.object]`，点击拾取、导览（`tour:step`）与外部 `part:focus` 事件都汇聚到 `focusPart()` / `tourGo()`。
- **内部件揭示**：导览 / 拾取聚焦到 `internal` 零件（电池组、轮毂电机、控制器、线束、车架）时，外壳材质快照后置为 `opacity 0.18 / transparent / depthWrite false`，同时把 `outlinePass.hiddenEdgeColor` 临时改成美团黄。原因：OutlinePass 的深度预渲染用 `scene.overrideMaterial = MeshDepthMaterial`，外壳的 `depthWrite = false` 对它无效，内部件描边会被判成「隐藏边缘」而几乎不可见；隐藏边缘也涂成美团黄后描边才能透过半透明外壳看见。失焦 / 切视角 / 开 X 光时按快照精确还原。
- **标签碰撞避让**：`labels.update(camera)` 把每个标签的锚点投影到屏幕空间，按 y 排序后贪心地把相互重叠（矩形相交 + 8px 水平 / 4px 垂直间隙）的标签向下推，单标签最多推 90px；推量再按相机距离换算成世界位移叠加到 CSS2DObject 上，保证屏幕上的间距准确。
- **窄幅构图**：`BASE_ASPECT = 1440/900`（验收视口）。`aspectScale() = max(1, BASE_ASPECT / camera.aspect)`，`flyTo` 的目标机位偏移、`updateRideCamera` 的跟随偏移、`fitCameraToExplode` 的距离都乘上它；`resize()` 里 `refitAspect()` 按新比例等比调整当前相机距离。等比或更宽的画幅 scale 恒为 1，横屏构图完全不变。

## 自测结果（Playwright + swiftshader）

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

### 阶段3 验收修复轮（V5 / V7 / V8 / V9 / V11 / V12 + 路灯光斑）

重截 8 个受影响视角 + 4 个 V12 视角，**控制台 0 报错**：

| 项 | 结果 |
|---|---|
| V5 车身黄 | 受光面实测 `ride_idle #fbc405`、`sound #f9c206`、`inspect_side #f8c205`、`inspect_front34 #f0bc08`、`tour_step3 #f9c205`、`cutaway / drive_xray #fbc405`、`explode_100 #eeba08`，蓝通道 5~9（原 79~194）。**注意**：取色来自整张 PNG（含 DOM 面板像素，按钮本身就用 `#FBC405`），数值受此污染，仅作相对比较。 |
| V7 内部件描边 | 隐藏标签单截一张（`tour_step3`）确认：外壳 ghost（opacity 0.18）后内部车架 / 青色电芯 / 控制器可见，**轮毂电机外圈有清晰的美团黄描边**。半透明揭示继续保留（建模 V1/V3/V4/V6 后侧裙下缘抬到 y=0.30，后轮可见，但轮毂电机仍藏在轮内/外壳里，不揭示依旧看不到描边）。 |
| V8 标签重叠 | `inspect_side` / `inspect_front34` 18 个标签全部展开，无文字互相遮挡。 |
| V9 贴花镜像 | `cutaway` / `drive_xray` 中美团外卖贴花无反字重影。 |
| V11 前轮贴地 | 主 Agent 改 `config.js`（`b07d921`）后重截 `explode_100`：18 个零件全部离地，前轮悬在右侧。 |
| V12 窄幅构图 | `v12_ride_390` / `v12_inspect_390` 整车完整在画面内；`v12_ride_1440` / `v12_inspect_1440` 与 `ride_idle` / `inspect_front34` 构图一致（缩放系数恒为 1）。 |
| 路灯光斑 | 390 骑行视角 right 侧的大白斑定位为路灯灯头（相机拉远到 12.76m 后距灯头仅 3.3m，占屏宽 35%）过曝。加入按占屏比例缩没后：390 下该灯 `scale = 0.001`（raycast 不再命中灯头），1440 下 20 盏灯 `scale` 全为 1（构图无变化）。 |

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
| 窄幅构图（V12） | `qa/shots/v12_ride_390.png` / `v12_inspect_390.png` / `v12_ride_1440.png` / `v12_inspect_1440.png` / `mobile_390.png` |

## 已知问题

1. **软渲染下动画被时间稀释**：主循环 `dt = min(clock.getDelta(), 0.05)`，swiftshader 只有 ~2fps，一切 tween / 淡出在截图环境里被放慢约 8 倍；真实浏览器 60fps 下正常。截图脚本因此按「状态收敛」等待而不是固定 sleep。
2. **骑行视角相机每帧重写**：`updateRideCamera()` 每帧 set 相机位置（含抖动）。`rig.transitioning` 为真时该调用被抑制，因此从其它视角切回骑行时 1.2s 的 `flyTo` 能完整播完，结束后抖动立即接管——切换瞬间不会有抖动穿插，属预期。
3. **标签避让只沿竖直方向**：检视视角 18 个标签同时显示，避让把重叠的标签向下推（上限 90px）。零件极密集时仍可能轻微相碰，但文字不再互相遮挡；被推开的标签与零件之间没有引线，靠位置邻近判断归属。
4. **声音视角闪光为整体零件闪光**：一次事件闪光该零件所有网格（如整个车把），不是单个按钮；SPEC 只要求「发声零件同步闪光」，已满足。
5. **`?explode=` 与视角切换的 tween 竞争**：URL 同时带 `view` 与 `explode` 时，自动拉远会取消未结束的视角 tween（已在 `fitCameraToExplode` 中 `kill(camTween)`），最终停在包围盒适配位而不是视角机位——这是有意选择，保证 100% 拆解时所有零件在画面内。
6. **道路在 `drive` / `sound` 视角仍可能残留极淡的影子**：交叉淡出末尾 `mix < 0.02` 才隐藏，数学上不会完全为 0；实际帧率下不可见。
7. **100% 拆解前轮贴地（已由主 Agent 修复）**：`b07d921` 调整 `EXPLODE_DIR` / `EXPLODE_DIST`（前轮 `(0.95,0.31,0)`×0.95、后轮 `(-0.95,0.31,0)`×0.45、轮毂电机沿轴向 ×0.42、脚踏板 ×0.36），18 个零件包围盒 minY > 0。`explode.js` 直接读这两个常量，场景侧无需改动，`explode_100` 已复核。
8. **SPEC 8.2 参数偏差（验收已接受，主 Agent 会改 SPEC）**：`environmentIntensity 0.6 → 0.3`、`UnrealBloomPass threshold 0.85 → 1.0`（外加 strength 0.35、其余灯光整体降档）。原值会让车身黄去饱和成奶油白（V5），留档见 `notes/requests.md`。协调者已确认这三个值是正确落地值，不再改回。
9. **近相机路灯缩没是整体缩放**：`road.js` 的缩没把灯柱和灯头一起缩（`scale → 0`），因此灯在接近相机的过程中是「整体变小消失」而不是只灭灯头；占屏比例 15%~32% 之间为渐变区。正常骑行速度下该过渡发生在路灯掠过镜头的瞬间，不易察觉。
10. **窄幅拉远后车辆占比偏小**：`aspectScale()` 让窄画幅的水平视场与 1440×900 完全一致（缩放系数 = `1.6 / aspect`，390×844 时为 3.46），所以车在窄屏上占宽的比例与横屏相同（约 38%），纵向则因画幅窄而显得小。这是「整车完整在画面内」优先于「占屏比」的有意取舍；若要窄屏更大，需要牺牲水平余量或提高 FOV。
11. **内部件揭示是临时外壳状态**：`setShellReveal` 用快照还原，但若在揭示期间切到 `drive`（X 光），`setXray` 会先关掉揭示再应用 X 光快照，避免两套半透明参数互相覆盖。
12. `favicon.ico` 404 与场景无关（本地服务未提供图标），主页面无报错。
