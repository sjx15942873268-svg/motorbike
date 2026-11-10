# 界面 Agent 交接说明

负责范围：SPEC 4.7 / 4.8 / 8.7 / 8.8 —— 控制台、速度表、订单卡、导览卡、零件卡、
键位、移动端触控、本地记录、海报导出。

## 一、改动文件

### 新增
| 文件 | 行数 | 说明 |
|---|---|---|
| `src/ui/speedo.js` | 164 | Canvas 速度表：`createSpeedo(canvas) → { draw(speedKmh, battery) }` |
| `src/ui/desk.js` | 146 | 控制台 + 触控条：`createDesk(handlers)`、`createTouch()` |
| `src/ui/tour.js` | 95 | 导览卡：`createTourCard(handlers)`，4s 自动播放 |
| `src/ui/partcard.js` | 37 | 零件信息卡：`createPartCard()` |
| `src/ui/keys.js` | 92 | 键盘输入：`createKeys(handlers)` |

### 修改
| 文件 | 说明 |
|---|---|
| `src/ui/index.js` | 由桩改为组装上述模块，导出 `createUI` / `update` / `drawSpeedo`；检测 `?solo` 时给 `body` 加 `.solo` 类 |
| `src/data/storage.js` | 由桩改为完整实现（见下） |
| `src/data/export.js` | 由桩改为完整实现（见下） |
| `styles/main.css` | `#order-card` 定位、送达动画、低电量标红、移动端布局、`body.solo` |
| `notes/requests.md` | 集成备注（已新增） |

全部文件均 < 400 行；未改动 `index.html` / `src/main.js` / `src/core/` / `src/scene/` / `src/sim/` / `src/model/`。

## 二、导出接口（与任务给定的冻结契约一致，未改签名）

```js
// src/ui/index.js
const ui = createUI({ setView, setExplode, setCutaway, setXray, tourGo,
                      onResetToday, onClear, onExport });
ui.update(dt);                       // 每帧：刷新状态行 / 订单卡 / 按钮 .on + 画速度表
ui.drawSpeedo(speedKmh, battery);    // 供外部单独驱动速度表

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

## 三、自测结果

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

### 截图
- `/tmp/ui_desktop.png` —— 1440×900 桌面全界面
- `/tmp/ui_mobile.png` —— 390×844 移动全界面
- `/tmp/ui_solo.png` —— `?solo=model`（只剩渲染画面）
- `/tmp/rider-01.png` —— 导出的海报成品（1080×1350）

## 四、已知问题

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

## 五、给主 Agent 的请求

见 `notes/requests.md`（当前结论：**无需改动 `index.html`**；场景侧已确认会回写
`state.lights` / `state.box.open`，控制台按钮 `.on` 可正常跟随）。
