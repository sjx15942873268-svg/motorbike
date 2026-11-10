# 音频 Agent 交接（阶段1 + 阶段3 V2）

## 改动文件

| 文件 | 说明 |
|---|---|
| `src/audio/index.js` | 对外契约，仅 re-export（原有签名未动，新增 `createSoundViz`） |
| `src/audio/engine.js` | AudioContext / master GainNode / AnalyserNode / 持续发声体 / 总线接线 |
| `src/audio/synth.js` | 噪声 buffer 生成 + 一次性音效合成原语 |
| `src/audio/panel.js` | `?solo=audio` 测试面板（8 个按钮） |
| `src/audio/viz.js` | **阶段3 新增**：声音视角波形 + 频谱Canvas 可视化 |

未改动 `docs/SPEC.md`、`src/main.js`、`styles/main.css`、`index.html` 及音频外任何目录。

## 导出接口（与 main.js 契约一致）

```js
export function initAudio()            // 首次交互调用，返回 bool（是否成功创建/解锁）
export function getAnalyser()          // AnalyserNode | null（未解锁时为 null）
export function setMuted(bool)
export function updateAudio(dt)        // 每帧调用
export function createAudioTestPanel() // HTMLElement，仅 ?solo=audio 挂到 #labels
export function createSoundViz(canvas) // 阶段3 新增，返回 { update(dt) }
```

额外导出（panel 内部使用，不影响契约）：`testMotor/testTire/testHorn/testSignal/testBrake/testBox/testChime/toggleMuted`。

## createSoundViz（阶段3 新增，V2 验收项）

```js
const viz = createSoundViz(document.getElementById('viz-cv'));
viz.update(dt);   // 每帧调用
```

- 只读 `getAnalyser()`，不碰音频图；未解锁（null）时画静态平线 + 低幅噪点 + `STANDBY`，不报错。
- 布局按 `#viz-cv` 实际 CSS 尺寸（520×120，最大 80vw）：上半波形、下半频谱，中间细分隔线；
  自适应 `clientWidth/clientHeight` 与 `devicePixelRatio`（隐藏时 clientWidth=0 直接跳过）。
- 波形：`getByteTimeDomainData()`，先描边（美团黄 0.9）再向下闭合填 10% 透明黄；
  峰值偏小时温和自动增益（上限 12 倍，近静音不放大），否则低音量下波形几乎成一条线。
- 频谱：`getByteFrequencyData()`，对数分箱 40Hz ~ min(10kHz, 奈奎斯特)，柱数 24~72 按宽度自适应，
  快攻慢放平滑；柱体 22% 透明黄 + 顶部 1.5px 亮线。
- 颜色统一 `rgba(251,196,5,α)`，与项目「深色玻璃 + 美团黄」一致；面板背景由 CSS 提供，画布透明。

## 音频图

```
各源 → master GainNode → AnalyserNode(fftSize 2048) → destination
```

- 未解锁前所有函数安全空跑：`getAnalyser()` 返回 `null`，`setMuted/updateAudio` 只写标志位。
- `initAudio()` 在首次 pointerdown/keydown（main.js 绑定）里创建并 `resume()`；重复调用直接返回 true。
- 监听 `audio:unlock`，若 context 仍 suspended 则再次 `resume()`。
- 所有参数变化走 `setTargetAtTime`（电机频率/增益 tau≈0.05~0.08s，静音 tau=0.02s），无爆音。

## 合成实现（对应 SPEC 8.6）

| 声音 | 实现 |
|---|---|
| 电机啸叫 | sawtooth + 2 倍频 sine（增益 0.5），低通；频率 `120 + speed*18` Hz，音量 `0.02 + throttle*0.08`，滤波截止随油门/速度 |
| 轮胎滚动 | 预生成 2s 粉噪声（Paul Kellet）循环 → 低通，音量 `min(speed/6.94,1)*0.16` |
| 喇叭 | 方波 420Hz + 520Hz → 低通 2kHz，两声“嘀嘀”（0.16s + 0.18s，间隔 0.24s） |
| 转向继电器 | 15ms 白噪声脉冲 → 3kHz 带通（Q=8），`signal:tick` 且 `on` 时触发 |
| 刹车 | 白噪声 → 1.4kHz 带通，0.16s；**沿触发**（brake 0.25 上升沿且 speed>2），冷却 0.5s |
| 外卖箱开合 | 正弦 150→55Hz 下滑 + 低通噪声，0.18s 闷响 |
| 送达提示 | 正弦 1320Hz（0.5s）→ 1760Hz（0.7s），指数衰减，各带 0.25 增益二次谐波 |
| 灯光开关 | 2.4kHz 带通白噪声 30ms 轻响（spec 表未列，但 `light:toggle` 由音频监听） |

总线接线：`light:toggle`、`horn`、`box:toggle`、`signal:tick`、`order:delivered`、`audio:unlock`。
持续音读 `state.ride.speed` / `state.input.throttle` / `state.input.brake` / `state.audio.muted`。

## 自测结果（Playwright + 系统 Chrome，swiftshader 软渲染）

### 阶段3（V2 声音可视化，`?view=sound`，1440×900）

模拟 main.js 将接的线（`createSoundViz` + 去掉 `#sound-viz` 的 hidden + 每帧 `update(dt)`）：

| 用例 | 结果 |
|---|---|
| 声音视角 + 真实点击解锁 + 油门/速度驱动 | `unlocked=true`、analyser 存在；画布 518×118，着非背景像素 10739、美团黄像素 8659；截图 `/tmp/viz-sound-live.png` 可见波形起伏 + 频谱柱 |
| 非声音视角（`/`） | `#sound-viz` class 仍为 `hidden`、`computed display:none`，无误显示；零报错 |
| 声音视角不点击（未解锁） | analyser 为 null、**零报错**，画布仍画出静态平线 + 低幅噪柱 + `STANDBY`（4380 像素）；截图 `/tmp/viz-sound-locked.png` |

三个用例控制台 / pageerror 均为空。

### 阶段1（`?solo=audio`）

- 面板 8 个按钮渲染正常（截图 `/tmp/audio-final.png`）。
- 未解锁前调用 `getAnalyser/setMuted/updateAudio` 均不抛错，`getAnalyser()` 为 null。
- 首次真实点击后 `state.audio.unlocked=true`、analyser 存在（fftSize 2048）、提示隐藏。
- 电机/轮胎按钮触发后频谱有能量（峰值 ~110~160）；`state` 驱动 speed=5/throttle=0.8 时频谱峰值 ~160。
- 电机音高跟踪：speed 0 / 3 / 6.9 → 实测峰值频率 129 / 172 / 237 Hz，与公式 120/174/244 Hz 相差 ≤1 个 FFT bin（23.4Hz）。
- 总线事件 `horn/box:toggle/light:toggle/signal:tick/order:delivered` 直接 emit 均不抛错。
- 静音：`state.audio.muted` 切换正常；直接读取 master gain 确认静音后为 0。
- 主页面（无 solo）加载 3.5s 控制台零报错。

## 已知问题

1. **AnalyserNode 频谱平滑延迟**：`smoothingTimeConstant=0.85` 下，静音后频谱读数衰减很慢。已直接验证 master gain 确实为 0，属正常平滑特性；真实浏览器有音频输出设备时渲染频率正常，衰减很快。
2. **headless 下音频时钟可能快于墙钟**：`?solo=audio` 面板“电机/轮胎”1.6s 试听在无头环境可能短于 1.6s 墙钟，仅影响无头试听，不影响真实浏览器。
3. **idle 电机底噪**：解锁后即使 speed=0 也有 0.02 增益的 120Hz 啸叫底噪（spec 公式即如此），检视/听音视角下持续可闻。
4. **favicon 404**：`?solo=audio` 页面控制台有两条 `/favicon.ico` 404，与音频无关（本地服务未提供图标）；主页面无报错。
5. 转向继电器只在 `signal:tick` 的 `on=true` 时响（避免一个闪烁周期响两次）。
6. **无头软渲染下视角 tween 墙钟被拉长**：`dt` 钳制 0.05 + 低帧率，1.2s 的视角过渡在 swiftshader 下可能要十几秒，截图前需等 `window.__app.busy()` 为 false（`tools/shoot.mjs` 的 `settle` 已处理）。
7. **并发编辑期发现的场景侧缺陷**：`src/scene/labels.js` 的 `tracks.push` 缺 `el` 导致每帧 `offsetWidth` 报错、`window.__app` 无法赋值（详见 `notes/requests.md`）。音频侧不负责，自测时仅在 Playwright 内临时 patch。

## 需要主 Agent 处理

见 `notes/requests.md` 末尾「音频 Agent → 主 Agent 集成备注（阶段3 V2 声音可视化）」：
main.js 需 import `createSoundViz`、实例化、在 `setView` 里 toggle `#sound-viz`、在 loop 里调 `update(dt)`。
