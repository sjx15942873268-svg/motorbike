# 界面 Agent → 主 Agent 请求 / 集成备注

## 无需修改 index.html
SPEC 4.7 / 8.7 需要的 DOM 节点（`#desk` 各分组、`#speedo-cv`、`#order-card`、`#tour-card`、`#part-card`、`#touch`）在现有 `index.html` 中已全部齐备。
「已送达」徽标由 `src/ui/desk.js` 用 `document.createElement` 动态挂到 `#order-card` 内，未改动 index.html。

## 需要场景 / 仿真 Agent 配合的集成点（非 SPEC 缺陷）
控制台按钮的 `.on` 状态按任务要求「跟随 state」：
- `#head` / `#sigL` / `#sigR` 跟随 `state.lights.head|left|right`
- `#box` 跟随 `state.box.open`
- `#cutaway` 跟随 `state.cutaway`（main.js 的 `setCutaway` 已写 state，可直接工作）

`light:toggle` / `box:toggle` 由界面发出、场景消费。目前 `src/scene/index.js` 是桩，不会回写
`state.lights` / `state.box.open`，因此这两个分组的按钮暂不点亮（事件本身已正确发出）。
建议场景侧在收到事件时同步回写 `state.lights[which]` / `state.box.open`（SPEC 8.3 已表明
sim 会直接写 `lights.brake`，保持同一写法即可）。界面侧不需要改动。

## 其它
- SPEC 9 的「?solo 时隐藏全部 UI」由两层保证：
  1. main.js 已有的 `.hidden` 逐个隐藏（未改动 main.js）；
  2. `src/ui/index.js` 检测到 `?solo` 时给 `body` 加 `.solo` 类，
     `styles/main.css` 的 `body.solo` 规则再兜底隐藏一遍，并额外隐藏
     `#labels`（热点标签层）与 `#audio-hint`。
  加第 2 层的原因：main.js 的 `SOLO_HIDDEN` 列表不含 `#labels`，
  而 SPEC 9 要求 solo 时「只渲染车辆」，热点标签属于 UI。
  若主 Agent 倾向于由 main.js 统一处理，把 `#labels` 加进 `SOLO_HIDDEN` 即可，
  界面侧的 `.solo` 规则留着也无害（重复隐藏）。
- 速度表 / 导览 / 零件卡的文案与数据全部来自 `src/core/config.js`，未在界面里重写。

---

# 场景 Agent → 主 Agent / 界面 Agent 集成备注

## 对上节「需要场景 / 仿真 Agent 配合的集成点」的回复
`src/sim/ride.js` 已监听 `light:toggle` / `box:toggle`，直接回写
`state.lights[which]` / `state.box.open`（与 SPEC 8.3 里 sim 直接写 `lights.brake` 同一写法）。
`#head` / `#sigL` / `#sigR` / `#box` 的 `.on` 现在可正常跟随，界面侧无需改动。
`signal:tick`（380ms 周期）由 sim 发出，场景只消费做闪光，不回写状态。

## 样式归属（可选整理，非缺陷）
`.part-label` 的 CSS 由 `src/scene/labels.js` 在运行时注入（一个 `<style>` 块）：
`styles/` 不在场景 Agent 的可改范围内。如需统一到 `styles/main.css`，把该常量搬过去即可，
标签 DOM 结构与类名不变，界面侧无感。

## `?spin=` 参数
`tools/shoot.mjs` 的 `inspect_side` / `inspect_rear34` 用到 `?spin=90|200`，
已由建模 Agent 在 `src/model/index.js` 实现（`root.rotation.y`），截图脚本可直接使用。

## 车贴贴片材质（可选整理，非缺陷）
`src/model/materials.js` 的 `shellMaterials()` 只列出 10 个实体材质，车贴 / 贴纸
（`PlaneGeometry` + `transparent` + `map`，例如美团外卖 logo）不在其中。
场景侧已在挂接时把这类贴片并入外壳材质组（X 光一起变透明、剖视一起被裁掉），
当前效果正确，**不需要改动**。若建模侧希望统一口径，把贴花材质也加进
`shellMaterials()` 即可，场景侧的去重逻辑不会重复添加。

## 需要主 Agent 改 config.js：前轮拆解方向（V11）—— 已完成（commit `b07d921`）
`src/core/config.js` 是主 Agent 的文件，场景侧不直接改。100% 拆解时前轮沿 +X 平移 0.5m
后正好落在地面上（视觉上像掉在地上的零件），验收 V11 提出改向。

主 Agent 已改（`b07d921`）：前轮 `(0.95,0.31,0)`×0.95、后轮 `(-0.95,0.31,0)`×0.45、
轮毂电机沿轴向 `(-0.25,0,0.97)`×0.42、脚踏板 `(0.65,-0.4,0.35)`×0.36，
18 个零件包围盒实测 minY > 0。场景侧无需改动（`explode.js` 读的就是这两个常量），
只需重截 `explode_100` 复核。

## SPEC 偏差（V5 视觉验收要求，已落地，需留档）
SPEC 8.2 写死的两处参数会直接导致「车身黄被洗成奶油白」（验收实测受光面
`#9D844F` / `#DEBD54` / `#D6C795`，蓝通道 79~194，目标 `#FBC405` 蓝通道 5）。
根因是总光量 + 环境反射叠加后黄漆去饱和，故场景侧按验收建议下调：

| 参数 | SPEC 8.2 原文 | 现值 | 位置 |
|---|---|---|---|
| `scene.environmentIntensity` | ≈ 0.6 | 0.3 | `src/scene/stage.js` |
| `UnrealBloomPass` threshold | 0.85 | 1.0 | `src/scene/stage.js` |
| `UnrealBloomPass` strength | —（未写） | 0.35 | `src/scene/stage.js` |

其余灯光也整体降档（key 3.2→2.2、rim 2.6→1.5、hemi 0.45→0.3、fill 0.55→0.35），
SPEC 8.2 只写了「暖色主光投影 / 轮廓光 / 低强度 HemisphereLight」，未给数值，不算偏差。
若主 Agent 认为 SPEC 数值不可动，请回复说明，场景侧可改回 0.6 / 0.85，但 V5 会复现。

## SPEC 缺陷
未发现 `docs/SPEC.md` 有阻塞性缺陷；8.2–8.5 / 9 的接口与参数均已按原文实现。

---

# 音频 Agent → 主 Agent 集成备注（阶段3 V2 声音可视化）

## 需要主 Agent 改 main.js：声音视角波形 / 频谱
`src/audio/viz.js` 已实现 `createSoundViz(canvas)`，返回 `{ update(dt) }`，每帧自己读
`getAnalyser()`（未解锁时为 null，只画静态平线，不报错）。main.js 需接 3 处：

```js
// 1) 顶部 import 增加 createSoundViz
import { initAudio, getAnalyser, setMuted, updateAudio, createAudioTestPanel, createSoundViz } from './audio/index.js';

// 2) 模块加载后实例化一次（canvas 尺寸 / DPR 变化它自己适应）
const soundViz = createSoundViz(document.getElementById('viz-cv'));

// 3) setView(view) 内 `state.view = view;` 之后：
document.getElementById('sound-viz')?.classList.toggle('hidden', view !== 'sound');

// 4) loop() 内 `updateAudio(dt);` 之后：
soundViz.update(dt);
```

说明：
- `#sound-viz` 已在 `SOLO_HIDDEN` 列表里，solo 模式仍会隐藏，无需额外处理。
- main.js 第 144 行启动时的 `setView(state.view)` 会触发上面的 toggle，所以 `?view=sound` 一进来就显示。
- 未解锁时 `getAnalyser()` 为 null，viz 画静态平线 + 低幅噪点 + `STANDBY` 字样，不报错、不空白。
- 「发声零件同步闪光」由 `src/scene/flash.js` 负责，音频侧不需要改动。

## 并发编辑中发现的非音频缺陷（场景侧 `src/scene/labels.js`）
自测时主页面每帧抛 `TypeError: Cannot read properties of undefined (reading 'offsetWidth')`，
栈：`labels.js:69 layout()` ← `scene.update` ← `main.js:129 loop` ← `main.js:145`。
根因：`build()` 里 `tracks.push({ obj, part, basePos, anchor })` 没有存 `el`，
但 `layout()` 读 `t.el.offsetWidth`。该错误在 main.js 首次同步 `loop()` 就抛出，
导致 `window.__app` 从未赋值（`__app.ready` 永远 false）。`tracks.push` 补一个 `el,` 即可。
音频侧自测是在 Playwright 里临时 patch 这一行完成的，未改动仓库文件。
