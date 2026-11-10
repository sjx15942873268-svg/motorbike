# THE RIDER No. 01 — 冻结契约（SPEC）

> 本文件是项目唯一契约。任何 Agent 不得私自修改。发现缺陷写到 `notes/requests.md`，由主 Agent 统一处理。
> 版本：v1.0（阶段0冻结）

## 0. 读图结论（来自 reference.png）

- 车型：复古踏板车（Vespa 式），车头朝右，镜头在右后方偏侧
- 车身主色：**美团黄 #FBC405**（参考图取色校准，非 #FFD100），亮面烤漆
- 前护板：竖直弧形板，顶部有黑色塑料包边，上接车把立管
- 脚踏板：低平，黑色防滑面
- 后部侧裙：饱满鼓包，两侧各一块**黑色椭圆贴花**，贴花内黄色袋鼠标识 + "美团外卖" + "送啥都快"
- 座垫：黑色长条，覆盖侧裙上方
- 车把：黑色，两端黑色握把，中央圆形大灯（黑色灯碗）
- 前挡泥板：黄色，包住前轮上半部
- 后货架：镀铬弯管，上驮**黑色方形外卖箱**，箱面黄色描边框 + 袋鼠标识 + "美团外卖"
- 车轮：小轮径，黑轮胎，银色轮毂盖（5 辐）
- 车尾：牌照板 + 尾灯

## 1. 坐标系

- 单位米；Y 轴向上；车头朝 **+X**；**+Z 是车辆左侧**
- 原点在地面，位于前后轴中点正下方
- 车轮绕 Z 轴旋转；前进时 `wheel.rotation.z -= speed / radius * dt`
- TorusGeometry 默认在 XY 平面、轴线为 Z，可直接做轮胎
- CylinderGeometry 默认轴线为 Y，做轮毂要 `rotation.x = Math.PI / 2`
- 剖视相机从 +Z 一侧看，剖切掉 z>0 的一半

## 2. 尺寸表（单位米，偏差不超过 15%）

| 部位 | 数值 |
|---|---|
| 轴距 | 1.24（前轴 x=+0.62，后轴 x=-0.62） |
| 车轮半径 | 0.20，胎宽 0.09，银色轮毂盖半径 0.12 |
| 车身总长 | 1.80（x 从 -0.95 到 +0.85） |
| 前护板 | 顶部高 1.00，宽 0.42，位于 x≈+0.48 |
| 脚踏板 | 高 0.28，x 从 -0.05 到 +0.45，宽 0.34 |
| 后部侧裙 | 中心 x=-0.45 y=0.50，长 0.75，高 0.40，最宽 0.56 |
| 座垫 | 顶面高 0.80，x 从 -0.70 到 -0.05，宽 0.30 |
| 车把 | 高 1.10，宽 0.68，位于 x=+0.52 |
| 后货架 | 高 0.82，x 从 -0.95 到 -0.55 |
| 外卖箱 | 长0.46 宽0.44 高0.40，底面 y=0.86，中心 x≈-0.75 |
| 尾灯 | x=-0.95，y=0.60 |

## 3. 配色与材质

| 用途 | 颜色与材质 |
|---|---|
| 车身漆 | #FBC405，MeshPhysicalMaterial，clearcoat 1，clearcoatRoughness 0.08，roughness 0.35 |
| 亮面黑件 | #111111，roughness 0.35 |
| 座垫 | #1A1A1A，roughness 0.85 |
| 镀铬件 | #DDDDDD，metalness 1，roughness 0.15 |
| 轮毂盖 | #C8CCD0，metalness 0.8，roughness 0.3 |
| 轮胎 | #1B1B1B，roughness 0.9 |
| 内部件 | 电池壳 #2B2F36，电芯青色 #2FB5A5，电机线圈铜色 #B87333 |
| 界面 | 背景 #0B0B0C，面板 rgba(20,20,22,0.72) + 背景模糊，强调色美团黄，正文 #EDEDED，次要 #8A8A8A |

## 4. 全局状态（src/core/state.js）

```js
export const state = {
  input:  { throttle: 0, brake: 0, steer: 0 },       // 0..1, 0..1, -1..1，界面Agent写，sim读
  ride:   { speed: 0, battery: 1, odometer: 0,
            orderTarget: 300, orderProgress: 0, orders: 0, rideSeconds: 0 },
  lights: { head: false, brake: false, left: false, right: false },
  box:    { open: false },
  kickstand: true,
  view: 'ride',            // 'ride' | 'drive' | 'inspect' | 'sound'
  explode: 0,              // 0..1
  cutaway: false,
  xray: false,
  tour:  { active: false, step: 0, auto: false },
  focusPart: null,         // 零件id
  audio: { unlocked: false, muted: false },
};
```

## 5. 事件总线（src/core/bus.js）

基于 EventTarget，`emit(name, detail)` 和 `on(name, fn)`。

| 事件 | detail | 发出方 | 监听方 |
|---|---|---|---|
| view:change | { view } | 界面 | 场景、音频 |
| explode:change | { t } | 界面 | 场景 |
| cutaway:change | { on } | 界面 | 场景 |
| light:toggle | { which } | 界面 | 场景、音频 |
| horn | 无 | 界面 | 音频、场景（车把轻抖） |
| box:toggle | 无 | 界面 | 场景、音频 |
| signal:tick | { side, on } | 场景（转向灯闪烁节拍） | 音频 |
| order:delivered | { orders } | sim | 音频、界面、存储 |
| part:focus | { id } | 界面或场景（点击拾取） | 场景、界面 |
| tour:step | { step } | 界面 | 场景 |
| audio:unlock | 无 | 界面（首次交互） | 音频 |
| app:ready | 无 | 主Agent | 全部 |

## 6. 车辆模型接口（src/model/index.js）

```js
export function buildScooter() {
  return {
    root,          // THREE.Group，整车
    parts,         // Array<PartDef>
    rig: {
      frontWheel, rearWheel,        // 绕Z转
      steerPivot,                    // 车把+前叉+前轮的转向枢轴，绕Y转
      bodyLean,                      // 车身侧倾枢轴，绕X转
      boxLid,                        // 箱盖，绕后沿铰链转
      kickstand,
      lightMats: { head, tail, brake, signalL, signalR },  // 发光材质，改 emissiveIntensity
      headSpot,                      // SpotLight，挂在大灯上
      harnessPath,                   // THREE.CatmullRomCurve3，电池到控制器到电机
    },
    shellMaterials,  // 外壳材质数组，用于X光和剖视
  };
}

// PartDef
// { id, nameZh, desc, object, layer, explodeDir, explodeDist, internal, labelAnchor }
```

### 零件ID表

| id | 中文名 | layer | internal |
|---|---|---|---|
| frame | 车架 | 0 | 是 |
| battery | 电池组 | 1 | 是 |
| controller | 控制器 | 1 | 是 |
| harness | 线束 | 1 | 是 |
| hubMotor | 后轮毂电机 | 2 | 是 |
| legShield | 前护板 | 3 | 否 |
| floorboard | 脚踏板 | 3 | 否 |
| sideCowlL | 左侧裙 | 3 | 否 |
| sideCowlR | 右侧裙 | 3 | 否 |
| frontFender | 前挡泥板 | 3 | 否 |
| seat | 座垫 | 4 | 否 |
| handlebar | 车把与大灯 | 4 | 否 |
| frontFork | 前叉 | 4 | 否 |
| frontWheel | 前轮 | 4 | 否 |
| rearWheel | 后轮 | 4 | 否 |
| rearRack | 后货架 | 4 | 否 |
| deliveryBox | 外卖箱 | 4 | 否 |
| tailLight | 尾灯与牌照 | 4 | 否 |

### 拆解规则

layer 数字越大越在外层、越先移动。`explodeDir` 默认取零件包围盒中心减整车中心再归一化，以下手动指定：
- 外卖箱、座垫：向上 (+Y)
- 前轮：+X；后轮：-X
- 左侧裙：+Z；右侧裙：-Z
- 电池：-Y 再 +Z
- `explodeDist` 默认 0.35，外侧大件（外卖箱、座垫、侧裙、车轮）用 0.5

## 7. 调试接口（src/main.js）

```js
window.__app = { ready: false, state, setView, setExplode, setCutaway, setXray, tourGo, debugSetSpeed };
```

URL 参数：
- `?debug=1` 显示坐标轴和包围盒
- `?solo=model` 只渲染车辆加转台
- `?solo=audio` 只显示一排音效测试按钮
- `?view=ride|drive|inspect|sound`
- `?explode=0..1`
- `?cutaway=1`
- `?xray=1`
- `?tour=0..4`

## 8. 实现要点

### 8.1 建模

| 零件 | 方法 |
|---|---|
| 前护板、脚踏板、前挡泥板 | 2D 侧视轮廓 Shape + ExtrudeGeometry（参数名是 `depth` 不是 `amount`） |
| 后部侧裙鼓包 | SphereGeometry/CapsuleGeometry 非均匀缩放，再和侧视轮廓挤出体组合；左右镜像 |
| 座垫 | RoundedBoxGeometry，顶面略压扁 |
| 车把、立管、后货架、车架 | TubeGeometry 沿 CatmullRomCurve3 |
| 车轮 | TorusGeometry 轮胎 + CylinderGeometry 轮毂盖 + 细 Box 辐条 |
| 大灯、尾灯、转向灯 | LatheGeometry 或 Sphere + 发光材质 |
| 外卖箱 | RoundedBoxGeometry 箱体 + 独立箱盖，黄色描边用细长 Box 贴面 |
| 电池电芯、电机线圈 | InstancedMesh |

贴花：
1. CanvasTexture 画黑色椭圆底 + 黄色袋鼠剪影 + "美团外卖" "送啥都快"，贴到侧裙和外卖箱
2. 绘制前 `await document.fonts.ready`，字体栈 `'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif`
3. `texture.colorSpace = THREE.SRGBColorSpace`，`anisotropy = renderer.capabilities.getMaxAnisotropy()`
4. 贴花网格离车身表面 1~2mm，材质开 `polygonOffset`
5. `assets/logo-kangaroo.png` 有官方图就用，否则代码画简化剪影；不像就只放文字

工作顺序：先灰模后精模。第一轮所有零件用简单几何体放到尺寸表位置，截图确认比例和位置正确后再逐个细化。

### 8.2 渲染、灯光与环境

1. 渲染器：`antialias: true`，`setPixelRatio(Math.min(devicePixelRatio, 2))`，`toneMapping = ACESFilmicToneMapping`，`toneMappingExposure = 1.0`，开阴影，`localClippingEnabled = true`
2. 环境反射：`PMREMGenerator.fromScene(new RoomEnvironment(), 0.04).texture` → `scene.environment`，`environmentIntensity = 0.3`
3. 灯光：暖色主光 DirectionalLight 2.2 投影（shadow map 2048）；车后方美团黄轮廓光 1.5；HemisphereLight 0.3；冷色补光 0.35；大灯 SpotLight 挂车头
4. 后期链：RenderPass → OutlinePass（描边色美团黄）→ UnrealBloomPass（strength 0.35、radius 0.4、threshold 1.0，只让真正过曝的高光起辉）→ **OutputPass（必须最后）**
5. 背景：深色渐变 + Fog，地面用接收阴影的平面

### 8.3 骑行与跑单（src/sim/ride.js）

车辆不动，世界向后移动：
- 路面：大平面 + CanvasTexture（沥青 + 车道虚线），`wrapS = RepeatWrapping`，每帧 `offset.x += speed * dt / 贴图长度`
- 路灯、路沿：InstancedMesh，x 每帧减 `speed * dt`，超出 -40 就加 80 循环
- 骑行视角显示道路和路灯，其他视角淡出道路，换成圆形展台地面

简化物理（`dt = Math.min(Clock.getDelta(), 0.05)`）：
```
accel = throttle * 3.0
drag  = 0.4 + 0.02 * speed^2
speed = clamp(speed + (accel - drag - brake * 6) * dt, 0, 6.94)   // 6.94 m/s = 25 km/h
battery -= throttle * speed * dt * 0.00004
odometer += speed * dt；orderProgress 同步累加，达到 orderTarget 时 orders+1，发 order:delivered，
下一单目标随机 200~400 米
```

rig 动画：车轮按速度转；`steerPivot.rotation.y = steer * 0.35`；`bodyLean.rotation.x = -steer * 0.1 * min(speed/3, 1)`；刹车时 `lights.brake = true` 尾灯变亮；转向灯 380ms 周期闪烁，每次切换发 `signal:tick`；箱盖开合用 tween 转约 70 度；按油门自动收起脚撑。

骑行镜头：追尾视角，相机偏移约 (-3.2, 1.6, 1.6) 看向 (0, 0.7, 0)；FOV 随速度 45→52；高速轻微抖动。

### 8.4 视角

| 视角 | 相机 | 场景状态 |
|---|---|---|
| 骑行 ride | 追尾跟随 | 道路开，X光关，热点关 |
| 电驱 drive | 正侧面近景 | X光开：外壳透明度 0.12、depthWrite false；内部件发光；线束 TubeGeometry 加虚线贴图，offset 随油门流动 |
| 检视 inspect | OrbitControls 自由旋转，限制俯仰和缩放 | 展台地面，热点标签开，点击拾取零件 |
| 声音 sound | 右前方 3/4 固定 | 底部显示波形和频谱，发声零件同步闪光 |

切换用 tween 1.2 秒同时插值相机位置和 controls.target，过渡期间禁用 OrbitControls。X光切换前快照材质原始参数，退出时还原。

### 8.5 拆解、剖视与高亮

拆解：每个零件记录 `userData.home`。全局进度 t 映射到每层局部进度，外层先动：
```
layerStart = (4 - layer) * 0.15；local = clamp((t - layerStart) / 0.4, 0, 1)
position = home + explodeDir * explodeDist * easeInOutCubic(local)
```
检视视角下拆解时相机按整体包围盒自动拉远，保证 100% 时所有零件都在画面内。

剖视：`new THREE.Plane(new THREE.Vector3(0, 0, -1), constant)`，只加到 `shellMaterials` 的 `clippingPlanes`，内部件不剖；constant 从 0.6 动画到 0；外壳材质 `side = DoubleSide`；不做截面封盖。

高亮：OutlinePass 的 `selectedObjects = [part.object]`；导览和点击零件都走这条路径。

### 8.6 音效（src/audio/）

全部 Web Audio 实时合成，挂 master GainNode + AnalyserNode：

| 声音 | 合成方式 |
|---|---|
| 电机啸叫 | 锯齿波 + 2 倍频正弦，频率 120 + speed*18 Hz，低通，音量 0.02 + throttle*0.08，持续发声随状态变化 |
| 轮胎滚动 | 粉噪声经低通，音量正比于速度 |
| 喇叭 | 两个方波 420Hz + 520Hz，低通 2kHz，"嘀嘀"两声 |
| 转向继电器 | 15ms 噪声脉冲经 3kHz 带通，随 signal:tick 触发 |
| 刹车 | 高速刹车时短促带通噪声 |
| 外卖箱开合 | 低频短促闷响 |
| 送达提示 | 正弦 1320Hz + 1760Hz，指数衰减，"叮咚" |

浏览器自动播放限制：AudioContext 在首次点击或按键时 `resume()`，界面提示"点击任意处开启声音"。参数变化用 `setTargetAtTime`。

导出接口：`initAudio()`、`getAnalyser()`、`setMuted(bool)`，其余通过 bus 和 state 驱动。

### 8.7 界面

布局：
- 左上：标题、副标题、标语（中英双语）
- 左下：CONTROL DESK 面板，可收起。分组：机械（拆解滑块 + 百分比、剖视按钮）、视角（骑行、电驱、检视、声音）、骑行（大灯、左转、右转、喇叭、开箱）、记录（重置今日、导出海报、清空）、导览（开始导览）
- 面板底部状态行：`0 km/h  电量 100%  0.0 km  今日 0 单`
- 右下：圆形速度表（Canvas 或 SVG）、跑单进度条、当前订单卡片
- 检视视角：CSS2DRenderer 热点标签；点击零件弹信息卡（名称 + 一句说明）
- 导览：底部居中卡片，第几步、零件名、说明，上一步 / 下一步 / 自动播放
- 移动端（P2）：屏幕左右下角加油门、刹车按钮，pointer 事件

键位：

| 按键 | 功能 |
|---|---|
| W / ↑ | 加速 |
| S / ↓ | 刹车 |
| A D / ← → | 转向 |
| Q / E | 左 / 右转向灯 |
| H | 喇叭 |
| L | 大灯 |
| F | 开合外卖箱 |
| X | 剖视 |
| 1~4 | 切换视角 |

焦点在输入控件上时不处理快捷键；空格和方向键 `preventDefault`。

样式：深色玻璃面板，细边框，美团黄强调色，数字等宽字体。

导览文案（5 步）：
1. 车身：复古踏板造型，前护板挡风挡泥，低平脚踏板方便骑手上下车。
2. 电池组：多节锂电芯串并联组成，藏在脚踏板和座垫下方，决定续航。
3. 轮毂电机：电机直接装在后轮里，没有链条，安静、少维护。
4. 控制器：把拧把信号换算成电流，决定电机出多少力，刹车时切断动力。
5. 外卖箱：固定在后货架上，保温层让餐品在路上保持温度，箱盖可开合。

### 8.8 本地记录与导出

- localStorage 键名 `rider01.log`，内容 `{ odometer, orders, rideSeconds, history: [{ date, km, orders }] }`，每 5 秒和每次送达保存
- 读写都包 try/catch，失败时只存内存，界面不报错
- 导出海报：同一帧内先 `composer.render()` 再 `renderer.domElement.toDataURL()`，画到 1080x1350 的 2D Canvas，叠加标题和今日数据，a 标签 download 为 `rider-01.png`

## 9. 集成契约（main.js 已依赖，禁止改动签名）

`main.js` 由主 Agent 维护，已实现如下调用，各模块必须满足：

```js
// scene
const scene = createScene(canvas);
scene.scene            // THREE.Scene
scene.renderer         // THREE.WebGLRenderer
scene.setView(view)    // 'ride'|'drive'|'inspect'|'sound'
scene.setExplode(t)    // 0..1
scene.setCutaway(on)
scene.setXray(on)
scene.focusPart(id|null)
scene.tourGo(step)     // 0..4
scene.setDebug(on)
scene.update(dt)       // 每帧
scene.renderOnly()     // 立即渲染一帧（给截图用）
scene.captureFrame()   // composer.render() 后返回 renderer.domElement.toDataURL()
scene.domElement

// sim
const sim = createSim({ scene, scooter })   // 入参可选，自行决定
sim.update(dt)

// audio
initAudio()            // 首次交互调用，返回 bool
getAnalyser()          // AnalyserNode | null
setMuted(bool)
updateAudio(dt)        // 每帧
createAudioTestPanel() // 返回 HTMLElement，仅 ?solo=audio 使用

// ui
const ui = createUI({ setView })
ui.update(dt)
ui.drawSpeedo(speedKmh, battery)

// storage
loadLog()              // { odometer, orders, rideSeconds, history }
saveLog(log)
recordSnapshot()       // 读 state 写盘
resetToday()
clearAll()

// export
exportPoster(dataUrl, state)   // 纯函数，dataUrl 来自 scene.captureFrame()
```

`?solo=model` 时 main.js 只渲染车辆加转台，隐藏全部 UI；`?solo=audio` 时只挂 `createAudioTestPanel()`。

## 10. three.js 0.170 注意事项

- 已移除：`outputEncoding`、`sRGBEncoding`、`Geometry`、`mergeBufferGeometries`（改名 `mergeGeometries`）、ExtrudeGeometry 的 `amount`（改 `depth`）、`useLegacyLights`
- 点光源/聚光灯强度按物理单位设置，比旧教程大一个数量级
- importmap 锁 0.170.0，不升级
