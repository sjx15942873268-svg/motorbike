# 界面 Agent 交接说明

负责范围：SPEC 4.7 / 4.8 / 8.7 / 8.8 —— 控制台、速度表、订单卡、导览卡、零件卡、
键位、移动端触控、本地记录、海报导出。

## 一、改动文件

### 新增
| 文件 | 行数 | 说明 |
|---|---|---|
| `src/ui/speedo.js` | 164 | Canvas 速度表：`createSpeedo(canvas) → { draw(speedKmh, battery) }` |
| `src/ui/desk.js` | 149 | 控制台 + 触控条：`createDesk(handlers)`、`createTouch()` |
| `src/ui/drawer.js` | 57 | 移动端控制台抽屉：`createDrawer()`、`isMobile()`、`MOBILE_MQ` |
| `src/ui/tour.js` | 95 | 导览卡：`createTourCard(handlers)`，4s 自动播放 |
| `src/ui/partcard.js` | 37 | 零件信息卡：`createPartCard()` |
| `src/ui/keys.js` | 92 | 键盘输入：`createKeys(handlers)` |

### 修改
| 文件 | 说明 |
|---|---|
| `src/ui/index.js` | 由桩改为组装上述模块，导出 `createUI` / `update` / `drawSpeedo`；检测 `?solo` 时给 `body` 加 `.solo` 类；调用 `createDrawer()` |
| `src/data/storage.js` | 由桩改为完整实现（见下） |
| `src/data/export.js` | 由桩改为完整实现（见下） |
| `styles/main.css` | `#order-card` 定位、送达动画、低电量标红、移动端布局、`body.solo`；新增 `#desk-fab` / `#desk-scrim` 与 `body.desk-open` 抽屉样式 |
| `notes/requests.md` | 集成备注（已新增） |

全部文件均 < 400 行；未改动 `index.html` / `src/main.js` / `src/core/` / `src/scene/` / `src/sim/` / `src/model/`。

## 二、导出接口（与任务给定的冻结契约一致，未改签名）

```js
// src/ui/index.js
const ui = createUI({ setView, setExplode, setCutaway, setXray, tourGo,
                      onResetToday, onClear, onExport });
ui.update(dt);                       // 每帧：刷新状态行 / 订单卡 / 按钮 .on + 画速度表
ui.drawSpeedo(speedKmh, battery);    // 供外部单独驱动速度表

// src/ui/drawer.js（移动端专用，桌面端无副作用）
createDrawer();   // 内部创建 #desk-fab / #desk-scrim 并绑定开关
isMobile();       // () => boolean，matchMedia('(max-width: 720px)')
MOBILE_MQ;        // '(max-width: 720px)'

// src/data/storage.js
loadLog();      // { odometer, orders, rideSeconds, history, baseline }
saveLog(log);
recordSnapshot();  // 读 state 写盘；由 main.js 每 5s 与「送达」事件调用
resetToday();   // re-export from src/core/state.js
clearAll();     // re-export from src/core/state.js

// src/data/export.js
exportPoster(dataUrl, state);  // 纯函数；dataUrl 来自 scene.captureFrame()
```

### 对日志结构的一处扩展（唯一偏离 SPEC 字面之处）
SPEC 8.8 写的是 `{ odometer, orders, rideSeconds, history: [{ date, km, orders }] }`。
为了在**刷新页面后**仍能算准「当日 km」，顶层多了一个字段：

```json
"baseline": { "date": "2026-11-10", "odo": 0.012 }
```

`history[date].km = 当前总里程 - baseline.odo`（`km` 语义仍是「当日里程」）。
`baseline` 只在每天第一次快照时确定，之后持久化，因此跨会话精确。
旧版本日志（无 `baseline`）会自动回退到「用当天已有 km 反推」，向后兼容。
清空记录后里程归零时会自动重设基线（`odometer < baseline.odo` 判定）。

## 三、移动端控制台抽屉（V10 修复）

### 断点与状态
- 断点：`matchMedia('(max-width: 720px)')`，与 `styles/main.css` 的 `@media (max-width: 720px)` 一致。
- 桌面端（>720px）：`#desk-fab` / `#desk-scrim` 恒 `display:none`，`#desk` 布局与原来完全一致
  （`left:24 / bottom:24 / width:268`），折叠按钮行为不变。`createDrawer()` 不产生任何可见影响。
- 移动端（≤720px）：`#desk` 默认 `display:none`，由 `body.desk-open` 控制展开。

### 收起态
- 常驻一个浮动入口 `#desk-fab`（左下、触控条上方，黄点 + 「控制台」，85×39），不遮挡车辆主体。
- 速度表 `#speedo` 与订单卡 `#order-card` 仍位于右下，关键数字（速度 / 电量 / 订单进度）可见。
- 检视视角下画布可点，零件拾取恢复正常。

### 展开态
- 底部抽屉：`left:12 / right:12 / bottom:104`，位于触控条上方；`.desk-body` 内部滚动。
- 三种收起方式：点抽屉头的 `×`（`#desk-toggle`）、点遮罩 `#desk-scrim` 空白处、
  切换视角 / 开始导览（监听 `view:change` / `tour:step` 自动收起）。
- 遮罩 `z-index:22` 低于 `#touch` 的 25，展开态下油门 / 刹车仍可点。

### 实现要点
- `src/ui/drawer.js`：`createDrawer()` 动态创建 `#desk-fab` / `#desk-scrim`（不改 index.html），
  用 `body.desk-open` 单一状态类驱动 CSS；监听 `matchMedia` change 在断点两侧收敛状态。
- `src/ui/desk.js`：`#desk-toggle` 在移动端直接 return，把「关闭」交给 drawer；桌面端保持原折叠。
- `styles/main.css`：`#desk-fab` / `#desk-scrim` 桌面端规则放在媒体查询外（恒隐藏），
  媒体查询内只覆盖移动端显示；`body.solo` 兜底隐藏这两个节点。
- `?solo` 时 `createDrawer()` 直接返回空实现，不创建节点。

## 四、自测结果

环境：Playwright + Chromium headless（swiftshader），`http://localhost:8080`。
headless 下 rAF 只在产生帧时运行，测试用「小裁剪截图」强制成帧（`pump()`）。

### 1. 全量回归 `/tmp/ui-test.cjs` —— 73 项
覆盖：键位（W/A/S/D 持续键、Q/E/H/L/F/X 瞬时键、1~4 视角、输入控件聚焦时屏蔽）、
桌面按钮事件、视角切换、拆解滑块、剖视、面板收起、导览卡（逐步 / 自动 / 退出）、
零件卡、订单卡进度与送达动画、状态行（速度 / 里程 / 单数 / 低电量标红）、
本地记录与刷新持久化、重置今日 / 清空、海报导出、速度表绘制、移动端布局与触控、
隐私模式。

结果：**全部通过**（含 `history.km = 总里程 - 基线` 与 `baseline` 持久化两项）。

### 2. 存储语义专项 `/tmp/storage-test.cjs` —— 8/8 通过
首次快照 km=0 → +2.5 → 2.5 → 再 +1.25 → 3.75 → **刷新页面**后 +1.25 → 5（精确），
当天始终只有一条聚合记录，里程跨刷新保留。

### 3. 移动端布局 + solo（`/tmp/mobile-check.cjs` —— 11/11 通过）
`#desk` / `#hud` 底边 740 ≤ 触控条顶边 758；左右不出界；触控按钮可见；
pointerdown / pointerup / pointercancel 正确写 `state.input` 并切换 `.on`；
`.slider-row span` 强制 `nowrap`（「拆解」不再竖排）；
`.status` 窄面板下 10px + `flex-wrap`（四项不再被挤压换行）；
`?solo=model` → `body.solo`，`#desk / #hud / #brand / #labels` 均隐藏，`#gl` 保留，零报错。

### 4. 隐私模式（`localStorage.setItem` 抛 `QuotaExceededError`）
应用正常就绪可交互，控制台零报错（内存降级）。

### 5. 海报导出
触发下载，文件名 `rider-01.png`，实际尺寸 **1080×1350**（`sips` 校验）。

### 6. 控制台
桌面 / 移动 / 隐私三种上下文均**零 error**。

### 7. V10 移动端抽屉 + 检视点选（`/tmp/ui-drawer-test.mjs`）—— 33/33 通过
覆盖 390×844 / 1366×800 / 480×300 / `?solo=model` 四种上下文：
- 390 默认 `#desk` 收起、`#desk-fab` 可见、遮罩隐藏；`#speedo` / `#touch` / 订单卡可见且不出界。
- **检视视角点选外卖箱**：投影坐标 (136, 346)，`elementFromPoint` 命中 `#gl`，
  `part-card` 弹出「外卖箱 / 固定在后货架上…」——核心验收点通过。
- 展开 → 抽屉出现且不出界 → 点遮罩收起 → 再展开 → 点 `×` 收起，状态收敛正确。
- 展开态下 `elementFromPoint(油门中心)` 命中 `#tc-throttle`（触控条未被面板压住）。
- 1366 桌面：`#desk` 仍在 `left:24 / width:268`，`#desk-fab` / `#desk-scrim` 隐藏，
  `#touch` 隐藏，折叠 / 展开行为不变。
- 480×300：`#desk` 收起，`#speedo` / `#touch` 不出界，检视点选同样通过。
- `?solo=model`：无 `#desk-fab` / `#desk-scrim`，`#desk` 隐藏。
- 四个上下文控制台均**零 error**。

### 截图
- `/tmp/ui_desktop.png` —— 1440×900 桌面全界面
- `/tmp/ui_mobile.png` —— 390×844 移动全界面
- `/tmp/ui_solo.png` —— `?solo=model`（只剩渲染画面）
- `/tmp/rider-01.png` —— 导出的海报成品（1080×1350）
- `/tmp/ui_mobile_collapsed.png` —— 390 收起态（车辆完整可见，左下浮动入口）
- `/tmp/ui_mobile_open.png` —— 390 展开态（底部抽屉，触控条仍可点）
- `/tmp/ui_mobile_pick.png` —— 390 检视点选外卖箱弹出零件卡
- `/tmp/ui_desktop_1366.png` —— 1366 桌面端回归（布局未变）

## 五、已知问题

1. **速度表指针有惯性**：`shown` 以一阶滞后逼近目标值（`dt * 7`），用于模拟机械表。
   若 SPEC 期望指针即时跟随，把 `src/ui/speedo.js` 里 `Math.min(1, dt * 7)` 改为 `1` 即可。
2. **每日 0 点跨天**：基线按 `YYYY-MM-DD` 切换，跨天后第一条记录以当时里程为起点，
   当天 km 从 0 起算（总里程 `odometer` 不受影响）。符合 SPEC「按日期聚合」。
3. **海报用 `cover` 裁切**：截图比例与 984×760 画框不一致时会裁掉两侧或上下。
   若要完整显示可改 `export.js` 里的 `ir > tr` 分支为 `contain`。
4. **速度表 bitmap 与 CSS 尺寸解耦**：`createSpeedo` 把画布固定画成 196×dpr（dpr 上限 2），
   再由 CSS 缩放到 176（桌面）/ 96（移动）。改 CSS 尺寸即可，无需动 JS；
   若以后要适配高 dpr（>2）或跟随 CSS 尺寸重绘，需要改 `speedo.js` 顶部的常量。
5. **`body.solo`（SPEC 9）**：`src/ui/index.js` 在 `?solo` 时加类，CSS 隐藏
   `#brand / #desk / #hud / #tour-card / #part-card / #hint / #touch / #sound-viz / #labels / #audio-hint`，
   只留 `#gl` 与 `#app`。main.js 原有的 `.hidden` 列表不含 `#labels`，
   若主 Agent 希望由 main.js 统一处理，把 `#labels` 加进 `SOLO_HIDDEN` 即可（界面侧规则重复隐藏无害）。
6. **`#sound-viz` 归音频 Agent**，界面只负责移动端避让（`bottom: 210px`）。
7. **移动端收起态不显示「今日单数」**：单数只在抽屉内的状态行里；收起态可见的是速度表
   （速度 / 电量）与订单卡（当前单进度）。若产品要求收起态也显示单数，需要在
   `#desk-fab` 上加徽标并接入 `state.ride.orders`，当前未做。
8. **展开态遮罩会盖住速度表 / 订单卡**：两者都不可交互，仅视觉变暗；展开态本来就是
   「临时看面板」的场景，收起即恢复。若希望展开态仍能看到速度，需要把 `#hud` 提到遮罩之上。
9. **断点硬编码两处**：`src/ui/drawer.js` 的 `MOBILE_MQ` 与 `styles/main.css` 的
   `@media (max-width: 720px)`。改断点要同时改两处。

## 六、给主 Agent 的请求

见 `notes/requests.md`（当前结论：**无需改动 `index.html`**；场景侧已确认会回写
`state.lights` / `state.box.open`，控制台按钮 `.on` 可正常跟随）。
