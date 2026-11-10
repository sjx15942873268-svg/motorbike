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

## SPEC 缺陷
未发现 `docs/SPEC.md` 有阻塞性缺陷；8.2–8.5 / 9 的接口与参数均已按原文实现。
