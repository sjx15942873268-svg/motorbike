# 音频 Agent 交接（阶段1）

## 改动文件

| 文件 | 说明 |
|---|---|
| `src/audio/index.js` | 对外契约，仅 re-export（签名未动） |
| `src/audio/engine.js` | AudioContext / master GainNode / AnalyserNode / 持续发声体 / 总线接线 |
| `src/audio/synth.js` | 噪声 buffer 生成 + 一次性音效合成原语 |
| `src/audio/panel.js` | `?solo=audio` 测试面板（8 个按钮） |

未改动 `docs/SPEC.md`、`src/main.js`、`styles/main.css` 及任何其他目录。

## 导出接口（与 main.js 契约一致）

```js
export function initAudio()            // 首次交互调用，返回 bool（是否成功创建/解锁）
export function getAnalyser()          // AnalyserNode | null（未解锁时为 null）
export function setMuted(bool)
export function updateAudio(dt)        // 每帧调用
export function createAudioTestPanel() // HTMLElement，仅 ?solo=audio 挂到 #labels
```

额外导出（panel 内部使用，不影响契约）：`testMotor/testTire/testHorn/testSignal/testBrake/testBox/testChime/toggleMuted`。

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

## 自测结果（Playwright + 系统 Chrome，`?solo=audio`）

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
